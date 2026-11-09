/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0B192C',
          light: '#1E3E62',
        },
        teal: {
          DEFAULT: '#008170',
          dark: '#005B41',
        },
        canvas: '#F8FAFC',
        verdict: {
          scam: '#DC2626',
          'scam-bg': '#FEF2F2',
          suspicious: '#D97706',
          'suspicious-bg': '#FFFBEB',
          noreports: '#64748B',
          'noreports-bg': '#F8FAFC',
          verified: '#16A34A',
          'verified-bg': '#F0FDF4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      }
    },
  },
  plugins: [],
}
