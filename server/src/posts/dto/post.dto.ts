import type { MediaAttachment, Platform, PostStatus } from '../../domain/types';

/** Request body for creating a post. */
export interface CreatePostDto {
  platform: Platform;
  body: string;
  scheduledAt: string; // ISO 8601
  status?: PostStatus;
  media?: MediaAttachment[];
}

/** Request body for updating a post (all fields optional). */
export type UpdatePostDto = Partial<CreatePostDto>;
