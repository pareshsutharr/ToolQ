import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "node-blue": "rgb(var(--color-node-blue) / <alpha-value>)",
        "deep-ink": "rgb(var(--color-deep-ink) / <alpha-value>)",
        "signal-violet": "rgb(var(--color-signal-violet) / <alpha-value>)",
        "spark-lime": "rgb(var(--color-spark-lime) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "flag-red": "rgb(var(--color-flag-red) / <alpha-value>)",
        amber: "rgb(var(--color-amber) / <alpha-value>)",
      },
      backgroundImage: {
        "ai-gradient": "linear-gradient(135deg, #4F46E5 0%, #22D3EE 100%)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
