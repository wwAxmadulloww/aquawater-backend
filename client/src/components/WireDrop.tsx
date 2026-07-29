import React from 'react'

/**
 * The hero object: a water drop drawn as a wireframe.
 *
 * The reference's hero is a thin-stroke 3D mesh — no fill, no shading, the
 * form read purely from the density of its own lines. That is a different
 * proposition from the solid bottle this page used to carry: a drawn solid has
 * to compete with the material it imitates and loses, whereas a wireframe is
 * already an abstraction and is judged as a drawing.
 *
 * The mesh is generated rather than hand-authored so the lines stay evenly
 * spaced at any size. A drop is a surface of revolution, so every point is
 * profile(v) spun around the vertical axis by u and projected with a fixed
 * camera — which is what makes the latitude rings read as ellipses that flatten
 * towards the equator, the cue that sells it as a volume rather than a doodle.
 */

const MERIDIANS = 24
const PARALLELS = 16
const SEGMENTS = 64

// Tilt of the camera. A small angle keeps the silhouette a drop; a large one
// would show it from above and lose the pointed top entirely.
const TILT = 0.34

/*
 * The drop is a surface of revolution parameterised by the polar angle a,
 * running 0 at the tip to PI at the base:
 *
 *     r(a) = sin(a) * sin(a/2)^2        height(a) = -cos(a)
 *
 * Near the base sin(a/2) is 1, so r falls off exactly as a sphere's does and
 * the bottom is round. Near the tip the extra factor drives r down as a^1.8
 * instead of a, which is what draws the profile out to a point.
 *
 * A plain sin(PI*t) profile — the obvious first guess — is zero at BOTH ends,
 * so it renders two cones meeting at the equator: a spinning top, not a drop.
 *
 * The exponent also sets the proportions, which is what actually decides
 * whether the silhouette reads: at 0.8 the mesh is 1.25x as tall as it is wide
 * and looks like a squashed sphere with the taper lost. At 2 the widest point
 * sits at two thirds of the height and the ratio is 1.54 — a drop.
 */
const POINTINESS = 2

function radiusAt(a: number): number {
    return Math.sin(a) * Math.sin(a / 2) ** POINTINESS
}

const heightAt = (a: number) => -Math.cos(a)

function project(u: number, t: number): [number, number] {
    const a = t * Math.PI
    const r = radiusAt(a)
    const x = r * Math.cos(u)
    const z = r * Math.sin(u)
    const y = heightAt(a)
    // Fixed camera: y is compressed by the tilt, z leaks into y as depth.
    return [x, y * Math.cos(TILT) + z * Math.sin(TILT)]
}

const fmt = (n: number) => n.toFixed(4)

function meridianPath(u: number): string {
    let d = ''
    for (let i = 0; i <= SEGMENTS; i++) {
        const [x, y] = project(u, i / SEGMENTS)
        d += `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`
    }
    return d
}

function parallelPath(t: number): string {
    let d = ''
    for (let i = 0; i <= SEGMENTS; i++) {
        const [x, y] = project((i / SEGMENTS) * Math.PI * 2, t)
        d += `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`
    }
    return d + 'Z'
}

const MERIDIAN_PATHS = Array.from({ length: MERIDIANS }, (_, i) =>
    meridianPath((i / MERIDIANS) * Math.PI * 2))

// Parallels stop short of both poles, where a ring would collapse to a dot.
const PARALLEL_PATHS = Array.from({ length: PARALLELS }, (_, i) =>
    parallelPath(0.06 + (i / (PARALLELS - 1)) * 0.88))

export default function WireDrop({ className = '' }: { className?: string }) {
    return (
        <div className={`relative select-none ${className}`} aria-hidden="true">
            {/* The glow the mesh sits in, so it reads as lit rather than pasted on. */}
            <div className="pointer-events-none absolute inset-[12%] rounded-full bg-primary-600/12 blur-[70px]" />

            <svg
                viewBox="-0.74 -1.1 1.48 2.2"
                className="animate-turn relative h-full w-full text-gray-950
                           drop-shadow-[0_0_28px_rgba(58,210,232,.28)]"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <defs>
                    {/* Lines fade towards the bottom, so the object sits in the
                        dark instead of being cut off by the edge of the canvas. */}
                    <linearGradient id="wire-fade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity=".95" />
                        <stop offset="55%" stopColor="currentColor" stopOpacity=".72" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity=".3" />
                    </linearGradient>
                </defs>

                <g stroke="url(#wire-fade)" strokeWidth=".75">
                    {MERIDIAN_PATHS.map((d, i) => (
                        <path key={'m' + i} className="wire" d={d} />
                    ))}
                    {PARALLEL_PATHS.map((d, i) => (
                        <path key={'p' + i} className="wire" d={d} />
                    ))}
                </g>
            </svg>

            {/* A slow scan line, the one moving element — the reference's object
                is a video, and this is the cheapest honest nod to that. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="animate-scan h-[14%] w-full bg-gradient-to-b from-transparent via-primary-600/18 to-transparent" />
            </div>
        </div>
    )
}
