import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#faf5f7',
          100: '#f5ebef',
          200: '#edd9e0',
          300: '#dfbcc8',
          400: '#cc96a8',
          500: '#b87389',
          600: '#a3586f',
          700: '#88475a',
          800: '#723d4c',
          900: '#603642',
          DEFAULT: '#b87389',
        },
        secondary: {
          50: '#f0fafa',
          100: '#d9f2f2',
          200: '#b6e4e4',
          300: '#84d0d0',
          400: '#4db5b5',
          500: '#33999a',
          600: '#2c7b7d',
          700: '#296466',
          800: '#275254',
          900: '#244546',
          DEFAULT: '#33999a',
        },
        accent: {
          300: '#fcd191',
          400: '#fabb5c',
          500: '#f7a32b',
          DEFAULT: '#f7a32b',
        },
        background: '#FAFAFA',
        surface: '#FFFFFF',
        'text-primary': '#1a1a2e',
        'text-secondary': '#4a5568',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 10px 40px -15px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
