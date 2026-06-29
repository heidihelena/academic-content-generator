/* Forskai Studio — Tailwind theme extension.
 * Merge into content-calendar/tailwind.config.{js,ts}:
 *
 *   const forskai = require('../brand/tailwind.brand.cjs');
 *   module.exports = { theme: { extend: forskai.extend }, ... };
 *
 * Colors reference CSS variables (brand/forskai.css), so light/dark switch
 * automatically with [data-theme] — no Tailwind dark: variants needed for brand color.
 */
module.exports = {
  extend: {
    colors: {
      // workspace / neutral
      bg:        'var(--fs-bg)',
      surface:   'var(--fs-surface)',
      'surface-2':'var(--fs-surface-2)',
      border:    'var(--fs-border)',
      ink:       'var(--fs-ink)',
      'ink-soft':'var(--fs-ink-soft)',
      muted:     'var(--fs-muted)',
      // functional accents
      create:      { DEFAULT: 'var(--fs-create)', soft: 'var(--fs-create-soft)' },
      verify:      { DEFAULT: 'var(--fs-verify)', soft: 'var(--fs-verify-soft)' },
      ready:       { DEFAULT: 'var(--fs-ready)',  soft: 'var(--fs-ready-soft)' },
      review:      { DEFAULT: 'var(--fs-review)', soft: 'var(--fs-review-soft)', accent: 'var(--fs-review-accent)' },
      stop:        { DEFAULT: 'var(--fs-stop)',   soft: 'var(--fs-stop-soft)' },
    },
    borderRadius: { sm: '6px', md: '10px', lg: '14px', pill: '999px' },
    boxShadow: {
      card:  'var(--fs-shadow-card)',
      panel: 'var(--fs-shadow-panel)',
    },
    fontFamily: {
      heading: ['Newsreader', 'Source Serif 4', 'Georgia', 'serif'],
      ui:      ['Inter', 'Inter Tight', 'system-ui', 'sans-serif'],
      mono:    ['IBM Plex Mono', 'JetBrains Mono', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      // web-app UI scale
      'ui-xs':  ['12px', { lineHeight: '16px' }],
      'ui-sm':  ['13px', { lineHeight: '18px' }],
      'ui-base':['14px', { lineHeight: '20px' }],
      'ui-md':  ['16px', { lineHeight: '24px' }],
      'ui-lg':  ['18px', { lineHeight: '26px' }],
      'ui-xl':  ['22px', { lineHeight: '28px' }],
      // marketing scale
      'mk-h3':  ['28px', { lineHeight: '34px', letterSpacing: '-0.01em' }],
      'mk-h2':  ['40px', { lineHeight: '46px', letterSpacing: '-0.02em' }],
      'mk-h1':  ['56px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
      'mk-display':['72px', { lineHeight: '74px', letterSpacing: '-0.025em' }],
    },
  },
};
