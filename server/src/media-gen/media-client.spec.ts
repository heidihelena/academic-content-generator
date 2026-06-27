import {
  ElevenLabsVoiceClient,
  HeyGenVideoClient,
  MockVideoClient,
  MockVoiceClient,
  createVideoClient,
  createVoiceClient,
} from './media-client';

const VOICE_CFG = {
  elevenLabsVoiceId: 'voice1',
  elevenLabsModel: 'eleven_multilingual_v2',
};

describe('createVoiceClient', () => {
  it('returns ElevenLabs when provider=elevenlabs and a key is set', () => {
    const c = createVoiceClient({ ...VOICE_CFG, provider: 'elevenlabs', elevenLabsApiKey: 'k' });
    expect(c.name).toBe('elevenlabs');
  });
  it('falls back to mock without a key', () => {
    expect(createVoiceClient({ ...VOICE_CFG, provider: 'elevenlabs' }).name).toBe('mock');
    expect(createVoiceClient({ ...VOICE_CFG, provider: 'mock' }).name).toBe('mock');
  });
});

describe('MockVoiceClient', () => {
  it('returns deterministic placeholder audio without network', async () => {
    const out = await new MockVoiceClient().synthesize({ text: 'Hello world' });
    expect(out.provider).toBe('mock');
    expect(out.contentType).toBe('audio/mpeg');
    expect(out.audioBase64).toBe(await new MockVoiceClient().synthesize({ text: 'Hello world' }).then((r) => r.audioBase64));
  });
});

describe('ElevenLabsVoiceClient', () => {
  const original = global.fetch;
  afterEach(() => (global.fetch = original));

  it('POSTs to /v1/text-to-speech/{voiceId} with xi-api-key and base64s the audio', async () => {
    const calls: Array<{ url: string; init: { headers: Record<string, string>; body: string } }> = [];
    global.fetch = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, init });
      return { ok: true, arrayBuffer: async () => new TextEncoder().encode('AUDIO').buffer };
    }) as unknown as typeof fetch;

    const out = await new ElevenLabsVoiceClient('key', 'voice1', 'model1').synthesize({ text: 'hi' });
    expect(calls[0].url).toBe('https://api.elevenlabs.io/v1/text-to-speech/voice1');
    expect(calls[0].init.headers['xi-api-key']).toBe('key');
    expect(JSON.parse(calls[0].init.body)).toEqual({ text: 'hi', model_id: 'model1' });
    expect(Buffer.from(out.audioBase64, 'base64').toString()).toBe('AUDIO');
  });

  it('throws on a non-ok response (callers fall back)', async () => {
    global.fetch = (async () => ({ ok: false, status: 401 })) as unknown as typeof fetch;
    await expect(new ElevenLabsVoiceClient('k', 'v', 'm').synthesize({ text: 'x' })).rejects.toThrow(/401/);
  });
});

describe('createVideoClient / MockVideoClient', () => {
  it('selects HeyGen with a key, else mock', () => {
    expect(createVideoClient({ provider: 'heygen', heygenApiKey: 'k' }).name).toBe('heygen');
    expect(createVideoClient({ provider: 'heygen' }).name).toBe('mock');
  });
  it('mock returns an immediately-completed job with a url', async () => {
    const job = await new MockVideoClient().generate({ script: 'Trees and heat.' });
    expect(job.status).toBe('completed');
    expect(job.url).toContain('mock://video/');
    expect((await new MockVideoClient().status(job.jobId)).status).toBe('completed');
  });
});

describe('HeyGenVideoClient', () => {
  const original = global.fetch;
  afterEach(() => (global.fetch = original));

  it('generate POSTs /v2/video/generate and returns a queued job from video_id', async () => {
    const calls: Array<{ url: string; init?: { headers: Record<string, string> } }> = [];
    global.fetch = (async (url: string, init?: { headers: Record<string, string> }) => {
      calls.push({ url, init });
      return { ok: true, json: async () => ({ data: { video_id: 'vid_1' } }) };
    }) as unknown as typeof fetch;

    const job = await new HeyGenVideoClient('key', 'av1', 'vo1').generate({ script: 'Hello' });
    expect(calls[0].url).toBe('https://api.heygen.com/v2/video/generate');
    expect(calls[0].init?.headers['x-api-key']).toBe('key');
    expect(job).toMatchObject({ jobId: 'vid_1', status: 'queued', provider: 'heygen' });
  });

  it('status maps completed + video_url', async () => {
    global.fetch = (async () => ({
      ok: true,
      json: async () => ({ data: { status: 'completed', video_url: 'https://cdn/v.mp4' } }),
    })) as unknown as typeof fetch;
    const job = await new HeyGenVideoClient('k').status('vid_1');
    expect(job.status).toBe('completed');
    expect(job.url).toBe('https://cdn/v.mp4');
  });
});
