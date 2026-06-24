/**
 * Deterministic "Sentinel Geometry" cover-art generator for carousel cover
 * slides. Produces an SVG from a seed — no external image service, no network
 * (matches the carousel tool's "never reaches out" rule). Same seed → same art,
 * so a deck regenerates identically.
 */
export interface CoverArtOptions {
  accent: string;
  bg: 'light' | 'navy';
  seed: string;
  width?: number;
  height?: number;
}

function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Small seeded PRNG (mulberry32) — deterministic, no Math.random. */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A scattered field of brand motifs (diamond · brackets · hexagon) in the accent. */
export function generateCoverArt(opts: CoverArtOptions): string {
  const w = opts.width ?? 1080;
  const h = opts.height ?? 1350;
  const next = rng(hashSeed(opts.seed));
  const stroke = opts.accent;
  const shapes: string[] = [];

  for (let i = 0; i < 14; i++) {
    const cx = Math.round(next() * w);
    const cy = Math.round(next() * h);
    const r = Math.round(60 + next() * 220);
    const op = (0.04 + next() * 0.1).toFixed(3);
    const rot = Math.round(next() * 360);
    const kind = Math.floor(next() * 3);

    if (kind === 0) {
      shapes.push(
        `<path d="M${cx} ${cy - r} L${cx + Math.round(r * 0.7)} ${cy} L${cx} ${cy + r} L${cx - Math.round(r * 0.7)} ${cy} Z" ` +
          `fill="none" stroke="${stroke}" stroke-width="3" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`,
      );
    } else if (kind === 1) {
      const g = Math.round(r * 0.5);
      const arm = Math.round(r * 0.25);
      const span = Math.round(r * 1.2);
      const top = cy - Math.round(r * 0.6);
      shapes.push(
        `<g fill="none" stroke="${stroke}" stroke-width="3" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})">` +
          `<path d="M${cx - g} ${top} h${-arm} v${span} h${arm}"/>` +
          `<path d="M${cx + g} ${top} h${arm} v${span} h${-arm}"/></g>`,
      );
    } else {
      const pts = Array.from({ length: 6 }, (_, k) => {
        const a = (Math.PI / 3) * k + (rot * Math.PI) / 180;
        return `${Math.round(cx + r * Math.cos(a))} ${Math.round(cy + r * Math.sin(a))}`;
      }).join(' ');
      shapes.push(`<polygon points="${pts}" fill="none" stroke="${stroke}" stroke-width="3" opacity="${op}"/>`);
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    shapes.join('') +
    `</svg>`
  );
}

/** The cover art as a `data:` URL, ready to drop onto a slide. Self-contained. */
export function coverArtDataUrl(opts: CoverArtOptions): string {
  return 'data:image/svg+xml,' + encodeURIComponent(generateCoverArt(opts));
}
