// tailwind.config.js

const { fontFamily } = require("tailwindcss/defaultTheme"); // Add this line back


/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // <-- THIS LINE IS CRUCIAL
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-nunito)", ...fontFamily.sans],
        heading: ["var(--font-playfair-display)", ...fontFamily.sans],
        mono: ["var(--font-roboto-mono)", ...fontFamily.mono],
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"), // Make sure the typography plugin is enabled
  ],
}