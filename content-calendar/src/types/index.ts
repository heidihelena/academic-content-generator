/**
 * Core domain types for the content calendar.
 *
 * Owned by the Architecture & Data Agent. These types are the single source of
 * truth that every other layer (UI, AI, integrations, tests) depends on, so
 * they are intentionally framework-agnostic and free of React/DOM concerns.
 */

/**
 * Social platforms the product supports. Extend this union to add platforms.
 * Includes the scholarly networks (Bluesky, Mastodon) where academic
 * communities have largely migrated, alongside LinkedIn for professional reach.
 */
export type Platform = 'bluesky' | 'mastodon' | 'linkedin' | 'instagram' | 'threads' | 'youtube';

/**
 * Lifecycle of a post as it moves through the editorial pipeline:
 * Brief → Drafting → Review → Approved → Scheduled → Published → Learn
 * (`failed` is a publish error that surfaces alongside Scheduled).
 *
 * The legacy names `draft`/`scheduled`/`published`/`failed` are preserved so the
 * scheduler, analytics and persisted data keep working; `draft` is shown as
 * "Drafting" in the UI.
 */
export type PostStatus =
  | 'brief'
  | 'draft'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'learn'
  | 'failed';

/** A media attachment placeholder. Real uploads would carry a CDN URL + size. */
export interface MediaAttachment {
  id: string;
  type: 'image' | 'video';
  /** Placeholder label shown in the editor until real upload is wired up. */
  label: string;
  /** Optional remote URL once a real media pipeline exists. */
  url?: string;
}

/** A single planned/published social media post. */
export interface Post {
  id: string;
  platform: Platform;
  /** The caption / body text of the post. */
  body: string;
  /** ISO 8601 datetime string for the scheduled publish time. */
  scheduledAt: string;
  status: PostStatus;
  media: MediaAttachment[];
  /** Person responsible for this post (free-text name today; a User ref later). */
  owner?: string;
  /** Campaign this post belongs to (free-text name today; a Campaign ref later). */
  campaign?: string;
  /** Brief: the assignment — objective / why this post exists. */
  brief?: string;
  /** Brief: who this is for. */
  audience?: string;
  /** Theme / content pillar this post ladders up to. */
  theme?: string;
  /** Hook: the scroll-stopping opening line. */
  hook?: string;
  /** The paper / preprint / dataset this post communicates. */
  source?: Source;
  /** How well-supported the post's central claim is. */
  evidenceLevel?: EvidenceLevel;
  /** Currently assigned reviewer (free-text name today; a User ref later). */
  reviewer?: string;
  /** Review history (approvals / change requests), newest last. */
  reviews?: ReviewEntry[];
  /** Mock engagement metrics, populated for published posts. */
  engagement?: PostEngagement;
  /** Posts in one thread share a threadId; threadIndex is the 0-based order. */
  threadId?: string;
  threadIndex?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * How well-supported the claim in a post is. This is the academic spine of the
 * tool: it pairs with `Source` so a researcher (and their reviewer) can see at a
 * glance whether a post states an opinion, reports preliminary work, or
 * communicates peer-reviewed findings.
 */
export type EvidenceLevel = 'opinion' | 'preliminary' | 'peer_reviewed';

/**
 * A structured citation linked to a post — the paper, dataset, or preprint the
 * post is about. Free-text today; a CrossRef/DOI lookup can populate it later.
 */
export interface Source {
  /** Article / work title. */
  title?: string;
  /** Authors, as a display string (e.g. "Andersen H, et al."). */
  authors?: string;
  /** Publication year. */
  year?: number;
  /** Journal, conference, or repository (e.g. "Nature", "arXiv", "OSF"). */
  venue?: string;
  /** Digital Object Identifier, e.g. "10.1038/s41586-024-00001-2". */
  doi?: string;
  /** Canonical link (DOI URL, preprint, or landing page). */
  url?: string;
}

/** Engagement metrics surfaced in analytics (mock data today, API data later). */
export interface PostEngagement {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
}

/** Outcome of a review on a post. */
export type ReviewDecision = 'approved' | 'changes_requested';

/** A single entry in a post's review history. */
export interface ReviewEntry {
  id: string;
  decision: ReviewDecision;
  /** Who reviewed (free-text name today; a User ref later). */
  reviewer?: string;
  /** Required for "request changes" — what needs fixing. */
  note?: string;
  /** ISO datetime the decision was recorded. */
  at: string;
}

/** Connection state of a social account in the connected-accounts panel. */
export type ConnectionStatus = 'connected' | 'disconnected' | 'expired' | 'error';

/** A user's connection to a single social platform account. */
export interface ConnectedAccount {
  platform: Platform;
  status: ConnectionStatus;
  /** Display handle, e.g. "@vahtian". Undefined when disconnected. */
  handle?: string;
  displayName?: string;
  avatarUrl?: string;
  followers?: number;
  /** ISO datetime of the last successful sync with the platform API. */
  lastSyncedAt?: string;
  /** Human-readable detail for error/expired states. */
  statusDetail?: string;
}

/** The platform filter selection on the calendar. `null` = show all. */
export type PlatformFilter = Platform | 'all';

/** Per-platform metadata (labels, colors, character limits) used across the UI. */
export interface PlatformMeta {
  id: Platform;
  name: string;
  /** Hard character limit enforced by the real platform. */
  characterLimit: number;
  /** Tailwind color token + hex for badges/charts. */
  color: string;
  handlePrefix: string;
}

/** Draft payload used when creating or editing a post in the editor modal. */
export interface PostDraft {
  id?: string;
  platform: Platform;
  body: string;
  scheduledAt: string;
  status: PostStatus;
  media: MediaAttachment[];
  owner?: string;
  campaign?: string;
  brief?: string;
  audience?: string;
  theme?: string;
  hook?: string;
  source?: Source;
  evidenceLevel?: EvidenceLevel;
  reviewer?: string;
}

/** Calendar canvas view granularity. */
export type CalendarView = 'month' | 'week' | 'day';

/**
 * Capability flags (permissionsState). Defaults to all-true; a real role system
 * would compute these from the signed-in user so the UI can gate create/edit/
 * delete/publish/bulk actions without touching component logic.
 */
export interface Permissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canBulk: boolean;
}

