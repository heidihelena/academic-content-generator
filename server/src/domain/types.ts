/**
 * Server-side domain model. Mirrors the frontend's types so the same shapes flow
 * end-to-end. This is the single source of truth for the backend.
 */

export type Platform = 'instagram' | 'linkedin' | 'threads';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  label: string;
  url?: string;
}

export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

export interface Post {
  id: string;
  platform: Platform;
  body: string;
  scheduledAt: string; // ISO 8601
  status: PostStatus;
  media: MediaAttachment[];
  engagement?: PostEngagement;
  /** Platform-native id + permalink once published. */
  remoteId?: string;
  permalink?: string;
  /** Set when status === 'failed'. */
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedAccount {
  platform: Platform;
  status: ConnectionStatus;
  handle?: string;
  displayName?: string;
  followers?: number;
  lastSyncedAt?: string;
  statusDetail?: string;
}

/** OAuth token bundle persisted server-side (NEVER in the vault). */
export interface AccessToken {
  platform: Platform;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
  scopes: string[];
  /** Platform-native account id / URN used when publishing (e.g. IG user id,
   *  LinkedIn person URN). Captured during the OAuth handshake. */
  accountId?: string;
}

/** A chunk of vault content with its embedding, for semantic retrieval. */
export interface VaultChunk {
  id: string;
  /** Source file path relative to the vault root. */
  source: string;
  /** Heading/section title if available. */
  title?: string;
  content: string;
  /** Content hash, used to skip re-embedding unchanged chunks. */
  hash: string;
}

export interface VaultSearchResult extends VaultChunk {
  /** Cosine similarity score in [0, 1]. */
  score: number;
}
