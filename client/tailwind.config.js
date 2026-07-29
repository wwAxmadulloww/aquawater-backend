/** @type {import('tailwindcss').Config} */

/*
 * Midnight blue. The canvas is #02060E — a navy so dark it reads as black at a
 * glance but never goes flat the way #000 does, because every neutral above it
 * carries the same blue cast and the whole screen sits on one hue. Panels
 * separate from it by a hair of light, and #0356C5 does all the interactive
 * work.
 *
 * The `gray` ramp is deliberately INVERTED — gray-50 is the darkest value and
 * gray-950 the lightest. Every `text-gray-900` and `bg-gray-50` already in the
 * app keeps meaning what it meant (strongest text, most recessed surface) and
 * lands on the correct side of a dark theme without those files being touched.
 * The admin, courier and worker panels follow from this alone.
 *
 * `primary` stays the accent ramp under its Tailwind name for the same reason.
 */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // The one cold accent. Water, at the only point the page raises
                // its voice: prices, primary actions, active state.
                primary: {
                    50: '#031127',
                    100: '#04204d',
                    200: '#052e73',
                    300: '#0244a0',
                    400: '#0356c5',   // the brand blue
                    500: '#1268de',
                    600: '#2f83ef',   // the blue that survives on a dark panel
                    700: '#62a4f6',
                    800: '#9bc6fa',
                    900: '#cbe1fd',
                    950: '#ecf5fe',
                },
                // Inverted ramp — see the note above.
                gray: {
                    50: '#02060e',
                    100: '#071129',
                    200: '#0c1c3a',
                    300: '#143054',
                    400: '#1d4275',
                    500: '#5d7ba8',
                    600: '#8ea9d0',
                    700: '#b6c9e6',
                    800: '#d5e1f4',
                    900: '#eaf1fc',
                    950: '#ffffff',
                },
                ink: '#02060e',        // the canvas
                surface: '#061229',    // a panel lifted off it
                surface2: '#0b1f3f',   // a panel on a panel
                line: '#14315e',       // the hair of light that separates them
                accent: '#2f83ef',     // for text and icons, where #0356c5 is too dark
                brand: '#0356c5',      // for fills, where white sits on top of it
                sun: '#f0a83c',        // the one warm note, used sparingly

                // Retained so older utility usages keep resolving.
                abyss: '#02060e',
                tank: '#061229',
                glacier: '#0356c5',
                caustic: '#2f83ef',
                foam: '#02060e',
            },
            fontFamily: {
                // One grotesk for everything. The reference gets its authority
                // from scale and tracking, not from a second typeface.
                display: ['Inter Tight', 'system-ui', 'sans-serif'],
                sans: ['Inter Tight', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            boxShadow: {
                /*
                 * On black, elevation cannot be read from a darker shadow — there
                 * is nothing darker. Panels separate by a lit top edge plus a
                 * wide, very soft pool that darkens the canvas around them.
                 */
                depth: 'inset 0 1px 0 rgba(255,255,255,.06), 0 2px 8px rgba(1,4,12,.7)',
                lift: 'inset 0 1px 0 rgba(255,255,255,.08), 0 24px 60px -20px rgba(1,4,12,.95)',
                submerged: 'inset 0 1px 0 rgba(255,255,255,.06), 0 18px 44px -16px rgba(1,4,12,.9)',
                // Kept so existing shadow-soft / shadow-card usages stay valid.
                soft: 'inset 0 1px 0 rgba(255,255,255,.05), 0 10px 30px -12px rgba(1,4,12,.85)',
                card: 'inset 0 1px 0 rgba(255,255,255,.05), 0 6px 20px -8px rgba(1,4,12,.8)',
            },
            keyframes: {
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                // The wireframe turns slowly, the way the reference's hero object
                // does — enough to read as an object, never enough to distract.
                turn: {
                    '0%,100%': { transform: 'rotateY(-9deg) rotateX(2deg)' },
                    '50%': { transform: 'rotateY(9deg) rotateX(-2deg)' },
                },
                scan: {
                    '0%': { transform: 'translateY(-40%)', opacity: '0' },
                    '35%': { opacity: '1' },
                    '100%': { transform: 'translateY(340%)', opacity: '0' },
                },
                // Retained: some sections still reference the drift animations.
                drift: {
                    '0%,100%': { transform: 'translate3d(-4%,-2%,0) scale(1.05)' },
                    '50%': { transform: 'translate3d(4%,3%,0) scale(1.15)' },
                },
                driftSlow: {
                    '0%,100%': { transform: 'translate3d(3%,2%,0) scale(1.12)' },
                    '50%': { transform: 'translate3d(-3%,-3%,0) scale(1.02)' },
                },
            },
            animation: {
                rise: 'rise .7s cubic-bezier(.2,.7,.3,1) both',
                turn: 'turn 16s ease-in-out infinite',
                scan: 'scan 6s ease-in-out infinite',
                drift: 'drift 18s ease-in-out infinite',
                'drift-slow': 'driftSlow 26s ease-in-out infinite',
            },
        },
    },
    plugins: [],
}
