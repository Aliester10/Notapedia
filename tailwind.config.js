/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec1ff',
          400: '#599cff',
          500: '#3478f6',
          600: '#1f5be0',
          700: '#1a48b5',
          800: '#1b3f90',
          900: '#1c3876',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
