import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-driven motion, measured once per frame.
 *
 * Everything on the page that reacts to scrolling reads from one rAF loop and
 * one scroll listener. A listener per animated element is what makes
 * scroll-linked pages stutter: each one runs its own getBoundingClientRect
 * during the scroll event, forcing a layout, and the cost multiplies by the
 * number of animated elements on screen.
 */

type Subscriber = () => void

const subscribers = new Set<Subscriber>()
let frame = 0

function schedule() {
    if (frame) return
    frame = requestAnimationFrame(() => {
        frame = 0
        subscribers.forEach(fn => fn())
    })
}

function subscribe(fn: Subscriber): () => void {
    if (subscribers.size === 0) {
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', schedule, { passive: true })
    }
    subscribers.add(fn)
    schedule()

    return () => {
        subscribers.delete(fn)
        if (subscribers.size === 0) {
            window.removeEventListener('scroll', schedule)
            window.removeEventListener('resize', schedule)
            if (frame) { cancelAnimationFrame(frame); frame = 0 }
        }
    }
}

export const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * How far an element has travelled through the viewport, 0 to 1.
 *
 * 0 is "the element's top edge has just reached the bottom of the viewport",
 * 1 is "its bottom edge has just left the top". Motion driven by this is
 * framed by what the reader can actually see, rather than by absolute page
 * offset, so it behaves the same on a phone and on a desktop.
 */
export function useViewportProgress<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // Anyone who asks for less motion gets the settled state outright, not
        // a midpoint: at 0.5 the element would sit permanently short of upright
        // and under full opacity, which reads as a rendering fault rather than
        // as a preference being respected.
        if (prefersReducedMotion()) {
            setProgress(1)
            return
        }

        let last = -1
        return subscribe(() => {
            const el = ref.current
            if (!el) return

            const r = el.getBoundingClientRect()
            const span = window.innerHeight + r.height
            const raw = span > 0 ? (window.innerHeight - r.top) / span : 0
            const next = Math.min(1, Math.max(0, raw))

            // Sub-pixel changes are invisible and still cost a React render.
            if (Math.abs(next - last) < 0.002) return
            last = next
            setProgress(next)
        })
    }, [])

    return { ref, progress }
}

/**
 * Raw scroll offset for callers that drive imperative animation (canvas),
 * where a React state update per frame would be pure overhead.
 */
export function useScrollSubscription(fn: Subscriber) {
    const saved = useRef(fn)
    saved.current = fn

    useEffect(() => subscribe(() => saved.current()), [])
}
