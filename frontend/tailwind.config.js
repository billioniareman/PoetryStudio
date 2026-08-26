/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Stitch design system colors
        background: "#fbf9f4",
        primary: "#000000",
        secondary: "#1f6868",
        tertiary: "#000000",
        "on-surface-variant": "#444748",
        "surface-variant": "#e4e2dd",
        "surface-container-low": "#f5f3ee",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#eae8e3",
        "surface-container-highest": "#e4e2dd",
        "secondary-fixed": "#aaefee",
        "on-secondary-fixed": "#002020",
        "tertiary-fixed": "#ffdea6",
        "on-tertiary-fixed": "#271900",
        "tertiary-fixed-dim": "#f7bd48",
        "outline-variant": "#c4c7c7",
        "outline": "#747878",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        "secondary-container": "#aaefee",
        "on-secondary-container": "#276e6e",
        "on-surface": "#1b1c19",
        "on-background": "#1b1c19",
        "surface-bright": "#fbf9f4",
        "surface-dim": "#dbdad5",
        "surface-tint": "#5f5e5e",
        "primary-fixed": "#e5e2e1",
        "primary-fixed-dim": "#c8c6c5",
        "primary-container": "#1c1b1b",
        "on-primary-container": "#858383",
        "on-primary-fixed": "#1c1b1b",
        "on-primary-fixed-variant": "#474746",
        "on-secondary-fixed-variant": "#004f50",
        "on-tertiary-fixed-variant": "#5d4200"
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem"
      },
      spacing: {
        "container-padding-desktop": "64px",
        gutter: "24px",
        "stack-md": "24px",
        base: "8px",
        "stack-lg": "48px",
        "margin-focus": "120px",
        "container-padding-mobile": "24px",
        "stack-sm": "12px"
      },
      fontFamily: {
        "display-hero": ["Merriweather", "serif"],
        "headline-lg": ["Merriweather", "serif"],
        "headline-lg-mobile": ["Merriweather", "serif"],
        "body-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "verse-primary": ["Merriweather", "serif"],
        "label-caps": ["Inter", "sans-serif"]
      },
      fontSize: {
        "display-hero": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "36px", fontWeight: "700" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "verse-primary": ["20px", { lineHeight: "1.8", letterSpacing: "0.01em", fontWeight: "400" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
