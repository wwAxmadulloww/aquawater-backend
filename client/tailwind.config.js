/** @type {import('tailwindcss').Config} */

/*
 * Daylight on water. The canvas is #F4FAFF — white with just enough blue in it
 * to stop the page reading as a form, and #1B7CF5 does all the interactive
 * work. Text is never pure black: the darkest value is #0B2545, so the whole
 * screen sits on one hue the way the dark theme did.
 *
 * The `gray` ramp used to be INVERTED — gray-50 the darkest value — because
 * that let 460-odd existing `text-gray-900` and `bg-gray-50` classes land on
 * the correct side of a dark theme untouched. Turning the theme light is
 * therefore mostly turning that ramp back the right way up: every one of those
 * classes keeps meaning what it meant (strongest text, most recessed surface)
 * and follows automatically.
 *
 * Contrast was checked against white for the shades that carry text. The two
 * that matter most by usage are gray-600 (146 uses, secondary text) at 6.2:1
 * and gray-500 (55 uses) at 4.6:1 — both clear of 4.5:1.
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
                // The one accent. Water, at the only point the page raises its
                // voice: prices, primary actions, active state.
                primary: {
                    50: '#eaf4fe',
                    100: '#cfe6fd',
                    200: '#9dccfb',
                    300: '#5eaef8',
                    400: '#1b7cf5',
                    500: '#1b7cf5',   // the brand blue
                    600: '#0a62d6',   // the blue that stays readable as text on white
                    700: '#0b3e85',
                    800: '#0b3e85',
                    900: '#0b2545',
                    950: '#0b2545',
                },
                // Upright again — see the note above.
                gray: {
                    50: '#f4faff',
                    100: '#eaf4fe',
                    200: '#e3eaf2',
                    300: '#cfe6fd',
                    400: '#98a6b8',
                    500: '#66768c',
                    600: '#55647a',
                    700: '#3d5068',
                    800: '#24384f',
                    900: '#12283f',
                    950: '#0b2545',
                },
                ink: '#f4faff',        // the canvas
                surface: '#ffffff',    // a panel lifted off it
                surface2: '#eaf4fe',   // a panel on a panel
                line: '#e3eaf2',       // the hairline that separates them
                accent: '#0a62d6',     // for text and icons, where #1b7cf5 is too light
                /*
                 * The fill under white text is the deeper blue, not #1B7CF5.
                 * White on #1B7CF5 measures 4.0:1 — under the 4.5:1 a button
                 * label at 14px needs, which is a flaw in the palette as drawn
                 * rather than in how it was applied here. #0A62D6 carries the
                 * same hue at 5.6:1, and #1B7CF5 stays available as primary-500
                 * for display type and tints, where 3:1 is the bar.
                 */
                brand: '#0a62d6',
                sun: '#f79009',        // the one warm note, used sparingly

                // Retained so older utility usages keep resolving.
                abyss: '#f4faff',
                tank: '#ffffff',
                glacier: '#1b7cf5',
                caustic: '#0a62d6',
                foam: '#f4faff',
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
