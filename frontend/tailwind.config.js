/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--card-border)",
        input: "var(--card-border)",
        ring: "var(--accent)",
        background: "var(--page-bg)",
        foreground: "var(--text-primary)",
        card: {
          DEFAULT: "var(--card-bg)",
          border: "var(--card-border)",
        },
        page: {
          bg: "var(--page-bg)"
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)"
        },
        accent: {
          DEFAULT: "var(--accent)"
        },
        critical: "var(--anomaly-critical)",
        moderate: "var(--anomaly-moderate)",
        minor: "var(--anomaly-minor)",
        healthy: "var(--healthy)",
        grid: "var(--chart-grid)",
        tooltip: "var(--tooltip-bg)"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
