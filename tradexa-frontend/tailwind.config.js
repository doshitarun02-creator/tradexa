/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f6f9",
        surface: "#ffffff",
        border: "#e2e8f0",
        primary: "#0b6fa4",
        yes: "#8fd0ff",
        no: "#ffc1d5",
        gold: "#fbbf24",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        "soft-lg": "0 18px 45px rgba(0,0,0,0.55)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.8s infinite",
        marquee: "marquee 20s linear infinite",
      },
    },
  },
  plugins: [],
};
