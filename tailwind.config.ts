// tailwind.config.js

/** @type {import('tailwindcss').Config} */
const { fontFamily } = require("tailwindcss/defaultTheme");
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
        // This makes 'font-sans' use your --font-nunito variable
        sans: ["var(--font-sans)", ...fontFamily.sans], 
        
        // We are creating a NEW utility class called 'font-heading'
        heading: ["var(--font-heading)", ...fontFamily.sans], 

        // This makes 'font-mono' use your --font-roboto-mono variable
        mono: ["var(--font-mono)", ...fontFamily.mono], 
      },
    },
  },
  plugins: [
    require("@tailwindcss/typography"), // Make sure the typography plugin is enabled
  ],
}