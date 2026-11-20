import { useEffect, useRef, useState } from 'react';
import type { ComposerMode, ModelName } from '../lib/prefs.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';
import type { BrandKind } from '../components/BrandLogo.tsx';
import type { LlmPublicConfig } from '../services/api.ts';
import styles from './shell.module.css';
import { useT } from '../lib/i18n.tsx';

const MODES: { id: ComposerMode; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'agent', label: 'Agent' },
  { id: 'edit', label: 'Edit' },
];

/* real-config model chip (P0 UX_OPTIMIZATION_PLAN): read llmConfig instead of fake list */
function brandOfBase(base: string): BrandKind | null {
  if (base.includes('xiaomimimo') || base.includes('mimo')) return 'mimo';
  if (base.includes('deepseek')) return 'deepseek';
  if (base.includes('openai')) return 'openai';
  if (base.includes('anthropic')) return 'claude';
  if (base.includes('googleapis')) return 'gemini';
  if (base.includes('moonshot')) return 'kimi';
  if (base.includes('dashscope') || base.includes('qwen')) return 'qwen';
  if (base.includes('bigmodel') || base.includes('zhipu')) return 'zhipu';
  if (base.includes('x.ai')) return 'grok';
  return null;
}

const SUGGESTIONS: { id: string; descKey: string }[] = [
  { id: 'mimo-v2.6-pro', descKey: 'composer.descMimo' },
  { id: 'deepseek-chat', descKey: 'composer.descDeepseek' },
];

export function Composer({
  onSubmit,
  llmConfig,
}: {
  onSubmit: (payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) => void | Promise<void>;
  llmConfig?: LlmPublicConfig | null;
}) {
  const t = useT();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ComposerMode>('agent');
  const [provider] = useState('Local');
  const [menu, setMenu] = useState<'model' | 'provider' | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* real configured model (P0): chip shows llmConfig, not a fake list */
  const realModel = llmConfig?.model ?? '未配置';
  const realBrand = brandOfBase(llmConfig?.base_url ?? '');

  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu(null);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menu]);

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await onSubmit({ text: trimmed, mode, model: realModel as ModelName, provider });
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
    setSlashOpen(false);
  }

  return (
    <div className={styles.composerWrap} ref={wrapRef}>
      {slashActive && slashMatches.length > 0 ? (
        <div className={styles.slashMenu}>
          {slashMatches.map((cmd) => (
            <button key={cmd.id} type="button" className={styles.slashItem} onClick={() => applySlash(cmd)}>
              <span className={styles.slashLabel}>{cmd.label}</span>
              <span className={styles.slashDesc}>{cmd.desc}</span>
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
            <button type="button" className={styles.chipButton} onClick={() => setMenu(menu === 'provider' ? null : 'provider')}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="12" height="8" rx="1.5" /><path d="M5.5 13.5h5" /></svg>
              {provider}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5L8 10.5l4-4" /></svg>
            </button>
            {menu === 'provider' ? (
              <div className={styles.chipMenu}>
                <button type="button" className={styles.chipOption} onClick={() => setMenu(null)}>
                  Local<span className={styles.tickMark}>connected</span>
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.chip}>
            <button type="button" className={styles.chipButton} onClick={() => setMenu(menu === 'model' ? null : 'model')}>
              {realBrand ? <BrandLogo kind={realBrand} size={14} /> : null}
              {realModel}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5L8 10.5l4-4" /></svg>
            </button>
            {menu === 'model' ? (
              <div className={styles.chipMenu}>
                <div className={styles.chipOption} style={{ cursor: 'default', opacity: .8 }}>
                  {realBrand ? <BrandLogo kind={realBrand} size={14} /> : <span style={{ width: 14 }} />}
                  <span className={styles.chipOptionText}>
                    {realModel}
                    <span className={styles.chipOptionDesc}>{llmConfig?.base_url ?? '—'}</span>
                  </span>
                  <span className={styles.tickMark}>生效中</span>
                </div>
                {SUGGESTIONS.map((m) => (
                  <button key={m.id} type="button" className={styles.chipOption} onClick={() => setMenu(null)}>
                    <span style={{ width: 14 }} />
                    <span className={styles.chipOptionText}>
                      {m.id}
                      <span className={styles.chipOptionDesc}>{t(m.descKey)} · 在设置中切换</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.composerSpacer} />

          <button type="button" className={styles.iconButton} title="Voice input (visual only)" aria-label={t('composer.mic')}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="6" y="2" width="4" height="7" rx="2" /><path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5v1.5" /></svg>
          </button>
          <button type="button" className={styles.submitButton} disabled={!text.trim()} onClick={() => void submit()} aria-label={t('composer.submit')}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
