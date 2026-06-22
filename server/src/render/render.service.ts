import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { access } from 'fs/promises';
import { promisify } from 'util';
import {
  buildClipArgs,
  buildClipCommand,
  buildDownloadCommand,
  clipDuration,
} from './ffmpeg';

const execFileAsync = promisify(execFile);

export interface RenderRequest {
  /** Source video URL (for the download recipe). */
  videoUrl?: string;
  /** Local source file to cut from, when the server already has the video. */
  input?: string;
  startSeconds: number;
  endSeconds: number;
  /** Output path; defaults to a temp-ish name derived from the range. */
  output?: string;
}

export interface RenderPlan {
  /** 'rendered' when the server produced the file; 'recipe' when it handed back commands. */
  status: 'rendered' | 'recipe';
  durationSeconds: number;
  /** yt-dlp command to fetch the source (present when a URL was given). */
  download?: string;
  /** ffmpeg command that cuts the vertical clip. */
  render: string;
  /** Output file path (present when status === 'rendered'). */
  output?: string;
  note: string;
}

/**
 * Produces a vertical clip. Real rendering needs ffmpeg *and* the source file on
 * the server, which most deployments won't have — so the honest default is to
 * return the exact recipe (yt-dlp + ffmpeg) for the user to run locally. When a
 * local `input` exists and ffmpeg is installed, it renders for real and verifies
 * the output was written (verify-or-redo).
 */
@Injectable()
export class RenderService {
  private readonly logger = new Logger(RenderService.name);

  async ffmpegAvailable(): Promise<boolean> {
    try {
      await execFileAsync('ffmpeg', ['-version']);
      return true;
    } catch {
      return false;
    }
  }

  async render(req: RenderRequest): Promise<RenderPlan> {
    if (req.startSeconds == null || req.endSeconds == null || req.endSeconds <= req.startSeconds) {
      throw new BadRequestException('A clip needs a start before its end.');
    }
    const duration = clipDuration(req.startSeconds, req.endSeconds);
    const output = req.output ?? `clip_${Math.round(req.startSeconds)}-${Math.round(req.endSeconds)}.mp4`;
    const input = req.input ?? 'source.mp4';

    const download = req.videoUrl ? buildDownloadCommand(req.videoUrl, input) : undefined;
    const renderCmd = buildClipCommand({ input, output, startSeconds: req.startSeconds, endSeconds: req.endSeconds });

    // Only attempt a real render when we already have the source on disk + ffmpeg.
    const haveInput = req.input ? await this.fileExists(req.input) : false;
    if (haveInput && (await this.ffmpegAvailable())) {
      try {
        await execFileAsync('ffmpeg', buildClipArgs({ input, output, startSeconds: req.startSeconds, endSeconds: req.endSeconds }));
        if (await this.fileExists(output)) {
          return { status: 'rendered', durationSeconds: duration, render: renderCmd, output, note: 'Rendered a vertical clip.' };
        }
      } catch (err) {
        this.logger.warn(`Render failed, returning recipe: ${err instanceof Error ? err.message : err}`);
      }
    }

    return {
      status: 'recipe',
      durationSeconds: duration,
      download,
      render: renderCmd,
      note: download
        ? 'Run these two commands locally (needs yt-dlp + ffmpeg) to produce the vertical clip.'
        : 'Run this locally (needs ffmpeg) on your downloaded video to produce the vertical clip.',
    };
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }
}
