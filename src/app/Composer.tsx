import { useEffect, useRef, useState } from 'react';
import type { ComposerMode, ModelName } from '../lib/prefs.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';
import { checkLlm, type LlmPublicConfig } from '../services/api.ts';
import { PROVIDERS, detectProvider, isProviderId, providerProfile, type ProviderId } from '../lib/providers.ts';
import { useToast } from '../components/Toast.tsx';
import styles from './shell.module.css';
import { useT } from '../lib/i18n.tsx';

const MODES: { id: ComposerMode; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'agent', label: 'Agent' },
  { id: 'edit', label: 'Edit' },
];

export function Composer({
  onSubmit,
  onConfigChange,
  llmConfig,
}: {
  onSubmit: (payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) => void | Promise<void>;
  onConfigChange: (patch: { provider?: string; base_url?: string; model?: string }) => Promise<void>;
  llmConfig?: LlmPublicConfig | null;
}) {
  const t = useT();
  const toast = useToast();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ComposerMode>('agent');
  const [menu, setMenu] = useState<'model' | 'provider' | null>(null);
  const [busy, setBusy] = useState(false);
  /* M1/M3：LLM 健康状态灯（测试连接 + 全局失败事件驱动）。 */
  const [health, setHealth] = useState<'unknown' | 'ok' | 'fail'>('unknown');
  const [testing, setTesting] = useState(false);
  /* M2：模型搜索 + 最近使用。 */
  const [query, setQuery] = useState('');
  const [recents, setRecents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gsc.recentModels') ?? '[]') as string[]; } catch { return []; }
  });
  const wrapRef = useRef<HTMLDivElement>(null);

  /* Real configured provider + model (shared registry — same source as Settings). */
  const providerId: ProviderId = isProviderId(llmConfig?.provider) ? (llmConfig!.provider as ProviderId) : detectProvider(llmConfig?.base_url ?? '');
  const profile = providerProfile(providerId);
  const realModel = llmConfig?.model ?? t('composer.notConfigured');
  const keyStatus = llmConfig?.key_status ?? {};
  /* Model options: provider presets + the configured model (kept even if off-list). */
  const configuredModel = llmConfig?.model ?? '';
  const modelOptions = configuredModel && !profile.models.includes(configuredModel)
    ? [configuredModel, ...profile.models]
    : profile.models;

  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menu]);

  useEffect(() => {
    function onHealth(e: Event) {
      setHealth((e as CustomEvent<'ok' | 'fail'>).detail === 'ok' ? 'ok' : 'fail');
    }
    window.addEventListener('gsc-llm-health', onHealth);
    return () => window.removeEventListener('gsc-llm-health', onHealth);
  }, []);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await onSubmit({ text: trimmed, mode, model: realModel as ModelName, provider: providerId });
  }

  /* Real switching: the composer drives the effective LLM config (Settings uses the same patch). */
  async function switchProvider(p: (typeof PROVIDERS)[number]) {
    setMenu(null);
    if (p.id === providerId) return;
    setBusy(true);
    try {
      const firstModel = p.models[0] ?? '';
      await onConfigChange({ provider: p.id, base_url: p.defaultBase || undefined, model: firstModel || undefined });
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  function rememberModel(m: string) {
    setRecents((prev) => {
      const next = [m, ...prev.filter((x) => x !== m)].slice(0, 3);
      try { localStorage.setItem('gsc.recentModels', JSON.stringify(next)); } catch { /* 存储不可用忽略 */ }
      return next;
    });
  }

  async function switchModel(m: string) {
    setMenu(null);
    if (m === realModel) return;
    setBusy(true);
    try {
      await onConfigChange({ model: m });
      rememberModel(m);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  /* M2：跨 provider 分组点击——一步切 provider+base+model。 */
  async function switchModelFor(p: (typeof PROVIDERS)[number], m: string) {
    setMenu(null);
    if (m === realModel && p.id === providerId) return;
    setBusy(true);
    try {
      await onConfigChange(
        p.id === providerId
          ? { model: m }
          : { provider: p.id, base_url: p.defaultBase || undefined, model: m },
      );
      rememberModel(m);
    } catch (e) {
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  /* M1 测试连接：真探针 ping。 */
  async function runCheck() {
    setTesting(true);
    try {
      const r = await checkLlm();
      setHealth('ok');
      toast(`${r.model} · ${r.ms}ms · “${r.reply}”`, 'ok');
    } catch (e) {
      setHealth('fail');
      toast(e instanceof Error ? e.message : t('model.saveFailed'), 'error');
    } finally {
      setTesting(false);
    }
  }

  /* P4: "/" command menu — quick actions typed from the composer */
  const slashCommands = [
    { id: 'capture', label: '/capture', desc: '捕获一段文本为原始信息', mode: 'ask' as ComposerMode },
    { id: 'agent', label: '/agent', desc: '交给 GSC Agent 解释与提议', mode: 'agent' as ComposerMode },
    { id: 'edit', label: '/edit', desc: '编辑模式', mode: 'edit' as ComposerMode },
  ];
  const slashActive = text.startsWith('/') && !text.includes(' ');
  const slashMatches = slashCommands.filter((c) => c.label.startsWith(text.trim().split(/\s/)[0] ?? '/'));

  function applySlash(cmd: (typeof slashCommands)[number]) {
    setMode(cmd.mode);
    setText('');
  }

  return (
    <div className={styles.composerWrap} ref={wrapRef}>
      {slashActive && slashMatches.length > 0 ? (
        <div className={styles.slashMenu}>
          {slashMatches.map((cmd) => (
            <button key={cmd.id} type="button" className={styles.slashItem} onClick={() => applySlash(cmd)}>
              <span className={styles.slashLabel}>{cmd.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.composer}>
        <textarea
          className={styles.composerInput}
          placeholder={t('composer.ask')}
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (slashActive && slashMatches.length > 0) {
                applySlash(slashMatches[0]);
                return;
              }
              void submit();
            }
          }}
        />
        <div className={styles.composerRow}>
          <div className={styles.pillTrack}>
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`${styles.pill} ${mode === m.id ? styles.on : ''}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className={styles.chip}>
            <button type="button" className={styles.chipButton} disabled={busy} onClick={() => setMenu(menu === 'provider' ? null : 'provider')}>
              <span className={styles.lamp} data-health={health === 'unknown' ? (keyStatus[providerId] ? 'idle' : 'fail') : health} aria-label={`LLM 状态：${health}`} />
              {profile.brand ? <BrandLogo kind={profile.brand} size={14} /> : <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="12" height="8" rx="1.5" /><path d="M5.5 13.5h5" /></svg>}
              {t(profile.labelKey)}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5L8 10.5l4-4" /></svg>
            </button>
            {menu === 'provider' ? (
              <div className={styles.chipMenu}>
                {PROVIDERS.map((p) => (
                  <button key={p.id} type="button" className={styles.chipOption} onClick={() => void switchProvider(p)}>
                    {p.brand ? <BrandLogo kind={p.brand} size={14} /> : <span className={styles.chipGlyph}>⚙</span>}
                    <span className={styles.chipOptionText}>{t(p.labelKey)}</span>
                    {p.id === providerId ? (
                      <span className={styles.tickMark}>✓</span>
                    ) : keyStatus[p.id] ? null : (
                      <span className={styles.tickMark}>{t('composer.noKey')}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.chip}>
            <button type="button" className={styles.chipButton} disabled={busy} onClick={() => setMenu(menu === 'model' ? null : 'model')}>
              {realModel}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5L8 10.5l4-4" /></svg>
            </button>
            {menu === 'model' ? (
              <div className={styles.chipMenuWide}>
                <input
                  className={styles.menuSearch}
                  placeholder="搜索模型"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  autoFocus
                />
                {(() => {
                  const q = query.toLowerCase();
                  const inRecent = new Set(recents);
                  const recentHit = recents.filter((m) => m.toLowerCase().includes(q));
                  return (
                    <>
                      {recentHit.length > 0 ? (
                        <>
                          <div className={styles.chipGroupLabel}>最近</div>
                          {recentHit.map((m) => (
                            <button key={`r-${m}`} type="button" className={styles.chipOption} onClick={() => void switchModel(m)}>
                              <span className={styles.chipOptionText}>{m}</span>
                              {m === realModel ? <span className={styles.tickMark}>✓</span> : null}
                            </button>
                          ))}
                        </>
                      ) : null}
                      {PROVIDERS.map((p) => {
                        const models = (p.id === providerId ? modelOptions : p.models).filter((m) => !inRecent.has(m) && m.toLowerCase().includes(q));
                        if (models.length === 0) return null;
                        return (
                          <div key={p.id}>
                            <div className={styles.chipGroupLabel}>{t(p.labelKey)}</div>
                            {models.map((m) => (
                              <button key={`${p.id}:${m}`} type="button" className={styles.chipOption} onClick={() => void switchModelFor(p, m)}>
                                <span className={styles.chipOptionText}>{m}</span>
                                {m === realModel && p.id === providerId ? <span className={styles.tickMark}>✓</span> : null}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
                <div className={styles.chipFooter}>
                  <button type="button" className={styles.checkBtn} disabled={testing} onClick={() => void runCheck()}>
                    {testing ? '测试中…' : '⚡ 测试连接'}
                  </button>
                  <span className={styles.lamp} data-health={health} aria-label={`LLM 状态：${health}`} />
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.composerSpacer} />

          <button type="button" className={styles.submitButton} disabled={!text.trim()} onClick={() => void submit()} aria-label={t('composer.submit')}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
