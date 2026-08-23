/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poetry: {
          bg: '#0f0c1b',
          card: 'rgba(23, 18, 41, 0.65)',
          border: 'rgba(212, 175, 55, 0.2)',
          accent: '#d4af37',
          gold: '#e5c158',
          text: '#f5e6ff',
          muted: '#a89fc0',
          darker: '#090712',
          glow: 'rgba(212, 175, 55, 0.15)'
        }
      },
      fontFamily: {
        serif: ['Merriweather', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
