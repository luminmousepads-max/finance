/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F4EE",
        sheet: "#FFFFFF",
        ink: "#1B1B18",
        muted: "#5C5B52",
        rule: "#E4E0D4",
        ledger: {
          DEFAULT: "#2F5D50",
          deep: "#1E3F36",
          wash: "#E6EEE9",
        },
        debit: {
          DEFAULT: "#A63328",
          deep: "#7E241C",
          wash: "#F4E7E4",
        },
        ochre: {
          DEFAULT: "#8A6A1F",
          wash: "#F2ECDC",
        },
      },
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"IBM Plex Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: {
        sheet: "3px",
      },
      boxShadow: {
        sheet: "0 1px 0 rgba(27,27,24,0.04), 0 1px 3px rgba(27,27,24,0.05)",
      },
    },
  },
  plugins: [],
};
