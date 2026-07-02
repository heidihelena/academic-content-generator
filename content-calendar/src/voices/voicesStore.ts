import { useSyncExternalStore } from 'react';
import { seedVoiceProfiles, type VoiceProfile, type VoiceProfileInput } from './voiceTypes';

/**
 * Voice profile store — localStorage-backed so profiles survive restarts, with
 * a subscription so every screen (Voice Profiles, Draft Studio) stays in sync.
 * Stays local: profiles are never sent anywhere by this module.
 */

const STORAGE_KEY = 'forskai.voiceProfiles.v1';

let profiles: VoiceProfile[] | null = null;
const listeners = new Set<() => void>();

function load(): VoiceProfile[] {
  if (profiles) return profiles;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as VoiceProfile[]) : null;
    profiles = Array.isArray(parsed) ? parsed : seedVoiceProfiles();
  } catch {
    profiles = seedVoiceProfiles();
  }
  return profiles;
}

function save(next: VoiceProfile[]): void {
  profiles = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota/private-mode failures are fine — the in-memory copy still works.
  }
  listeners.forEach((fn) => fn());
}

export function listVoiceProfiles(): VoiceProfile[] {
  return load();
}

export function getVoiceProfile(id: string): VoiceProfile | undefined {
  return load().find((p) => p.id === id);
}

export function createVoiceProfile(input: VoiceProfileInput): VoiceProfile {
  const now = new Date().toISOString();
  const profile: VoiceProfile = { ...input, id: `voice_${Date.now().toString(36)}`, createdAt: now, updatedAt: now };
  save([...load(), profile]);
  return profile;
}

export function updateVoiceProfile(id: string, patch: Partial<VoiceProfileInput>): VoiceProfile | undefined {
  let updated: VoiceProfile | undefined;
  save(
    load().map((p) => {
      if (p.id !== id) return p;
      updated = { ...p, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }),
  );
  return updated;
}

export function deleteVoiceProfile(id: string): void {
  save(load().filter((p) => p.id !== id));
}

/** Restore the six starting voices (keeps any custom profiles). */
export function restoreSeedVoiceProfiles(): void {
  const current = load();
  const missing = seedVoiceProfiles().filter((seed) => !current.some((p) => p.id === seed.id));
  if (missing.length > 0) save([...current, ...missing]);
}

/** Reset the store (tests). */
export function resetVoiceProfiles(next?: VoiceProfile[]): void {
  save(next ?? seedVoiceProfiles());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** React hook: the live profile list. */
export function useVoiceProfiles(): VoiceProfile[] {
  return useSyncExternalStore(subscribe, load, load);
}
