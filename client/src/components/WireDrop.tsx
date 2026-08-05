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

            for (const line of MESH) {
                let prevX = 0, prevY = 0, prevDepth = 0, has = false

                for (const point of line) {
                    const [x, y, depth] = projectPoint(point, cam, zoom, cx, cy)

                    if (has) {
                        const mid = (depth + prevDepth) / 2
                        const b = Math.min(DEPTH_BUCKETS - 1, Math.floor(mid * DEPTH_BUCKETS))
                        buckets[b].moveTo(prevX, prevY)
                        buckets[b].lineTo(x, y)
                    }

                    prevX = x; prevY = y; prevDepth = depth; has = true
                }
            }

            // Far buckets first, so nearer lines lay over them.
            for (let b = 0; b < DEPTH_BUCKETS; b++) {
                const depth = (b + 0.5) / DEPTH_BUCKETS
                // Fades as the hero leaves, so the object dissolves into the
                // canvas instead of being clipped by the section edge.
                /*
                 * Drawn in the brand blue, not white.
                 *
                 * The whole object was white lines on a black canvas; against
                 * the daylight theme it vanished completely — the hero rendered
                 * an empty rectangle where the bottle had been. Blue also needs
                 * more of itself to read on white than white did on black, so
                 * the near end of the depth ramp is stronger while the far end
                 * stays faint enough to still say "further away".
                 */
                const alpha = (0.10 + depth * 0.85) * cam.fade
                if (alpha <= 0.01) continue
                ctx.strokeStyle = `rgba(27,124,245,${alpha.toFixed(3)})`
                ctx.lineWidth = 0.4 + depth * 0.9
                ctx.stroke(buckets[b])
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
