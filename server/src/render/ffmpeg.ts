/**
 * Pure builders for the commands that turn a long video into a vertical Short.
 *
 * Kept dependency-free and side-effect-free so they're fully unit-tested; the
 * RenderService decides whether to *run* them (when ffmpeg + a local file are
 * available) or just hand the recipe back to the user to run locally.
 */

export interface ClipSpec {
  /** Local input file (a path) the clip is cut from. */
  input: string;
  /** Output file path. */
  output: string;
  startSeconds: number;
  endSeconds: number;
  /** Target aspect, default vertical 1080×1920 (Shorts/Reels). */
  width?: number;
  height?: number;
}

/** Clip duration in seconds (never negative). */
export function clipDuration(startSeconds: number, endSeconds: number): number {
  return Math.max(0, Math.round((endSeconds - startSeconds) * 100) / 100);
}

/**
 * ffmpeg args to cut [start, end] and reframe to vertical, filling the frame
 * (scale-to-cover then center-crop). `-ss` before `-i` gives a fast seek; `-t`
 * (duration) avoids `-to` ambiguity.
 */
export function buildClipArgs(spec: ClipSpec): string[] {
  const w = spec.width ?? 1080;
  const h = spec.height ?? 1920;
  const duration = clipDuration(spec.startSeconds, spec.endSeconds);
  return [
    '-y',
    '-ss',
    String(spec.startSeconds),
    '-i',
    spec.input,
    '-t',
    String(duration),
    '-vf',
    `scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`,
    '-c:v',
    'libx264',
    '-c:a',
    'aac',
    '-movflags',
    '+faststart',
    spec.output,
  ];
}

/** Shell-quote an argument unless it's made only of shell-safe characters. */
function quote(arg: string): string {
  return /[^A-Za-z0-9@%+=:,.\/_-]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

/** Printable ffmpeg command line for the recipe shown to the user. */
export function buildClipCommand(spec: ClipSpec): string {
  return `ffmpeg ${buildClipArgs(spec).map(quote).join(' ')}`;
}

/** yt-dlp command to download the source video before cutting. */
export function buildDownloadCommand(videoUrl: string, output = 'source.mp4'): string {
  return `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" -o ${quote(output)} ${quote(videoUrl)}`;
}
