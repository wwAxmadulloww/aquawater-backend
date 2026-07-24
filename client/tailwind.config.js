/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#eff8ff',
                    100: '#dbeffe',
                    200: '#bfe3fe',
                    300: '#93d2fd',
                    400: '#60b8fa',
                    500: '#3b9cf6',
                    600: '#1e7fe8',
                    700: '#1866cf',
                    800: '#1a53a7',
                    900: '#1b4785',
                    950: '#142c53',
                },
                water: {
                    light: '#e0f2fe',
                    DEFAULT: '#0ea5e9',
                    dark: '#0284c7',
                }
            },
            fontFamily: {
                sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
            },
            boxShadow: {
                'soft': '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
                'card': '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
            },
        },
    },
    plugins: [],
}
