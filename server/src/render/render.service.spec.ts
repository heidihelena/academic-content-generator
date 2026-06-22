import { BadRequestException } from '@nestjs/common';
import { RenderService } from './render.service';

describe('RenderService.render', () => {
  it('returns a recipe (download + ffmpeg) when there is no local source', async () => {
    const service = new RenderService();
    const plan = await service.render({
      videoUrl: 'https://youtu.be/abc',
      startSeconds: 90,
      endSeconds: 132,
    });
    expect(plan.status).toBe('recipe');
    expect(plan.durationSeconds).toBe(42);
    expect(plan.download).toMatch(/^yt-dlp /);
    expect(plan.render).toMatch(/^ffmpeg /);
  });

  it('omits the download step when no URL is given', async () => {
    const plan = await new RenderService().render({ startSeconds: 0, endSeconds: 10 });
    expect(plan.download).toBeUndefined();
    expect(plan.render).toContain('-t 10');
  });

  it('rejects an invalid range', async () => {
    await expect(new RenderService().render({ startSeconds: 30, endSeconds: 10 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
