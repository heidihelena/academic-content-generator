/** Frontend types for the talk-package "magic button" (mirrors the backend). */

export const TALK_AUDIENCES = ['peers', 'students', 'patients', 'public'] as const;
export type TalkAudience = (typeof TALK_AUDIENCES)[number];

export interface TalkPackageRequest {
  title: string;
  abstract: string;
  audience: TalkAudience;
  /** Target talk length in minutes (drives the number of points/shorts). */
  durationMin: number;
  url?: string;
}

export interface TalkPiece {
  channel: 'talk' | 'shorts';
  body: string;
}

export interface TalkReview {
  cleared: boolean;
  findings: string[];
}

export interface TalkPackage {
  source: 'local' | 'api';
  estimatedMinutes: number;
  talk: TalkPiece;
  shorts: TalkPiece[];
  review: TalkReview;
  /** Present in API mode — enables vault export of the persisted campaign. */
  campaignId?: string;
  /** What was already generated from this source (cross-campaign reuse). */
  prior: string[];
}

export interface TalkPackageClient {
  readonly name: string;
  generate(request: TalkPackageRequest): Promise<TalkPackage>;
  /** Export the package's campaign to the Obsidian vault. API mode only. */
  exportToVault(pkg: TalkPackage): Promise<{ paths: string[] }>;
}
