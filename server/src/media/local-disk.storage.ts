import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import type { MediaAttachment } from '../domain/types';
import { mediaTypeFor, type StorageService, type UploadFile } from './storage.types';

/**
 * Stores uploads on local disk and serves them statically from `/uploads`
 * (wired in main.ts via useStaticAssets). Good for dev and single-host deploys.
 *
 * NOTE: the returned URL uses PUBLIC_BASE_URL — for real platform publishing it
 * must be reachable by the platform's servers (i.e. not `localhost`). Use the S3
 * driver (or a public host/CDN) in production.
 */
@Injectable()
export class LocalDiskStorage implements StorageService {
  constructor(private readonly config: ConfigService) {
    mkdirSync(this.config.get<string>('storage.uploadsDir')!, { recursive: true });
  }

  async save(file: UploadFile): Promise<MediaAttachment> {
    const dir = this.config.get<string>('storage.uploadsDir')!;
    const base = this.config.get<string>('storage.publicBaseUrl')!;
    const ext = extname(file.originalName) || `.${file.mimeType.split('/')[1] ?? 'bin'}`;
    const key = `${randomUUID()}${ext}`;
    await writeFile(join(dir, key), file.buffer);
    return {
      id: `media_${randomUUID()}`,
      type: mediaTypeFor(file.mimeType),
      label: file.originalName,
      url: `${base.replace(/\/$/, '')}/uploads/${key}`,
    };
  }
}
