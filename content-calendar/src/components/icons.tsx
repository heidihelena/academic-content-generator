import type { SVGProps } from 'react';
import type { Platform } from '../types';

/**
 * Inline SVG icons. Hand-built (rather than an icon dependency) to keep the
 * bundle small, avoid network installs, and stay fully testable.
 */

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

export const OutboxIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 13h4l2 3h6l2-3h4" />
    <path d="M3 13 6 5h12l3 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 3v18h18" />
    <path d="M7 15l3-4 3 3 4-6" />
  </svg>
);

export const PlugIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 7V2M15 7V2M7 7h10v4a5 5 0 0 1-10 0V7zM12 16v6" />
  </svg>
);

export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4L12 3zM19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronLeft = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

export const VideoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="5" width="14" height="14" rx="2" />
    <path d="M16 9l6-3v12l-6-3" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const ListIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </svg>
);

export const BoardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M15 3v18" />
  </svg>
);

export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
);

export const TagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1-.3-.7z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </svg>
);

export const BookIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5z" />
    <path d="M8 7h6M8 11h6" />
  </svg>
);

export const LinkIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 9v4M12 17h.01M10.3 3.9l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);

export const SunIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

export const MoonIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);

// --- Platform brand glyphs ---

export const InstagramGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);

export const LinkedInGlyph = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C20.4 8.65 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3-2 0-2.3 1.57-2.3 3.2V21H9z" />
  </svg>
);

export const ThreadsGlyph = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21c-4.5 0-7.5-3-7.5-9S7.5 3 12 3c3.6 0 6 1.8 6.8 4.5" />
    <path d="M9.5 13.5c.5 1.7 2 2.5 3.5 2.5 1.8 0 3-1 3-2.5 0-2-2.2-2.6-4-2.6-2.2 0-3.4 1-3.4 2.4 0 1.7 1.6 2.7 3.7 2.7 2.7 0 4.4-1.7 4.4-4.5" />
  </svg>
);

export const BlueskyGlyph = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6.3 4.2C8.6 5.9 11 9.4 12 11.3c1-1.9 3.4-5.4 5.7-7.1 1.7-1.2 4.3-2.2 4.3 1 0 .6-.4 5.2-.6 5.9-.7 2.6-3.3 3.2-5.7 2.8 4.1.7 5.1 3 2.9 5.3-4.3 4.4-6.1-1.1-6.6-2.5l-.1-.2-.1.2c-.5 1.4-2.3 6.9-6.6 2.5-2.2-2.3-1.2-4.6 2.9-5.3-2.4.4-5-.2-5.7-2.8C2.4 10.4 2 5.8 2 5.2c0-3.2 2.6-2.2 4.3-1z" />
  </svg>
);

export const MastodonGlyph = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M21.3 8.2c0-3.6-2.4-4.7-2.4-4.7C17.7 3 15.6 2.7 13.4 2.7h-.1c-2.2 0-4.3.3-5.5.8 0 0-2.4 1.1-2.4 4.7 0 .8 0 1.8.1 2.9.2 3.6.8 7.2 4.2 8.1 1.6.4 2.9.5 4 .5 1.8 0 2.8-.3 2.8-.3v-1.9s-1.3.4-2.8.4c-1.5-.1-3-.2-3.3-2 0-.2 0-.4 0-.5 0 0 1.5.3 3.3.4 1.1 0 2.1-.1 3.2-.2 2-.3 3.8-1.4 4-2.5.4-1.7.3-4.3.3-4.3zm-3.1 5.2h-1.9V8.7c0-1-.4-1.5-1.3-1.5-.9 0-1.4.6-1.4 1.8v2.5h-1.9V9c0-1.2-.5-1.8-1.4-1.8-.9 0-1.3.5-1.3 1.5v4.7H6.9V8.5c0-1 .3-1.8.8-2.4.5-.6 1.2-.9 2.1-.9 1 0 1.8.4 2.3 1.2l.5.8.5-.8c.5-.8 1.3-1.2 2.3-1.2.9 0 1.6.3 2.1.9.5.6.8 1.4.8 2.4v4.9z" />
  </svg>
);

export const YouTubeGlyph = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12zM9.8 15V9l5.2 3-5.2 3z" />
  </svg>
);

export const XGlyph = (p: IconProps) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.656l-5.214-6.817-5.966 6.817H1.683l7.73-8.835L1.254 2.25h6.826l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export const PLATFORM_GLYPHS: Record<Platform, (p: IconProps) => JSX.Element> = {
  bluesky: BlueskyGlyph,
  mastodon: MastodonGlyph,
  instagram: InstagramGlyph,
  linkedin: LinkedInGlyph,
  threads: ThreadsGlyph,
  x: XGlyph,
  youtube: YouTubeGlyph,
};
