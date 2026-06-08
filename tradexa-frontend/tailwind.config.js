/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0e1a",
        surface: "#111827",
        border: "#1f2937",
        primary: "#00d4aa",
        yes: "#00d97e",
        no: "#ff4d6d",
        gold: "#f5c842",
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
