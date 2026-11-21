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

export const MODELS = ['MiMo', 'Deepseek', 'Rym'] as const;
export type ModelName = (typeof MODELS)[number];

export const THEMES = ['light', 'dark'] as const;
export type ThemeMode = (typeof THEMES)[number];

export const DENSITIES = ['comfortable', 'compact'] as const;
export type DensityMode = (typeof DENSITIES)[number];

export type UiPrefs = {
  language: 'zh' | 'en';
  theme: ThemeMode;
  quality: AnimationQuality;
  pageTransition: boolean;
  density: DensityMode;
  provider: string;
  defaultModel: ModelName;
  workspaceName: string;
};

export const DEFAULT_PREFS: UiPrefs = {
  language: 'zh',
  theme: 'light',
  quality: 'medium',
  pageTransition: true,
  density: 'comfortable',
  provider: 'Local',
  defaultModel: 'MiMo',
  workspaceName: 'GSC Workspace',
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
      language: parsed.language === 'en' ? 'en' : 'zh',
      theme: parsed.theme === 'dark' ? 'dark' : DEFAULT_PREFS.theme,
      quality: ANIMATION_QUALITIES.includes(parsed.quality as AnimationQuality)
        ? (parsed.quality as AnimationQuality)
        : DEFAULT_PREFS.quality,
      pageTransition: typeof parsed.pageTransition === 'boolean' ? parsed.pageTransition : DEFAULT_PREFS.pageTransition,
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      provider: typeof parsed.provider === 'string' && parsed.provider ? parsed.provider : DEFAULT_PREFS.provider,
      defaultModel: (MODELS as readonly string[]).includes(parsed.defaultModel as string)
        ? (parsed.defaultModel as ModelName)
        : DEFAULT_PREFS.defaultModel,
      workspaceName: typeof parsed.workspaceName === 'string' && parsed.workspaceName.trim()
        ? parsed.workspaceName
        : DEFAULT_PREFS.workspaceName,
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

/* Per-page view mode (list ⇄ grid) — persisted separately so each page
   remembers its own choice. (网格视角) */
export type ViewMode = 'list' | 'grid';

const VIEW_MODE_KEY = 'gsc.ui.viewmode.v1';

export function loadViewMode(page: string): ViewMode {
  if (!hasStorage()) return 'list';
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    if (!raw) return 'list';
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed[page] === 'grid' ? 'grid' : 'list';
  } catch {
    return 'list';
  }
}

export function saveViewMode(page: string, mode: ViewMode): void {
  if (!hasStorage()) return;
  try {
    const raw = localStorage.getItem(VIEW_MODE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[page] = mode;
    localStorage.setItem(VIEW_MODE_KEY, JSON.stringify(parsed));
  } catch {
    /* in-memory for this session */
  }
}
