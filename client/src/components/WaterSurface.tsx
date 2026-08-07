import React, { useEffect, useRef } from 'react'

/*
 * The hero's water.
 *
 * The reference design is a photograph of a water surface, so the surface here
 * is that photograph — sharp, never redrawn. What moves is the light on it.
 *
 * A height field is integrated on a coarse grid and its slope is painted as
 * highlight and shade over the image. Displacing the photograph itself would
 * mean resampling every pixel in JavaScript on every frame; shading it costs
 * one small ImageData and reads the same, because the light *is* what you see
 * on real water — the geometry only reaches the eye through it.
 *
 * The canvas' backing store is the grid itself, a few hundred cells across,
 * and CSS stretches it over the hero. The browser's bilinear filter does the
 * smoothing on the GPU for nothing, which is what keeps this at 60fps on a
 * phone: the per-frame cost is two passes over ~40k floats, not over a million
 * pixels.
 */

/** How much of a wave survives each step. Below ~0.97 ripples die before they spread. */
const DAMPING = 0.976

/** Grid cells. The wave equation is O(cells), so this is the whole performance budget. */
const CELLS_WIDE = 46000
const CELLS_NARROW = 18000

/** Slope → alpha. Tuned so a cursor sweep glints without looking like foil. */
const LIGHT = 300
const MAX_HIGHLIGHT = 205
const MAX_SHADE = 160

type Sim = {
    gw: number
    gh: number
    /** Current height field, and the previous one. Swapped each step. */
    a: Float32Array
    b: Float32Array
    img: ImageData
}

type Props = {
    src: string
    /** Painted under the photo so the fold never flashes white while it loads. */
    base?: string
    className?: string
}

export default function WaterSurface({ src, base = '#0d3f57', className = '' }: Props) {
    const wrap = useRef<HTMLDivElement>(null)
    const cvs = useRef<HTMLCanvasElement>(null)
    const photo = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const host = wrap.current
        const canvas = cvs.current
        if (!host || !canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

        let sim: Sim | null = null
        let raf = 0
        let onScreen = true

        /* Parallax: pointer position in -1..1, and the eased value chasing it. */
        let tx = 0
        let ty = 0
        let ex = 0
        let ey = 0

        /* Last pointer position in grid cells, so movement leaves a wake. */
        let lx = -1
        let ly = -1

        function build(): Sim | null {
            const r = host!.getBoundingClientRect()
            if (r.width < 2 || r.height < 2) return null

            /*
             * The grid's aspect matches the container's, so a ripple stays a
             * circle instead of stretching into an ellipse when CSS scales it.
             */
            const budget = r.width < 720 ? CELLS_NARROW : CELLS_WIDE
            const gw = Math.max(24, Math.round(Math.sqrt(budget * (r.width / r.height))))
            const gh = Math.max(24, Math.round(budget / gw))

            canvas!.width = gw
            canvas!.height = gh
            sim = {
                gw,
                gh,
                a: new Float32Array(gw * gh),
                b: new Float32Array(gw * gh),
                img: ctx!.createImageData(gw, gh),
            }
            lx = -1
            ly = -1
            return sim
        }

        /** Push the surface down over a soft-edged disc centred on a cell. */
        function drop(gx: number, gy: number, power: number, radius: number) {
            if (!sim) return
            const { gw, gh, a } = sim
            const r = Math.max(1, radius | 0)
            for (let y = -r; y <= r; y++) {
                const yy = (gy + y) | 0
                if (yy < 1 || yy >= gh - 1) continue
                for (let x = -r; x <= r; x++) {
                    const xx = (gx + x) | 0
                    if (xx < 1 || xx >= gw - 1) continue
                    const d = Math.sqrt(x * x + y * y)
                    if (d > r) continue
                    /*
                     * A raised-cosine dimple. A flat disc leaves square corners
                     * that stay visible in the wavefront long after it spreads.
                     */
                    a[yy * gw + xx] += power * (Math.cos((d / r) * Math.PI) + 1) * 0.5
                }
            }
        }

        function frame() {
            raf = requestAnimationFrame(frame)
            if (!sim || !onScreen) return

            const { gw, gh } = sim
            const cur = sim.a
            const nxt = sim.b

            /* One step of the wave equation, in place over the older buffer. */
            for (let y = 1; y < gh - 1; y++) {
                const row = y * gw
                for (let x = 1; x < gw - 1; x++) {
                    const i = row + x
                    nxt[i] =
                        ((cur[i - 1] + cur[i + 1] + cur[i - gw] + cur[i + gw]) * 0.5 - nxt[i]) *
                        DAMPING
                }
            }
            sim.a = nxt
            sim.b = cur

            /*
             * Shade by slope. A surface tilting towards the light goes white,
             * away from it goes deep blue — which is exactly what a ripple does
             * to a sky reflection.
             */
            const h = sim.a
            const px = sim.img.data
            for (let y = 1; y < gh - 1; y++) {
                const row = y * gw
                for (let x = 1; x < gw - 1; x++) {
                    const i = row + x
                    const slope = (h[i - 1] - h[i + 1]) * 0.6 + (h[i - gw] - h[i + gw]) * 0.4
                    const o = i << 2
                    if (slope > 0) {
                        const v = slope * LIGHT
                        px[o] = 255
                        px[o + 1] = 255
                        px[o + 2] = 255
                        px[o + 3] = v > MAX_HIGHLIGHT ? MAX_HIGHLIGHT : v
                    } else {
                        const v = -slope * LIGHT
                        px[o] = 8
                        px[o + 1] = 48
                        px[o + 2] = 96
                        px[o + 3] = v > MAX_SHADE ? MAX_SHADE : v
                    }
                }
            }
            ctx!.putImageData(sim.img, 0, 0)

            /* The photo drifts against the cursor — the depth cue behind the ripple. */
            ex += (tx - ex) * 0.06
            ey += (ty - ey) * 0.06
            if (photo.current) {
                photo.current.style.transform =
                    `scale(1.08) translate3d(${(-ex * 1.5).toFixed(3)}%, ${(-ey * 1.1).toFixed(3)}%, 0)`
            }
        }

        function disturb(clientX: number, clientY: number, power: number) {
            if (!sim) return
            const r = host!.getBoundingClientRect()
            const fx = (clientX - r.left) / r.width
            const fy = (clientY - r.top) / r.height

            /* Parallax follows the cursor anywhere on the page; ripples only on the water. */
            tx = Math.max(-1, Math.min(1, (fx - 0.5) * 2))
            ty = Math.max(-1, Math.min(1, (fy - 0.5) * 2))
            if (fx < 0 || fx > 1 || fy < 0 || fy > 1) {
                lx = -1
                return
            }

            const gx = fx * sim.gw
            const gy = fy * sim.gh
            if (lx >= 0) {
                /*
                 * Disturb along the path travelled since the last event. A fast
                 * sweep fires few pointermove events, and without this it leaves
                 * a row of separate dots instead of a wake.
                 */
                const steps = Math.min(14, Math.ceil(Math.hypot(gx - lx, gy - ly) / 2))
                for (let k = 1; k <= steps; k++) {
                    drop(lx + ((gx - lx) * k) / steps, ly + ((gy - ly) * k) / steps, power * 0.55, 3)
                }
            }
            drop(gx, gy, power, 4)
            lx = gx
            ly = gy
        }

        const onMove = (e: PointerEvent) => disturb(e.clientX, e.clientY, 0.9)
        const onDown = (e: PointerEvent) => disturb(e.clientX, e.clientY, 2.6)
        const onLeave = () => {
            lx = -1
            tx = 0
            ty = 0
        }

        /* Rain, so the surface is alive before anyone touches it. */
        const ambient = window.setInterval(() => {
            if (!sim || !onScreen || raf === 0) return
            drop(
                4 + Math.random() * (sim.gw - 8),
                4 + Math.random() * (sim.gh - 8),
                0.35 + Math.random() * 0.45,
                3,
            )
        }, 1400)

        function start() {
            if (raf) return
            raf = requestAnimationFrame(frame)
        }

        function stop() {
            if (!raf) return
            cancelAnimationFrame(raf)
            raf = 0
            ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
        }

        /* Someone who asked the OS for less motion gets the photograph, still. */
        function syncMotion() {
            if (reduced.matches) {
                stop()
                canvas!.style.opacity = '0'
                if (photo.current) photo.current.style.transform = 'scale(1.02)'
            } else {
                canvas!.style.opacity = ''
                start()
            }
        }

        const first = build()
        syncMotion()
        /* A first splash so the hero is already rippling when it is read. */
        if (first) drop(first.gw * 0.62, first.gh * 0.42, 2.4, 6)

        const ro = new ResizeObserver(() => { build() })
        ro.observe(host)

        /* Off-screen the loop keeps ticking but does no work — see `frame`. */
        const io = new IntersectionObserver(es => { onScreen = es[0].isIntersecting }, { threshold: 0 })
        io.observe(host)

        window.addEventListener('pointermove', onMove, { passive: true })
        window.addEventListener('pointerdown', onDown, { passive: true })
        document.addEventListener('pointerleave', onLeave)
        reduced.addEventListener('change', syncMotion)

        return () => {
            stop()
            window.clearInterval(ambient)
            ro.disconnect()
            io.disconnect()
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerdown', onDown)
            document.removeEventListener('pointerleave', onLeave)
            reduced.removeEventListener('change', syncMotion)
        }
    }, [])

    return (
        <div ref={wrap} className={`overflow-hidden ${className}`} style={{ backgroundColor: base }}>
            <div ref={photo} className="absolute inset-0 will-change-transform" style={{ transform: 'scale(1.08)' }}>
                <img
                    src={src}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="h-full w-full select-none object-cover"
                />
            </div>
            {/*
             * Scaled a hair past the edge: the wave equation cannot write the
             * outermost cell (it has no neighbour on one side), and without the
             * overdraw that untouched row shows as a hairline at the border.
             */}
            <canvas
                ref={cvs}
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
                style={{ transform: 'scale(1.03)' }}
            />
        </div>
    )
}
