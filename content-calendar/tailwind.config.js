/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-mode surface palette tuned for a focused SaaS dashboard.
        surface: {
          950: '#0a0b0f',
          900: '#0f1117',
          850: '#13151d',
          800: '#171a23',
          700: '#1f2330',
          600: '#2a2f3e',
          500: '#3a4154',
        },
        brand: {
          DEFAULT: '#6366f1',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
        },
        // Per-platform accent colors used by badges, filters and previews.
        platform: {
          instagram: '#e1306c',
          linkedin: '#0a66c2',
          threads: '#a855f7',
        },
        status: {
          brief: '#fbbf24',
          draft: '#94a3b8',
          review: '#c084fc',
          approved: '#2dd4bf',
          scheduled: '#38bdf8',
          published: '#34d399',
          learn: '#60a5fa',
          failed: '#f87171',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
