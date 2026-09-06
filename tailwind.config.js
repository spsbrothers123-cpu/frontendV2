/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        yolk: {
          50: "#FFFBEB",
          100: "#FFF3C4",
          200: "#FFE58A",
          300: "#FFD24D",
          400: "#F9C22E",
          500: "#F0B429",
          600: "#D9971F",
          700: "#B37A18",
          800: "#8A5E14",
          900: "#5C3F0D",
        },
        ivory: {
          DEFAULT: "#FBF7EF",
          soft: "#F7F1E4",
          card: "#FFFEFB",
        },
        charcoal: {
          DEFAULT: "#231F1A",
          soft: "#3A342C",
          muted: "#6B6459",
        },
        olive: {
          DEFAULT: "#5C6B2C",
          soft: "#E7EBD8",
        },
        amber: {
          DEFAULT: "#C87F0A",
          soft: "#FBEBD2",
        },
        danger: {
          DEFAULT: "#C15B4A",
          soft: "#F8E4E0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["'DM Sans'", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
        btn: "12px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(35, 31, 26, 0.06), 0 1px 2px rgba(35, 31, 26, 0.04)",
        lift: "0 8px 24px rgba(35, 31, 26, 0.10)",
      },
      transitionDuration: {
        150: "150ms",
        250: "250ms",
      },
      screens: {
        xs: "375px",
      },
    },
  },
  plugins: [],
};
