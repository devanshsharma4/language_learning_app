/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Albert Sans"', 'sans-serif'],
      },
      colors: {
        cream: { DEFAULT: '#F7F3EB', dark: '#EDE7DA' },
        sage: { DEFAULT: '#8B9E7E', dark: '#6B7F5E' },
        moss: '#A4B494',
        olive: '#5C6B4F',
        sand: '#E2D9C8',
        bark: { DEFAULT: '#3D3929', light: '#7A7265' },
        terracotta: '#B5594E',
      },
    },
  },
  plugins: [],
};
