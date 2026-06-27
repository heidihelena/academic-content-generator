import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { MediaAttachment } from '../domain/types';
import { mediaTypeFor, type StorageService, type UploadFile } from './storage.types';

/**
 * S3 storage (selected with STORAGE_DRIVER=s3).
 *
 * // --- REAL API INTEGRATION POINT -----------------------------------------
 * // Requires the AWS SDK (loaded dynamically so it stays optional):
 * //   npm install @aws-sdk/client-s3
 * // and S3_BUCKET / S3_REGION (+ standard AWS credentials in the environment),
 * // plus S3_PUBLIC_BASE_URL (bucket/CDN base) to build the returned URL.
 * // ------------------------------------------------------------------------
 */
@Injectable()
export class S3Storage implements StorageService {
  constructor(private readonly config: ConfigService) {}

  async save(file: UploadFile): Promise<MediaAttachment> {
    const bucket = this.config.get<string>('storage.s3.bucket');
    const region = this.config.get<string>('storage.s3.region');
    const publicBase = this.config.get<string>('storage.s3.publicBaseUrl');
    if (!bucket || !region || !publicBase) {
      throw new Error('S3 storage requires S3_BUCKET, S3_REGION and S3_PUBLIC_BASE_URL');
    }

    const key = `${randomUUID()}${extname(file.originalName)}`;

    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const client = new S3Client({ region });
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return {
      id: `media_${randomUUID()}`,
      type: mediaTypeFor(file.mimeType),
      label: file.originalName,
      url: `${publicBase.replace(/\/$/, '')}/${key}`,
    };
  }
}
