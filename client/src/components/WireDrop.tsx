import React, { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../hooks/useScrollMotion'

/**
 * The hero object: a water drop, rendered as a real rotating wireframe.
 *
 * This is a 3D renderer, not a picture of one. Vertices live in object space,
 * a rotation matrix and a perspective divide run every frame, and the camera
 * is driven by how far the page has been scrolled — so the object genuinely
 * turns and tilts under the reader's scroll rather than sliding around as a
 * flat image.
 *
 * Canvas rather than SVG. Animating this in SVG means writing ~2,600 new path
 * coordinates into the DOM every frame and letting the browser re-parse them;
 * on canvas the same work is a few hundred lineTo calls against a bitmap.
 *
 * A surface of revolution is rotationally symmetric, so spinning it about its
 * own axis produces a pixel-identical silhouette. What makes the spin visible
 * is depth cueing: lines nearer the camera are drawn brighter and thicker, so
 * the bright band travels around the mesh as it turns. Without it the object
 * would look completely static no matter how fast it rotated.
 */

const MERIDIANS = 26
const PARALLELS = 18
const SEGMENTS = 56

/*
 * The drop is a surface of revolution parameterised by the polar angle a,
 * running 0 at the tip to PI at the base:
 *
 *     r(a) = sin(a) * sin(a/2)^2        height(a) = -cos(a)
 *
 * Near the base sin(a/2) is 1, so r falls off exactly as a sphere's does and
 * the bottom is round. Near the tip the extra factor drives r down as a^1.8
 * rather than a, which draws the profile out to a point.
 *
 * The exponent also sets the proportions, which is what actually decides
 * whether the silhouette reads. A plain sin(PI*t) profile is zero at BOTH ends
 * and renders two cones meeting at the equator — a spinning top. At 0.8 the
 * mesh is only 1.25x as tall as it is wide and reads as a squashed sphere. At
 * 2 the widest point sits at two thirds of the height and the ratio is 1.54.
 */
const POINTINESS = 2

const radiusAt = (a: number) => Math.sin(a) * Math.sin(a / 2) ** POINTINESS
const heightAt = (a: number) => -Math.cos(a)

type Point = [number, number, number]

/** Object-space polylines, built once at module load. */
function buildMesh(): Point[][] {
    const lines: Point[][] = []

    for (let m = 0; m < MERIDIANS; m++) {
        const u = (m / MERIDIANS) * Math.PI * 2
        const line: Point[] = []
        for (let i = 0; i <= SEGMENTS; i++) {
            const a = (i / SEGMENTS) * Math.PI
            const r = radiusAt(a)
            line.push([r * Math.cos(u), heightAt(a), r * Math.sin(u)])
        }
        lines.push(line)
    }

    // Rings stop short of both poles, where one would collapse to a dot.
    for (let p = 0; p < PARALLELS; p++) {
        const a = (0.05 + (p / (PARALLELS - 1)) * 0.9) * Math.PI
        const r = radiusAt(a)
        const y = heightAt(a)
        const line: Point[] = []
        for (let i = 0; i <= SEGMENTS; i++) {
            const u = (i / SEGMENTS) * Math.PI * 2
            line.push([r * Math.cos(u), y, r * Math.sin(u)])
        }
        lines.push(line)
    }

    return lines
}

const MESH = buildMesh()

// The mesh's extent in object space, used to fit it to the canvas.
const HALF_W = Math.max(...MESH.flat().map(([x]) => Math.abs(x)))
const HALF_H = 1
const BASE_DISTANCE = 3.4

// Segments are sorted into this many depth buckets and each bucket is stroked
// once. Per-segment strokes would be ~2,600 draw calls a frame; this is 7.
const DEPTH_BUCKETS = 7

export interface Camera {
    spin: number
    tilt: number
    distance: number
    fade: number
}

/**
 * Camera state for a given scroll position and clock.
 *
 * `s` is how far the hero has scrolled past the top of the viewport, 0 to 1.
 * Scrolling turns the camera around the drop, tilts it over the top, and
 * pushes it away, so the object recedes as the page moves on.
 */
export function cameraAt(s: number, t: number): Camera {
    return {
        spin: t * 0.22 + s * 3.2,
        tilt: 0.3 + s * 0.75,
        distance: BASE_DISTANCE + s * 1.4,
        fade: 1 - s * 0.75,
    }
}

/**
 * Object space to screen space: rotate about Y (the spin), then about X (the
 * tilt), then divide by depth. Returns the screen point and a 0..1 depth used
 * for cueing, where 1 is nearest the camera.
 */
export function projectPoint(
    [ox, oy, oz]: Point,
    cam: Camera,
    zoom: number,
    cx: number,
    cy: number,
): [number, number, number] {
    const cosSpin = Math.cos(cam.spin), sinSpin = Math.sin(cam.spin)
    const cosTilt = Math.cos(cam.tilt), sinTilt = Math.sin(cam.tilt)

    const rx = ox * cosSpin + oz * sinSpin
    const rz = oz * cosSpin - ox * sinSpin
    const ry = oy * cosTilt - rz * sinTilt
    const dz = rz * cosTilt + oy * sinTilt

    const scale = zoom / (cam.distance - dz)
    return [cx + rx * scale, cy + ry * scale, (dz + 1) / 2]
}

/**
 * Zoom that fits the mesh to the canvas.
 *
 * Derived from BASE_DISTANCE rather than the live distance — scaling by the
 * live value would cancel the perspective divide exactly, and scrolling would
 * move the camera back without the object ever appearing to recede.
 */
export function zoomFor(width: number, height: number): number {
    return Math.min(width / 2 / HALF_W, height / 2 / HALF_H) * 0.92 * BASE_DISTANCE
}


/**
 * The outline of the projected body, as a convex hull.
 *
 * A surface of revolution with a convex profile — which a teardrop is — has a
 * convex silhouette from every angle, so the hull of the projected vertices is
 * exactly its edge. That is what lets the shape be filled like a solid instead
 * of drawn as a cage of wires: a wireframe reads as a diagram, and this is
 * meant to read as water.
 */
function hullOf(points: [number, number][]): [number, number][] {
    if (points.length < 3) return points
    const pts = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
    const cross = (o: number[], a: number[], b: number[]) =>
        (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    const half = (src: [number, number][]) => {
        const out: [number, number][] = []
        for (const pt of src) {
            while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], pt) <= 0) out.pop()
            out.push(pt)
        }
        out.pop()
        return out
    }
    return [...half(pts), ...half([...pts].reverse())]
}

export default function WireDrop({ className = '' }: { className?: string }) {
    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const wrap = wrapRef.current
        if (!canvas || !wrap) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const still = prefersReducedMotion()
        let width = 0
        let height = 0
        let raf = 0

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2)
            const rect = wrap.getBoundingClientRect()
            width = rect.width
            height = rect.height
            canvas.width = Math.round(width * dpr)
            canvas.height = Math.round(height * dpr)
            canvas.style.width = `${width}px`
            canvas.style.height = `${height}px`
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        }

        /** How far the hero has scrolled past the top of the viewport, 0 to 1. */
        const scrollProgress = () => {
            const rect = wrap.getBoundingClientRect()
            const span = rect.height + window.innerHeight
            return Math.min(1, Math.max(0, (-rect.top / span) * 2))
        }

        const draw = (time: number) => {
            const t = still ? 0 : time / 1000
            const s = still ? 0 : scrollProgress()

            const cam = cameraAt(s, t)
            const zoom = zoomFor(width, height)
            const cx = width / 2
            const cy = height / 2

            ctx.clearRect(0, 0, width, height)

            const buckets: Path2D[] = Array.from({ length: DEPTH_BUCKETS }, () => new Path2D())
            const silhouette: [number, number][] = []

            for (const line of MESH) {
                let prevX = 0, prevY = 0, prevDepth = 0, has = false

                for (const point of line) {
                    const [x, y, depth] = projectPoint(point, cam, zoom, cx, cy)
                    silhouette.push([x, y])

                    if (has) {
                        const mid = (depth + prevDepth) / 2
                        const b = Math.min(DEPTH_BUCKETS - 1, Math.floor(mid * DEPTH_BUCKETS))
                        buckets[b].moveTo(prevX, prevY)
                        buckets[b].lineTo(x, y)
                    }

                    prevX = x; prevY = y; prevDepth = depth; has = true
                }
            }

            /*
             * The body first, then the structure over it.
             *
             * Filling the silhouette and lighting it is what turns a cage of
             * lines into something that looks like a drop of water: a vertical
             * gradient for the depth of the liquid, a soft highlight where the
             * light lands, and a rim to give the edge a surface. The wires stay
             * on top at low opacity, which is what still reads as refraction
             * through the far wall rather than as a diagram.
             */
            const hull = hullOf(silhouette)
            if (hull.length > 2 && cam.fade > 0.01) {
                let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity
                for (const [x, y] of hull) {
                    if (y < top) top = y
                    if (y > bottom) bottom = y
                    if (x < left) left = x
                    if (x > right) right = x
                }

                const body = new Path2D()
                body.moveTo(hull[0][0], hull[0][1])
                for (let i = 1; i < hull.length; i++) body.lineTo(hull[i][0], hull[i][1])
                body.closePath()

                const a = cam.fade

                // Water: pale at the surface, deeper toward the base.
                const fill = ctx.createLinearGradient(0, top, 0, bottom)
                fill.addColorStop(0, `rgba(214,238,255,${(0.92 * a).toFixed(3)})`)
                fill.addColorStop(0.45, `rgba(126,201,247,${(0.88 * a).toFixed(3)})`)
                fill.addColorStop(1, `rgba(27,124,245,${(0.9 * a).toFixed(3)})`)
                ctx.fillStyle = fill
                ctx.fill(body)

                ctx.save()
                ctx.clip(body)

                // The specular: one soft spot upper-left, where the light is.
                const w = right - left, h = bottom - top
                const gx = left + w * 0.34, gy = top + h * 0.3
                const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.42)
                glow.addColorStop(0, `rgba(255,255,255,${(0.85 * a).toFixed(3)})`)
                glow.addColorStop(1, 'rgba(255,255,255,0)')
                ctx.fillStyle = glow
                ctx.fillRect(left, top, w, h)

                // Structure, seen through the body.
                for (let b = 0; b < DEPTH_BUCKETS; b++) {
                    const depth = (b + 0.5) / DEPTH_BUCKETS
                    const alpha = (0.03 + depth * 0.16) * a
                    if (alpha <= 0.01) continue
                    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`
                    ctx.lineWidth = 0.5 + depth * 0.6
                    ctx.stroke(buckets[b])
                }

                ctx.restore()

                // The rim, brighter where the surface turns away from the eye.
                ctx.strokeStyle = `rgba(10,98,214,${(0.5 * a).toFixed(3)})`
                ctx.lineWidth = 1.4
                ctx.stroke(body)
            }

            raf = requestAnimationFrame(draw)
        }

        resize()
        window.addEventListener('resize', resize)
        raf = requestAnimationFrame(draw)

        return () => {
            cancelAnimationFrame(raf)
            window.removeEventListener('resize', resize)
        }
    }, [])

    return (
        <div ref={wrapRef} className={`relative select-none ${className}`} aria-hidden="true">
            {/* The pool of light the mesh sits in, so it reads as lit. */}
            <div className="pointer-events-none absolute inset-[18%] rounded-full bg-primary-600/10 blur-[80px]" />
            <canvas ref={canvasRef} className="relative h-full w-full" />
        </div>
    )
}
