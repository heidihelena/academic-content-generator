import type { Platform, PlatformMeta } from '../types';

/**
 * Static, per-platform configuration. Centralizing this here means badges,
 * filters, previews, the editor character counter and charts all agree on
 * names, colors and character limits.
 */
export const PLATFORM_META: Record<Platform, PlatformMeta> = {
  bluesky: {
    id: 'bluesky',
    name: 'Bluesky',
    characterLimit: 300,
    color: '#0a85ff',
    handlePrefix: '@',
  },
  mastodon: {
    id: 'mastodon',
    name: 'Mastodon',
    characterLimit: 500,
    color: '#6364ff',
    handlePrefix: '@',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    characterLimit: 2200,
    color: '#e1306c',
    handlePrefix: '@',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    characterLimit: 3000,
    color: '#0a66c2',
    handlePrefix: '',
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    characterLimit: 500,
    color: '#a855f7',
    handlePrefix: '@',
  },
};

/**
 * Ordered list of platforms for rendering filters, tabs, etc. Scholarly
 * networks lead, since they're where the academic audience is.
 */
export const PLATFORMS: Platform[] = ['bluesky', 'mastodon', 'linkedin', 'instagram', 'threads'];

export function getPlatformMeta(platform: Platform): PlatformMeta {
  return PLATFORM_META[platform];
}
