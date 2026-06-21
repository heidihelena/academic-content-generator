import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MediaAttachment } from '../domain/types';
import { STORAGE_SERVICE, mediaTypeFor, type StorageService } from './storage.types';

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

@Controller('media')
export class MediaController {
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  /** POST /api/media/upload (multipart, field name "file") → MediaAttachment. */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES } }))
  async upload(@UploadedFile() file?: any): Promise<MediaAttachment> {
    if (!file) throw new BadRequestException('No file uploaded (field "file")');
    try {
      mediaTypeFor(file.mimetype); // validates image/* or video/*
    } catch {
      throw new BadRequestException('Only image/* and video/* uploads are supported');
    }
    return this.storage.save({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }
}
