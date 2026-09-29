/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07090f",
          900: "#0c111c",
          800: "#141b2d",
          700: "#1c2740",
        },
        phosphor: {
          300: "#9af7e8",
          400: "#5eead4",
          500: "#2dd4bf",
        },
        flare: {
          400: "#f5c16c",
          500: "#e8a838",
        },
        star: {
          400: "#f0abfc",
          500: "#d946ef",
        },
      },
      fontFamily: {
        display: ['"Syne"', "system-ui", "sans-serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 0 0 1px rgba(94, 234, 212, 0.12), 0 18px 50px rgba(0,0,0,0.45)",
      },
    },
  },
  plugins: [],
};
