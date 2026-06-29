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
        // names are unchanged so components don't need editing. Values are CSS
        // variables (see index.css) so one set of tokens drives both themes:
        //   dark  → ink (dark green-black)   light → paper (warm off-white)
        surface: {
          950: 'rgb(var(--surface-950) / <alpha-value>)', // page
          900: 'rgb(var(--surface-900) / <alpha-value>)',
          850: 'rgb(var(--surface-850) / <alpha-value>)', // cards
          800: 'rgb(var(--surface-800) / <alpha-value>)', // inputs
          700: 'rgb(var(--surface-700) / <alpha-value>)', // borders
          600: 'rgb(var(--surface-600) / <alpha-value>)', // hover / strong border
          500: 'rgb(var(--surface-500) / <alpha-value>)', // muted divider
        },
        // `slate` = the text ramp (low number = lightest text in dark mode; the
        // light theme inverts these to dark ink). The app only uses slate for text.
        slate: {
          50: 'rgb(var(--slate-50) / <alpha-value>)',
          100: 'rgb(var(--slate-100) / <alpha-value>)', // primary headings
          200: 'rgb(var(--slate-200) / <alpha-value>)', // body text
          300: 'rgb(var(--slate-300) / <alpha-value>)', // strong secondary
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: 'rgb(var(--slate-500) / <alpha-value>)', // muted / labels / placeholders
          600: 'rgb(var(--slate-600) / <alpha-value>)', // faint
          700: 'rgb(var(--slate-700) / <alpha-value>)',
          800: 'rgb(var(--slate-800) / <alpha-value>)',
          900: 'rgb(var(--slate-900) / <alpha-value>)',
          950: 'rgb(var(--slate-950) / <alpha-value>)',
        },
        brand: {
          DEFAULT: '#46a085',
          400: '#5fb89b', // aurora-soft — links, rings, the "ai" dot
          500: '#46a085', // aurora
          600: '#3c8a72', // deep aurora — primary buttons
        },
        // Vahtian — the academic-integrity accent. Used for the review &
        // evidence surfaces (claim/citation/safety review, audit trail,
        // evidence status, the publishing gate) so integrity reads as one
        // distinct, deliberate colour, separate from the aurora brand.
        vahtian: {
          DEFAULT: '#8b6fc9',
          primary: '#2d2440', // deep aubergine — borders / strong surfaces
          accent: '#8b6fc9', // the review accent — text, dots, active borders
          soft: '#c5b8e8', // soft lilac — subtle fills / on-dark text
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
