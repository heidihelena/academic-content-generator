/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // forskAI "ink & paper" — a dark, green-black theme.
        // Tokens: ink #0B1210 (bg), ink-raised #17211D, paper #F4F1EA (text),
        // paper-dim #C9CBC3, slate #828B86, aurora #46A085 / soft #5FB89B,
        // amber #E0A34B (risk), red #B75A64 (fail).
        // `surface` = the ink ramp (low = page, high = borders/controls); class
        // names are unchanged so components don't need editing.
        surface: {
          950: '#0b1210', // page (ink)
          900: '#101814',
          850: '#17211d', // cards (ink-raised)
          800: '#1d2823', // inputs
          700: '#28332e', // borders
          600: '#38443e', // hover / strong border
          500: '#4d5a53', // muted divider
        },
        // `slate` = the text ramp (low number = lightest, i.e. paper). The app
        // only uses slate for text, matching the original dark-theme semantics.
        slate: {
          50: '#ffffff',
          100: '#f4f1ea', // paper — primary headings
          200: '#e4e1d8', // body text
          300: '#c9cbc3', // paper-dim — strong secondary
          400: '#9aa39c',
          500: '#828b86', // slate — muted / labels / placeholders
          600: '#6a736d', // faint
          700: '#566059',
          800: '#3a443e',
          900: '#28332e',
          950: '#17211d',
        },
        brand: {
          DEFAULT: '#46a085',
          400: '#5fb89b', // aurora-soft — links, rings, the "ai" dot
          500: '#46a085', // aurora
          600: '#3c8a72', // deep aurora — primary buttons
        },
        platform: {
          instagram: '#e1306c',
          linkedin: '#0a66c2',
          threads: '#a855f7',
        },
        // Pipeline/status hues, kept within the brand (aurora / amber / red / slate).
        status: {
          brief: '#e0a34b', // amber — needs work
          draft: '#828b86', // slate — neutral WIP
          review: '#5fb89b', // aurora-soft — in review
          approved: '#46a085', // aurora — cleared
          scheduled: '#5fb89b', // aurora-soft — queued
          published: '#46a085', // aurora — live (PASS)
          learn: '#828b86', // slate
          failed: '#b75a64', // red (FAIL)
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
