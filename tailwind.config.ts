import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        panel: "#101721",
        muted: "#182230",
        line: "#253244",
        accent: "#22c55e",
        warning: "#f59e0b",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(0, 0, 0, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
