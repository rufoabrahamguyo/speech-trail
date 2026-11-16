/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4f8fb",
        card: "#ffffff",
        ink: "#011f4b",
        muted: "#3d5a73",
        line: "#b3cde0",
        brand: "#005b96",
        ember: "#a1263b",
        spark: "#6497b1",
        pine: "#0d6b4e",
        moss: "#e5f4ec",
        blush: "#fde8ec",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(1, 31, 75, 0.06)",
      },
    },
  },
  plugins: [],
};
