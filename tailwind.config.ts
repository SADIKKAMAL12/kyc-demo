import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d1ff',
          300: '#9bb4ff',
          400: '#708aff',
          500: '#4a5fff',
          600: '#3340f5',
          700: '#2a2fde',
          800: '#242ab4',
          900: '#22288e',
          950: '#151756',
        },
        surface: {
          DEFAULT: '#0a0b14',
          50: '#f8f8fc',
          100: '#f0f0f8',
          200: '#e2e2f0',
          800: '#1a1b2e',
          900: '#0f1022',
          950: '#0a0b14',
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
