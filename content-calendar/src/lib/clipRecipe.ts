/**
 * Build the copy-paste recipe (yt-dlp + ffmpeg) that turns a moment of a long
 * video into a vertical Short. Pure + offline — the actual render can also run
 * server-side via /api/render/clip, but the recipe always works locally.
 */
export interface ClipRecipe {
  filename: string;
  durationSeconds: number;
  /** yt-dlp command to download the source (present when a URL is given). */
  download?: string;
  /** ffmpeg command that cuts + reframes to 1080×1920. */
  render: string;
}

function quote(arg: string): string {
  return /[^A-Za-z0-9@%+=:,.\/_-]/.test(arg) ? `"${arg.replace(/"/g, '\\"')}"` : arg;
}

export interface ClipRecipeInput {
  startSeconds: number;
  endSeconds: number;
  videoUrl?: string;
  /** 1-based clip number, used in the output filename. */
  index?: number;
}

export function buildClipRecipe(input: ClipRecipeInput): ClipRecipe {
  const start = Math.max(0, Math.round(input.startSeconds));
  const end = Math.max(start, Math.round(input.endSeconds));
  const duration = end - start;
  const filename = `clip-${input.index ?? 1}_${start}-${end}.mp4`;
  const source = 'source.mp4';

  const render =
    `ffmpeg -y -ss ${start} -i ${source} -t ${duration} ` +
    `-vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" ` +
    `-c:v libx264 -c:a aac -movflags +faststart ${filename}`;

  const download = input.videoUrl
    ? `yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4" -o ${source} ${quote(input.videoUrl)}`
    : undefined;

  return { filename, durationSeconds: duration, download, render };
}
