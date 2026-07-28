/** @type {import('tailwindcss').Config} */

/*
 * The palette is sampled from water optics rather than a generic brand blue:
 * the near-black teal of deep water, the glaucous tint of a polycarbonate 19L
 * bottle, and the bright aqua where light concentrates into caustics.
 *
 * `primary` and `gray` deliberately keep their Tailwind names, so every
 * existing primary-600 / gray-500 in the app inherits the new direction
 * without those files being touched — the admin panel included.
 */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Water in volume — the action colour.
                primary: {
                    50: '#ecfbfc',
                    100: '#d3f4f7',
                    200: '#ade8ef',
                    300: '#76d5e2',
                    400: '#38b9cd',
                    500: '#1c9db3',
                    600: '#12a0b8',
                    700: '#0f7d94',
                    800: '#116579',
                    900: '#135566',
                    950: '#052a38',
                },
                // Neutrals carry a faint teal cast so nothing reads as dead grey.
                gray: {
                    50: '#f4fafb',
                    100: '#e8f1f3',
                    200: '#d3e2e6',
                    300: '#b0c8ce',
                    400: '#7c9ba4',
                    500: '#587c86',
                    600: '#44636d',
                    700: '#39515a',
                    800: '#32454c',
                    900: '#1e3138',
                    950: '#0d1c22',
                },
                abyss: '#052a38',   // deep water seen from below
                tank: '#0a4c5f',    // mid-depth
                glacier: '#12a0b8', // clean water in volume
                caustic: '#58e8d2', // where light concentrates
                foam: '#f4fafb',    // water-washed surface
                sun: '#ffa94d',     // the one warm note — sun through the bottle
            },
            fontFamily: {
                display: ['Unbounded', 'system-ui', 'sans-serif'],
                sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            },
            boxShadow: {
                /*
                 * Two-part elevation: a tight contact shadow pinning the object to
                 * the surface, plus a wide ambient one tinted with the water hue,
                 * so things sit in an environment instead of floating on grey.
                 */
                depth: '0 1px 2px rgba(5,42,56,0.10), 0 8px 24px -6px rgba(5,42,56,0.14)',
                lift: '0 2px 4px rgba(5,42,56,0.10), 0 24px 48px -12px rgba(5,42,56,0.24)',
                submerged: '0 1px 2px rgba(5,42,56,0.12), 0 18px 40px -10px rgba(18,160,184,0.30)',
                // Kept so existing shadow-soft / shadow-card usages stay valid.
                soft: '0 1px 2px rgba(5,42,56,0.08), 0 10px 24px -8px rgba(5,42,56,0.16)',
                card: '0 1px 2px rgba(5,42,56,0.08), 0 4px 12px -4px rgba(5,42,56,0.10)',
            },
            keyframes: {
                // Caustics: two light fields drifting at different rates, the way
                // rippling water never quite repeats.
                drift: {
                    '0%,100%': { transform: 'translate3d(-4%,-2%,0) scale(1.05)' },
                    '50%': { transform: 'translate3d(4%,3%,0) scale(1.15)' },
                },
                driftSlow: {
                    '0%,100%': { transform: 'translate3d(3%,2%,0) scale(1.12)' },
                    '50%': { transform: 'translate3d(-3%,-3%,0) scale(1.02)' },
                },
                rise: {
                    '0%': { opacity: '0', transform: 'translateY(14px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                drift: 'drift 18s ease-in-out infinite',
                'drift-slow': 'driftSlow 26s ease-in-out infinite',
                rise: 'rise .6s cubic-bezier(.2,.7,.3,1) both',
            },
        },
    },
    plugins: [],
}
