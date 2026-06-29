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
        // brand = teal (create / Forskai). CSS vars flip per theme (see index.css).
        brand: {
          DEFAULT: 'rgb(var(--brand-500) / <alpha-value>)',
          400: 'rgb(var(--brand-400) / <alpha-value>)', // links, rings, the "ai" dot
          500: 'rgb(var(--brand-500) / <alpha-value>)', // create
          600: 'rgb(var(--brand-600) / <alpha-value>)', // primary buttons
        },
        // verify = violet (review / evidence / the *vahti family).
        verify: {
          DEFAULT: 'rgb(var(--verify-500) / <alpha-value>)',
          400: 'rgb(var(--verify-400) / <alpha-value>)',
          500: 'rgb(var(--verify-500) / <alpha-value>)',
        },
        platform: {
          instagram: '#e1306c',
          linkedin: '#0a66c2',
          threads: '#a855f7',
        },
        // Pipeline/status hues mapped to the brand verdict triad
        // (PASS=green / RISK=amber / FAIL=red) plus teal create & violet verify.
        status: {
          brief: '#c0892d', // amber (RISK) — needs work
          draft: '#75788c', // muted — neutral WIP
          review: '#5b4fa6', // violet (verify) — in review
          approved: '#2e7d55', // green (PASS) — cleared
          scheduled: '#1f726b', // teal (create) — queued
          published: '#2e7d55', // green (PASS) — live
          learn: '#75788c', // muted
          failed: '#b23a3a', // red (FAIL)
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
