import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FFD700", // Lego Yellow roughly
            },
            keyframes: {
                bounceCustom: {
                    '0%': { top: '0', transform: 'scaleX(1) scaleY(1)' },
                    '100%': { top: '60px', transform: 'scaleX(1.1) scaleY(0.9)' },
                },
                shadowScale: {
                    '0%': { transform: 'scale(0.6)', opacity: '0.3' },
                    '100%': { transform: 'scale(1.1)', opacity: '0.8' },
                },
                fadeIn: {
                    'from': { opacity: '0', transform: 'translateY(-10px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                }
            },
            animation: {
                bounceCustom: 'bounceCustom 0.6s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5)',
                shadowScale: 'shadowScale 0.6s infinite alternate cubic-bezier(0.5, 0.05, 1, 0.5)',
                fadeIn: 'fadeIn 0.5s ease-out',
            }
        },
    },
    plugins: [],
};
export default config;
