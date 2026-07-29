/** @type {import('tailwindcss').Config} */

/*
 * A monochrome dark system: near-black canvas, panels that separate from it by
 * a hair of light rather than by colour, and one cold accent doing all the
 * interactive work.
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
                    50: '#062227',
                    100: '#08333b',
                    200: '#0a4550',
                    300: '#0d5f6e',
                    400: '#12879b',
                    500: '#19b3cc',
                    600: '#3ad2e8',
                    700: '#6ce0f0',
                    800: '#a3ecf7',
                    900: '#cdf5fb',
                    950: '#eafbfe',
                },
                // Inverted ramp — see the note above.
                gray: {
                    50: '#0a0a0b',
                    100: '#121214',
                    200: '#1c1c1f',
                    300: '#2a2a2e',
                    400: '#3d3d43',
                    500: '#6b6b73',
                    600: '#8e8e96',
                    700: '#adadb4',
                    800: '#c9c9ce',
                    900: '#ebebee',
                    950: '#ffffff',
                },
                ink: '#000000',        // the canvas
                surface: '#111113',    // a panel lifted off it
                surface2: '#1a1a1d',   // a panel on a panel
                line: '#26262b',       // the hair of light that separates them
                accent: '#3ad2e8',
                sun: '#d7f24a',        // the single warm pop, used sparingly

                // Retained so older utility usages keep resolving.
                abyss: '#000000',
                tank: '#111113',
                glacier: '#3ad2e8',
                caustic: '#3ad2e8',
                foam: '#0a0a0b',
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
                depth: 'inset 0 1px 0 rgba(255,255,255,.06), 0 2px 8px rgba(0,0,0,.6)',
                lift: 'inset 0 1px 0 rgba(255,255,255,.08), 0 24px 60px -20px rgba(0,0,0,.95)',
                submerged: 'inset 0 1px 0 rgba(255,255,255,.06), 0 18px 44px -16px rgba(0,0,0,.9)',
                // Kept so existing shadow-soft / shadow-card usages stay valid.
                soft: 'inset 0 1px 0 rgba(255,255,255,.05), 0 10px 30px -12px rgba(0,0,0,.85)',
                card: 'inset 0 1px 0 rgba(255,255,255,.05), 0 6px 20px -8px rgba(0,0,0,.8)',
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
