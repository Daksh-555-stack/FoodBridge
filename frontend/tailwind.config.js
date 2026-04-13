/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        donor: {
          50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
          400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
        },
        driver: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
        },
        shelter: {
          50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca',
          400: '#f87171', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a',
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
