/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#005BAC',
        accent: '#00B900',
      },
    },
  },
  plugins: [],
};
