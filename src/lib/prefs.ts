export type AnimationQuality = 'off' | 'low' | 'medium' | 'high' | 'max';

export const ANIMATION_QUALITIES: readonly AnimationQuality[] = ['off', 'low', 'medium', 'high', 'max'];

export const QUALITY_LABELS: Record<AnimationQuality, string> = {
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  max: 'Max',
};

export const COMPOSER_MODES = ['ask', 'agent', 'edit'] as const;
export type ComposerMode = (typeof COMPOSER_MODES)[number];

export const MODELS = ['Deepseek', 'Rym'] as const;
export type ModelName = (typeof MODELS)[number];

export type UiPrefs = {
  quality: AnimationQuality;
  pageTransition: boolean;
  provider: string;
  defaultModel: ModelName;
};

export const DEFAULT_PREFS: UiPrefs = {
  quality: 'medium',
  pageTransition: true,
  provider: 'Local',
  defaultModel: 'Deepseek',
};

const STORAGE_KEY = 'gsc.ui.prefs.v1';

function hasStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadPrefs(): UiPrefs {
  if (!hasStorage()) return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      quality: ANIMATION_QUALITIES.includes(parsed.quality as AnimationQuality)
        ? (parsed.quality as AnimationQuality)
        : DEFAULT_PREFS.quality,
      pageTransition: typeof parsed.pageTransition === 'boolean' ? parsed.pageTransition : DEFAULT_PREFS.pageTransition,
      provider: typeof parsed.provider === 'string' && parsed.provider ? parsed.provider : DEFAULT_PREFS.provider,
      defaultModel: parsed.defaultModel === 'Rym' ? 'Rym' : DEFAULT_PREFS.defaultModel,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs: UiPrefs): void {
  if (!hasStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable; preferences stay in-memory for this session */
  }
}
