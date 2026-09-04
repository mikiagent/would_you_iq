import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local consent record for sending syllabus content to the AI
// provider (App Review Guideline 5.1.2(i)). It is kept out of cloud sync and
// cleared at sign-out so another account on the device must consent itself.
const AI_CONSENT_KEY = 'wouldyouiq-ai-consent-v1';

export const AI_CONSENT_VERSION = 2;

export type AiConsentRecord = {
  version: number;
  acceptedAt: string;
};

export async function getAiConsent(): Promise<AiConsentRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiConsentRecord;
    if (parsed.version !== AI_CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function grantAiConsent(): Promise<AiConsentRecord> {
  const record: AiConsentRecord = {
    version: AI_CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(AI_CONSENT_KEY, JSON.stringify(record));
  return record;
}

export async function clearAiConsent(): Promise<void> {
  await AsyncStorage.removeItem(AI_CONSENT_KEY);
}
