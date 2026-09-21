import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          lilac: "#8B7FD6",
          lilacDark: "#5A4FBF",
          cream: "#FBFAF8",
          ink: "#221F2E",
          mint: "#B7E4C7",
          sky: "#AEDFF7",
          purple: "#4B2E83",
          red: "#D64550"
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      borderRadius: {
        xl2: "1.25rem"
      }
    }
  },
  plugins: []
};
export default config;
