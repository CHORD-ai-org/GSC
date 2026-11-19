import { useEffect, useRef, useState } from 'react';
import type { ComposerMode, ModelName } from '../lib/prefs.ts';
import styles from './shell.module.css';

const MODES: { id: ComposerMode; label: string }[] = [
  { id: 'ask', label: 'Ask' },
  { id: 'agent', label: 'Agent' },
  { id: 'edit', label: 'Edit' },
];

const MODELS: ModelName[] = ['Deepseek', 'Rym'];

export function Composer({
  onSubmit,
}: {
  onSubmit: (payload: { text: string; mode: ComposerMode; model: ModelName; provider: string }) => void | Promise<void>;
}) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ComposerMode>('agent');
  const [model, setModel] = useState<ModelName>('Deepseek');
  const [provider] = useState('Local');
  const [menu, setMenu] = useState<'model' | 'provider' | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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
    await onSubmit({ text: trimmed, mode, model, provider });
  }

  return (
    <div className={styles.composerWrap} ref={wrapRef}>
      <div className={styles.composer}>
        <textarea
          className={styles.composerInput}
          placeholder="Ask anything"
          value={text}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
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
              {model}
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6.5L8 10.5l4-4" /></svg>
            </button>
            {menu === 'model' ? (
              <div className={styles.chipMenu}>
                {MODELS.map((m) => (
                  <button key={m} type="button" className={styles.chipOption} onClick={() => { setModel(m); setMenu(null); }}>
                    {m}
                    <span className={styles.tickMark}>{m === model ? 'default' : ''}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.composerSpacer} />

          <button type="button" className={styles.iconButton} title="Voice input (visual only)" aria-label="Voice input">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="6" y="2" width="4" height="7" rx="2" /><path d="M3.5 8a4.5 4.5 0 0 0 9 0M8 12.5v1.5" /></svg>
          </button>
          <button type="button" className={styles.submitButton} disabled={!text.trim()} onClick={() => void submit()} aria-label="Submit">
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
