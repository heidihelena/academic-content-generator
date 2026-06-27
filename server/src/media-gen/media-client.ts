/**
 * Provider-agnostic media generation — voice-over and avatar video — for the
 * talk→shorts pipeline. Same swap-by-config shape as the LLM client: a mock
 * implementation by default (deterministic, offline, zero-cost) and a real
 * provider that activates only when its API key is configured.
 *
 * The real providers (ElevenLabs, HeyGen) are coded to their documented public
 * REST APIs. They are inert until a key is set, and callers should treat a
 * thrown error as "fall back to mock / skip media", so a provider outage or a
 * wrong id never breaks content generation — the same never-fail philosophy as
 * the composers.
 *
 * NOTE: the exact request shapes below follow each vendor's published API but
 * have not been live-verified in this environment (no key, vendor docs behind a
 * bot wall). Verify against your account when you set the key.
 */

// ─── Voice ───────────────────────────────────────────────────────────────────
export interface VoiceRequest {
  text: string;
  /** Override the configured default voice. */
  voiceId?: string;
}

export interface VoiceResult {
  /** Base64-encoded audio bytes. */
  audioBase64: string;
  contentType: string;
  provider: string;
}

export interface VoiceClient {
  readonly name: string;
  synthesize(req: VoiceRequest): Promise<VoiceResult>;
}

/** Deterministic, offline placeholder — a tiny silent stand-in so the pipeline
 *  works with no key/cost. Never throws. */
export class MockVoiceClient implements VoiceClient {
  readonly name = 'mock';
  async synthesize(req: VoiceRequest): Promise<VoiceResult> {
    // A stable, content-derived marker (not real audio) — enough for the UI to
    // show "voice-over ready" offline without calling a paid API.
    const marker = Buffer.from(`mock-voice:${req.text.slice(0, 64)}`).toString('base64');
    return { audioBase64: marker, contentType: 'audio/mpeg', provider: 'mock' };
  }
}

/** ElevenLabs text-to-speech (POST /v1/text-to-speech/{voiceId}). */
export class ElevenLabsVoiceClient implements VoiceClient {
  readonly name = 'elevenlabs';
  constructor(
    private readonly apiKey: string,
    private readonly defaultVoiceId: string,
    private readonly model: string,
    private readonly baseUrl = 'https://api.elevenlabs.io',
  ) {}

  async synthesize({ text, voiceId }: VoiceRequest): Promise<VoiceResult> {
    const id = voiceId ?? this.defaultVoiceId;
    const res = await fetch(`${this.baseUrl}/v1/text-to-speech/${id}`, {
      method: 'POST',
      headers: { 'xi-api-key': this.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: this.model }),
    });
    if (!res.ok) throw new Error(`ElevenLabs TTS failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { audioBase64: buf.toString('base64'), contentType: 'audio/mpeg', provider: 'elevenlabs' };
  }
}

export interface VoiceConfig {
  provider: string;
  elevenLabsApiKey?: string;
  elevenLabsVoiceId: string;
  elevenLabsModel: string;
}

export function createVoiceClient(cfg: VoiceConfig): VoiceClient {
  if (cfg.provider === 'elevenlabs' && cfg.elevenLabsApiKey) {
    return new ElevenLabsVoiceClient(cfg.elevenLabsApiKey, cfg.elevenLabsVoiceId, cfg.elevenLabsModel);
  }
  return new MockVoiceClient();
}

// ─── Video ───────────────────────────────────────────────────────────────────
export interface VideoRequest {
  script: string;
  avatarId?: string;
  voiceId?: string;
}

export type VideoStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoJob {
  jobId: string;
  status: VideoStatus;
  /** Populated once `completed`. */
  url?: string;
  provider: string;
}

export interface VideoClient {
  readonly name: string;
  generate(req: VideoRequest): Promise<VideoJob>;
  status(jobId: string): Promise<VideoJob>;
}

/** Deterministic, offline placeholder — returns an immediately-"completed" job
 *  with a placeholder URL so the pipeline works with no key/cost. */
export class MockVideoClient implements VideoClient {
  readonly name = 'mock';
  async generate(req: VideoRequest): Promise<VideoJob> {
    const jobId = `mock_${Buffer.from(req.script.slice(0, 32)).toString('hex').slice(0, 12)}`;
    return { jobId, status: 'completed', url: `mock://video/${jobId}`, provider: 'mock' };
  }
  async status(jobId: string): Promise<VideoJob> {
    return { jobId, status: 'completed', url: `mock://video/${jobId}`, provider: 'mock' };
  }
}

/** HeyGen avatar video (POST /v2/video/generate → poll /v1/video_status.get). */
export class HeyGenVideoClient implements VideoClient {
  readonly name = 'heygen';
  constructor(
    private readonly apiKey: string,
    private readonly defaultAvatarId?: string,
    private readonly defaultVoiceId?: string,
    private readonly baseUrl = 'https://api.heygen.com',
  ) {}

  async generate({ script, avatarId, voiceId }: VideoRequest): Promise<VideoJob> {
    const res = await fetch(`${this.baseUrl}/v2/video/generate`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [
          {
            character: { type: 'avatar', avatar_id: avatarId ?? this.defaultAvatarId },
            voice: { type: 'text', input_text: script, voice_id: voiceId ?? this.defaultVoiceId },
          },
        ],
        dimension: { width: 1080, height: 1920 }, // vertical, for shorts
      }),
    });
    if (!res.ok) throw new Error(`HeyGen generate failed (${res.status})`);
    const data = (await res.json()) as { data?: { video_id?: string } };
    const jobId = data.data?.video_id;
    if (!jobId) throw new Error('HeyGen generate returned no video_id');
    return { jobId, status: 'queued', provider: 'heygen' };
  }

  async status(jobId: string): Promise<VideoJob> {
    const res = await fetch(`${this.baseUrl}/v1/video_status.get?video_id=${encodeURIComponent(jobId)}`, {
      headers: { 'x-api-key': this.apiKey },
    });
    if (!res.ok) throw new Error(`HeyGen status failed (${res.status})`);
    const data = (await res.json()) as {
      data?: { status?: string; video_url?: string };
    };
    const raw = data.data?.status;
    const status: VideoStatus =
      raw === 'completed' ? 'completed' : raw === 'failed' ? 'failed' : raw === 'processing' ? 'processing' : 'queued';
    return { jobId, status, url: data.data?.video_url, provider: 'heygen' };
  }
}

export interface VideoConfig {
  provider: string;
  heygenApiKey?: string;
  heygenAvatarId?: string;
  heygenVoiceId?: string;
}

export function createVideoClient(cfg: VideoConfig): VideoClient {
  if (cfg.provider === 'heygen' && cfg.heygenApiKey) {
    return new HeyGenVideoClient(cfg.heygenApiKey, cfg.heygenAvatarId, cfg.heygenVoiceId);
  }
  return new MockVideoClient();
}
