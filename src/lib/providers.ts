/**
 * LLM provider profiles — shared by the Settings → Model UI and the server LLM
 * adapter. "Different providers require different things" is encoded here:
 * auth header style, required body extras, default endpoint, model presets and
 * key format. Pure data + pure functions; importable from both client and server.
 */

export type ProviderId =
  | 'mimo'
  | 'deepseek'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'kimi'
  | 'qwen'
  | 'zhipu'
  | 'grok'
  | 'custom';

/** How each provider expects to be authenticated on its OpenAI-compatible endpoint. */
export type AuthStyle = 'bearer' | 'mimo' | 'claude' | 'google';

export type ProviderProfile = {
  id: ProviderId;
  /** Default OpenAI-compatible base URL (no trailing /chat/completions). */
  defaultBase: string;
  /** Known-good model ids for this provider (UI presets). */
  models: string[];
  /** Auth header style — see authHeadersFor. */
  auth: AuthStyle;
  /** Language-neutral key format hint, e.g. 'sk-…' or 'id.secret'. */
  keyExample: string;
  /** Where to mint an API key (Settings link). */
  consoleUrl: string;
  /** UI metadata (labels live in strings.ts). */
  brand: 'mimo' | 'deepseek' | 'openai' | 'claude' | 'gemini' | 'kimi' | 'qwen' | 'zhipu' | 'grok' | null;
  labelKey: string;
  descKey: string;
  /** i18n key for a provider-specific note (auth quirks), if any. */
  noteKey?: string;
};

export const PROVIDERS: ProviderProfile[] = [
  {
    id: 'mimo',
    defaultBase: 'https://token-plan-cn.xiaomimimo.com/v1',
    models: ['mimo-v2.6-flash', 'mimo-v2.6-pro', 'mimo-v2.6-pro-ultraspeed'],
    auth: 'mimo',
    keyExample: 'tp-…',
    consoleUrl: 'https://mimo.mi.com',
    brand: 'mimo',
    labelKey: 'model.providerMimo',
    descKey: 'model.providerMimoDesc',
    noteKey: 'model.noteMimo',
  },
  {
    id: 'deepseek',
    defaultBase: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    auth: 'bearer',
    keyExample: 'sk-…',
    consoleUrl: 'https://platform.deepseek.com/api_keys',
    brand: 'deepseek',
    labelKey: 'model.providerDeepseek',
    descKey: 'model.providerDeepseekDesc',
  },
  {
    id: 'openai',
    defaultBase: 'https://api.openai.com/v1',
    models: ['gpt-5', 'gpt-5-mini', 'gpt-4o'],
    auth: 'bearer',
    keyExample: 'sk-…',
    consoleUrl: 'https://platform.openai.com/api-keys',
    brand: 'openai',
    labelKey: 'model.providerOpenai',
    descKey: 'model.providerOpenaiDesc',
  },
  {
    id: 'claude',
    defaultBase: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5', 'claude-opus-4-1', 'claude-haiku-4-5'],
    auth: 'claude',
    keyExample: 'sk-ant-…',
    consoleUrl: 'https://console.anthropic.com/settings/keys',
    brand: 'claude',
    labelKey: 'model.providerClaude',
    descKey: 'model.providerClaudeDesc',
    noteKey: 'model.noteClaude',
  },
  {
    id: 'gemini',
    defaultBase: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash'],
    auth: 'google',
    keyExample: 'AIza…',
    consoleUrl: 'https://aistudio.google.com/apikey',
    brand: 'gemini',
    labelKey: 'model.providerGemini',
    descKey: 'model.providerGeminiDesc',
    noteKey: 'model.noteGemini',
  },
  {
    id: 'kimi',
    defaultBase: 'https://api.moonshot.cn/v1',
    models: ['kimi-k2-0711-preview', 'moonshot-v1-128k'],
    auth: 'bearer',
    keyExample: 'sk-…',
    consoleUrl: 'https://platform.moonshot.cn/console/api-keys',
    brand: 'kimi',
    labelKey: 'model.providerKimi',
    descKey: 'model.providerKimiDesc',
  },
  {
    id: 'qwen',
    defaultBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    auth: 'bearer',
    keyExample: 'sk-…',
    consoleUrl: 'https://bailian.console.aliyun.com/?apiKey=1',
    brand: 'qwen',
    labelKey: 'model.providerQwen',
    descKey: 'model.providerQwenDesc',
    noteKey: 'model.noteQwen',
  },
  {
    id: 'zhipu',
    defaultBase: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4.6', 'glm-4.5-air'],
    auth: 'bearer',
    keyExample: 'id.secret',
    consoleUrl: 'https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys',
    brand: 'zhipu',
    labelKey: 'model.providerZhipu',
    descKey: 'model.providerZhipuDesc',
    noteKey: 'model.noteZhipu',
  },
  {
    id: 'grok',
    defaultBase: 'https://api.x.ai/v1',
    models: ['grok-4', 'grok-3-mini'],
    auth: 'bearer',
    keyExample: 'xai-…',
    consoleUrl: 'https://console.x.ai',
    brand: 'grok',
    labelKey: 'model.providerGrok',
    descKey: 'model.providerGrokDesc',
  },
  {
    id: 'custom',
    defaultBase: '',
    models: [],
    auth: 'bearer',
    keyExample: '',
    consoleUrl: '',
    brand: null,
    labelKey: 'model.providerCustom',
    descKey: 'model.providerCustomDesc',
    noteKey: 'model.noteCustom',
  },
];

export const PROVIDER_IDS: readonly ProviderId[] = PROVIDERS.map((p) => p.id);

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === 'string' && (PROVIDER_IDS as readonly string[]).includes(value);
}

export function providerProfile(id: ProviderId): ProviderProfile {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[PROVIDERS.length - 1];
}

/** Map a base URL to a provider profile (URL sniffing, used for key lookup + request shape). */
export function detectProvider(base: string): ProviderId {
  const b = base.toLowerCase();
  if (b.includes('xiaomimimo') || b.includes('mimo')) return 'mimo';
  if (b.includes('deepseek')) return 'deepseek';
  if (b.includes('openai.com')) return 'openai';
  if (b.includes('anthropic')) return 'claude';
  if (b.includes('googleapis')) return 'gemini';
  if (b.includes('moonshot')) return 'kimi';
  if (b.includes('dashscope') || b.includes('qwen')) return 'qwen';
  if (b.includes('bigmodel') || b.includes('zhipu')) return 'zhipu';
  if (b.includes('x.ai')) return 'grok';
  return 'custom';
}

/**
 * HTTP auth headers each provider expects. Sends the primary style plus a
 * harmless compatibility header where providers accept more than one form.
 */
export function authHeadersFor(auth: AuthStyle, key: string): Record<string, string> {
  switch (auth) {
    case 'mimo':
      // MiMo accepts either header; send both (documented behaviour).
      return { authorization: `Bearer ${key}`, 'api-key': key };
    case 'claude':
      // Anthropic native auth is x-api-key + version; Bearer also works on the
      // OpenAI-compat layer, so send both.
      return { 'x-api-key': key, 'anthropic-version': '2023-06-01', authorization: `Bearer ${key}` };
    case 'google':
      // Gemini accepts x-goog-api-key natively and Bearer on the compat endpoint.
      return { 'x-goog-api-key': key, authorization: `Bearer ${key}` };
    default:
      return { authorization: `Bearer ${key}` };
  }
}

/** Extra request-body fields a provider requires beyond the OpenAI shape. */
export function bodyExtrasFor(auth: AuthStyle): Record<string, unknown> {
  if (auth === 'mimo') return { thinking: { type: 'disabled' } };
  if (auth === 'claude') return { max_tokens: 2048 }; // Anthropic requires max_tokens
  return {};
}
