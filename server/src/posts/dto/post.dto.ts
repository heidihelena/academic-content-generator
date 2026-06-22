import type {
  EvidenceLevel,
  MediaAttachment,
  Platform,
  PostStatus,
  ReviewEntry,
  Source,
} from '../../domain/types';

/** Request body for creating a post. */
export interface CreatePostDto {
  /** Optional client-supplied id, honored so optimistic UIs keep stable ids. */
  id?: string;
  platform: Platform;
  body: string;
  scheduledAt: string; // ISO 8601
  status?: PostStatus;
  media?: MediaAttachment[];
  owner?: string;
  campaign?: string;
  brief?: string;
  audience?: string;
  theme?: string;
  hook?: string;
  source?: Source;
  evidenceLevel?: EvidenceLevel;
  reviewer?: string;
  reviews?: ReviewEntry[];
}

/** Request body for updating a post (all fields optional). */
export type UpdatePostDto = Partial<CreatePostDto>;
