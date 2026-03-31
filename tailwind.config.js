/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0d1117',
        panel: '#161b25',
        line: '#2c3650',
        accent: '#5b9bd6',
        accentSoft: '#8fc4ff',
      },
      boxShadow: {
        checkout: '0 24px 70px rgba(0, 0, 0, 0.38)',
      },
    },
  },
  plugins: [],
};
