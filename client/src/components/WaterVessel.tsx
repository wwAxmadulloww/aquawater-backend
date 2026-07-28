import React from 'react'

/**
 * The 19L bottle, built as a volume rather than drawn as an icon.
 *
 * This is the page's signature element, and it earns that by being the most
 * recognisable object in the business — everyone ordering water in Tashkent
 * knows this silhouette on sight.
 *
 * The whole bottle is one clip-path so the profile stays a real moulded shape
 * (narrow neck, flared shoulder, straight body) instead of a rounded rectangle
 * that reads as a flask. Water, meniscus and highlights are layered inside and
 * inherit the same clip, so light appears to pass through a single object: the
 * caustic field behind the hero shows through the empty headspace, and the
 * fill line sits where a real bottle's would.
 *
 * All CSS, so it costs nothing on the wire and stays sharp at any size — which
 * matters more than photoreal detail here, because most of this audience
 * arrives on a phone over mobile data.
 */

// x/y percentages tracing the bottle profile, top-centre clockwise.
const BOTTLE = `polygon(
    38% 0%, 62% 0%,
    62% 4.5%, 59% 6%,
    59% 12%,
    91% 25%,
    93% 30%,
    93% 95%,
    88% 100%,
    12% 100%,
    7% 95%,
    7% 30%,
    9% 25%,
    41% 12%,
    41% 6%,
    38% 4.5%
)`

export default function WaterVessel({ className = '' }: { className?: string }) {
    return (
        <div className={`relative select-none ${className}`} aria-hidden="true">
            <div
                className="relative h-full w-full"
                style={{ clipPath: BOTTLE, WebkitClipPath: BOTTLE } as React.CSSProperties}
            >
                {/* The vessel itself: tinted polycarbonate, lit from the upper left */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a3f4f]/70 via-[#cdf2fa]/25 to-[#0a3f4f]/70" />

                {/* Water, filled to a real line so the headspace above reads as air */}
                <div className="absolute inset-x-0 bottom-0 h-[70%]
                                bg-gradient-to-b from-[#3fd0e6]/90 via-[#12a0b8]/95 to-[#084e60]">
                    {/* Meniscus — the ellipse the surface makes seen slightly from above */}
                    <div className="absolute inset-x-0 -top-2 h-4 rounded-[50%] bg-[#7cebf7]/90
                                    shadow-[0_3px_14px_rgba(88,232,210,.7)]" />
                </div>

                {/* Specular streak down the leading edge */}
                <div className="absolute left-[16%] top-[16%] h-[76%] w-[7%] rounded-full blur-[1px]
                                bg-gradient-to-b from-white/90 via-white/35 to-transparent" />

                {/* Weaker counter-highlight where light wraps the far side */}
                <div className="absolute right-[14%] top-[28%] h-[52%] w-[4%] rounded-full blur-[2px]
                                bg-gradient-to-b from-white/50 to-transparent" />

                {/* Cap: opaque, so it reads as a different material to the body */}
                <div className="absolute inset-x-[38%] top-0 h-[5%] bg-gradient-to-b from-[#3ad9ef] to-[#0d7e96]" />
            </div>

            {/* Contact shadow — pins the bottle to the floor instead of letting it float */}
            <div className="mx-auto -mt-2 h-6 w-[70%] rounded-[50%] bg-abyss/70 blur-xl" />
        </div>
    )
}
