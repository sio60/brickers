import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FFD700", // Lego Yellow roughly
            }
        },
    },
    plugins: [],
};
export default config;
