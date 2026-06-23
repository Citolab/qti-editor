// localStorage keys mirror upstream @prosekit/ai examples so a user who has
// configured the Prosekit demo keeps their endpoint/key/model here.
const API_KEY_STORAGE_KEY = 'prosekit-stream-content-api-key';
const MODEL_STORAGE_KEY = 'prosekit-stream-content-model';
const ENDPOINT_STORAGE_KEY = 'prosekit-stream-content-endpoint';

export const DEFAULT_MODEL = 'gpt-4o-mini';

function read(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export const aiSettings = {
  getApiKey: () => read(API_KEY_STORAGE_KEY),
  getEndpoint: () => read(ENDPOINT_STORAGE_KEY),
  getModel: () => read(MODEL_STORAGE_KEY, DEFAULT_MODEL) || DEFAULT_MODEL,
  setApiKey: (v: string) => write(API_KEY_STORAGE_KEY, v),
  setEndpoint: (v: string) => write(ENDPOINT_STORAGE_KEY, v),
  setModel: (v: string) => write(MODEL_STORAGE_KEY, v),
};

export function ensureConfigured(): boolean {
  if (aiSettings.getApiKey() && aiSettings.getEndpoint()) return true;
  if (typeof window !== 'undefined') {
    window.alert(
      'No API endpoint or key found. Open the AI settings (gear icon) and configure both.'
    );
  }
  return false;
}
