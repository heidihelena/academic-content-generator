/**
 * Voice Profiles — reusable writing voices the researcher applies in the Draft
 * Studio. Purely local data (stored in the browser, never sent anywhere unless
 * a draft composed with one is sent to a configured LLM provider).
 */

export const VOICE_FORMALITIES = ['informal', 'balanced', 'formal'] as const;
export type VoiceFormality = (typeof VOICE_FORMALITIES)[number];

export const VOICE_LENGTHS = ['short', 'medium', 'long'] as const;
export type VoiceLength = (typeof VOICE_LENGTHS)[number];

export const VOICE_LANGUAGES = ['en', 'fi', 'sv', 'da', 'no', 'de'] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

export const VOICE_LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  en: 'English',
  fi: 'Finnish',
  sv: 'Swedish',
  da: 'Danish',
  no: 'Norwegian',
  de: 'German',
};

export interface VoiceProfile {
  id: string;
  name: string;
  /** One-line description of the tone, e.g. "measured, evidence-first". */
  tone: string;
  /** Who this voice speaks to, e.g. "clinician peers". */
  audience: string;
  language: VoiceLanguage;
  formality: VoiceFormality;
  preferredLength: VoiceLength;
  /** Words and phrases this voice never uses. */
  wordsToAvoid: string[];
  /** Short example sentences that capture the voice. */
  styleExamples: string[];
  createdAt: string;
  updatedAt: string;
}

export type VoiceProfileInput = Omit<VoiceProfile, 'id' | 'createdAt' | 'updatedAt'>;

/** The six starting voices — editable, deletable, restorable from Settings. */
export function seedVoiceProfiles(now = '2026-01-01T00:00:00.000Z'): VoiceProfile[] {
  const base = { createdAt: now, updatedAt: now };
  return [
    {
      ...base,
      id: 'voice_researcher',
      name: 'Researcher voice',
      tone: 'Measured and evidence-first; comfortable with uncertainty.',
      audience: 'Researchers and academic peers',
      language: 'en',
      formality: 'formal',
      preferredLength: 'medium',
      wordsToAvoid: ['game-changer', 'breakthrough', 'revolutionary'],
      styleExamples: ['The effect was consistent across sites, though the confidence interval is wide.'],
    },
    {
      ...base,
      id: 'voice_clinician_teacher',
      name: 'Clinician teacher voice',
      tone: 'Warm, structured, example-driven; explains the why behind practice.',
      audience: 'Clinicians in training and colleagues',
      language: 'en',
      formality: 'balanced',
      preferredLength: 'medium',
      wordsToAvoid: ['obviously', 'simply', 'just remember'],
      styleExamples: ['A useful way to think about this at the bedside: what would change your management?'],
    },
    {
      ...base,
      id: 'voice_patient_safe',
      name: 'Patient-safe voice',
      tone: 'Plain language, honest about uncertainty, never advises individuals.',
      audience: 'Patients and the general public',
      language: 'en',
      formality: 'balanced',
      preferredLength: 'short',
      wordsToAvoid: ['cure', 'guaranteed', 'miracle', 'you should take'],
      styleExamples: ['Research like this takes time to change care. If you have questions, your own clinician knows your situation best.'],
    },
    {
      ...base,
      id: 'voice_nordic_academic',
      name: 'Nordic academic voice',
      tone: 'Understated, precise, collegial; lets the finding speak for itself.',
      audience: 'Nordic academic and clinical networks',
      language: 'sv',
      formality: 'formal',
      preferredLength: 'medium',
      wordsToAvoid: ['thrilled', 'humbled', 'excited to announce'],
      styleExamples: ['Resultaten är preliminära men pekar i samma riktning som tidigare studier.'],
    },
    {
      ...base,
      id: 'voice_linkedin_reflective',
      name: 'LinkedIn reflective voice',
      tone: 'First-person, reflective, one clear takeaway per post.',
      audience: 'Professional network beyond the field',
      language: 'en',
      formality: 'balanced',
      preferredLength: 'medium',
      wordsToAvoid: ['hustle', 'crushing it', '🚀'],
      styleExamples: ['Ten years into this work, the finding that still surprises me is how much context matters.'],
    },
    {
      ...base,
      id: 'voice_short_direct',
      name: 'Short direct voice',
      tone: 'Compact and concrete; one idea, no throat-clearing.',
      audience: 'Busy readers on fast channels',
      language: 'en',
      formality: 'informal',
      preferredLength: 'short',
      wordsToAvoid: ['in this thread', 'a thread 🧵', 'let that sink in'],
      styleExamples: ['New data: tree cover tracks street temperature. The gap is largest in low-income areas.'],
    },
  ];
}
