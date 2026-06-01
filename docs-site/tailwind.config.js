/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1c58d9',
          hover: '#1546b8',
          dim: 'rgba(28, 88, 217, 0.08)',
        }
      }
    },
  },
  plugins: [],
}
