import React from 'react'
import { useViewportProgress } from '../hooks/useScrollMotion'

/**
 * Scroll-driven depth for the sections below the hero.
 *
 * The element starts laid back in space, rotated away from the reader and
 * pushed behind the screen plane, and stands up as it crosses the viewport.
 * The rotation is real perspective, not a fake skew — the far edge of a card
 * is genuinely further away and foreshortens.
 *
 * Motion is tied to scroll position rather than played on entry, so scrolling
 * back up runs it backwards. A one-shot entrance animation looks broken the
 * moment someone scrolls up, which on a shop is most of the session.
 *
 * The perspective origin sits on the wrapper rather than each child, so a row
 * of cards shares one vanishing point and tilts as a group. Per-card
 * perspective gives every card its own vanishing point and the row splays.
 */

interface Props {
    children: React.ReactNode
    className?: string
    /** Degrees of X rotation at the start of the travel. */
    lean?: number
    /** How far back in space it starts, in pixels. */
    depth?: number
}

/**
 * Transform for a given traverse position, split out so the motion can be
 * checked without a browser — the scroll loop is driven by
 * requestAnimationFrame, which does not run in a backgrounded page.
 *
 * Only the approach matters. Progress runs 0 to 1 across the whole traverse,
 * but the element should be fully upright by the time it is comfortably on
 * screen and stay there; continuing to rotate as it leaves would tip it away
 * again just as it is being read.
 */
export function revealTransform(progress: number, lean: number, depth: number) {
    /*
     * Smoothstep across most of the approach rather than a cubic ease-out over
     * the first half. The cubic reached 90% of its travel by the time the
     * element was 30% through the viewport — technically animating, but over
     * so early that the motion was not perceptible. Smoothstep spreads it
     * across the entry, easing at both ends so nothing starts or stops
     * abruptly.
     */
    const settle = Math.min(1, Math.max(0, progress) / 0.68)
    const eased = settle * settle * (3 - 2 * settle)

    return {
        transform: `translate3d(0, ${((1 - eased) * 26).toFixed(2)}px, ${((eased - 1) * depth).toFixed(2)}px) rotateX(${((1 - eased) * lean).toFixed(2)}deg)`,
        opacity: 0.25 + eased * 0.75,
        settled: eased,
    }
}

export default function Reveal3D({ children, className = '', lean = 14, depth = 140 }: Props) {
    const { ref, progress } = useViewportProgress<HTMLDivElement>()
    const { transform, opacity } = revealTransform(progress, lean, depth)

    return (
        <div
            ref={ref}
            className={className}
            style={{ perspective: '1200px', perspectiveOrigin: '50% 30%' }}
        >
            <div
                style={{
                    transform,
                    opacity,
                    transformStyle: 'preserve-3d',
                    willChange: 'transform, opacity',
                }}
            >
                {children}
            </div>
        </div>
    )
}
