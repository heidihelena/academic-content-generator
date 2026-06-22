/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // "Ink & paper" light theme (brand: forskAI).
        // Brand tokens: ink #0B1210, paper #F4F1EA, aurora green #46A085 / #5FB89B.
        // `surface` is the paper ramp (low = page, high = borders/controls); it
        // keeps the existing class names so components don't have to change.
        surface: {
          950: '#f4f1ea', // page (paper)
          900: '#fbf9f4', // cards (lifted, near-white)
          850: '#f1ece1',
          800: '#ffffff', // inputs (crisp white)
          700: '#e3dccd', // borders / secondary buttons
          600: '#d4cbb7', // hover / stronger border
          500: '#b8ad96', // muted divider
        },
        // `slate` overridden to an INK ramp (low number = darkest ink). The app
        // only uses slate for text, so existing text-slate-* classes now render
        // as dark ink on paper without touching components.
        slate: {
          50: '#3a443e',
          100: '#0b1210', // ink — strongest headings
          200: '#16211c', // primary body text
          300: '#222e28', // strong text
          400: '#46524c', // muted
          500: '#69736c', // more muted / placeholders
          600: '#929b94', // faint
          700: '#243029',
          800: '#161f1b',
          900: '#0e1611',
          950: '#0b1210',
        },
        brand: {
          DEFAULT: '#46a085',
          400: '#5fb89b', // soft aurora — rings, links, hover
          500: '#46a085', // aurora green
          600: '#3c8a72', // deep aurora — primary buttons
        },
        platform: {
          instagram: '#e1306c',
          linkedin: '#0a66c2',
          threads: '#7c3aed',
        },
        // Status hues darkened so they read on a paper background.
        status: {
          brief: '#b45309',
          draft: '#6b7280',
          review: '#7c3aed',
          approved: '#0f766e',
          scheduled: '#0369a1',
          published: '#15803d',
          learn: '#1d4ed8',
          failed: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
