import type { MediaAttachment } from '../domain/types';

export const STORAGE_SERVICE = Symbol('STORAGE_SERVICE');

/** A file handed to the storage layer (from multer's in-memory upload). */
export interface UploadFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

/**
 * Object-storage contract. Implementations persist an uploaded file and return a
 * publicly reachable URL. The local-disk default is swappable for S3/Cloudinary
 * via STORAGE_DRIVER with no changes to the controller.
 */
export interface StorageService {
  save(file: UploadFile): Promise<MediaAttachment>;
}

/** Maps a MIME type to our media kind; throws on unsupported types. */
export function mediaTypeFor(mimeType: string): MediaAttachment['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  throw new Error(`Unsupported media type: ${mimeType}`);
}
