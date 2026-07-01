import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        "node-blue": "#4F46E5",
        "deep-ink": "#1C1917",
        "signal-violet": "#22D3EE",
        "spark-lime": "#10B981",
        "ink": "#1C1917",
        "surface": "#F5F4F1",
        "flag-red": "#DC2626",
        amber: "#D97706",
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
