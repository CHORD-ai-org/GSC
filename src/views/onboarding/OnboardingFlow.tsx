import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './onboarding.module.css';

type Step = 1 | 2 | 3;


const SOURCE_LOGOS = [
  { id: 'x', label: 'X' },
  { id: 'bookmarks', label: '书签' },
  { id: 'ideas', label: '灵感' },
  { id: 'omega', label: '知识库' },
];

const NOTE_STEPS = [
  { at: 0, text: '正在构建你的初始用户画像', spin: true },
  { at: 1400, text: '已完成', done: true },
  { at: 2200, text: '容我向你介绍你的新伙伴——', spin: false },
];

/**
 * G8 初始用户画像三屏（原型还原）：源连接 → Meta User Profile 合成+Tau 命名 → 引导。
 * 独立壳层（无侧栏）；语音（Fish Audio）/ X OAuth 为 U4 后置，本页形态先到位。
 */
export function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>(() => {
    const s = Number(new URLSearchParams(window.location.search).get('step'));
    return s === 2 || s === 3 ? (s as Step) : 1;
  });
  const [userName, setUserName] = useState('');
  const [connected, setConnected] = useState<Set<string>>(new Set(['x']));
  const [url, setUrl] = useState('');
  const [collected, setCollected] = useState<{ id: string; title: string }[]>([]);
  const [notes, setNotes] = useState<number>(-1); // 屏 2 依次展示到第几条
  const [companion, setCompanion] = useState('Tau');
  const [nameDraft, setNameDraft] = useState('');
  const [initDone, setInitDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [xState, setXState] = useState<{ configured: boolean; connected: boolean }>({ configured: false, connected: false });
  const [ttsState, setTtsState] = useState<{ configured: boolean }>({ configured: false });
  const [speaking, setSpeaking] = useState(false);
  const [err, setErr] = useState('');
  const collectedRef = useRef<{ id: string; title: string }[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    void fetch('/api/users')
      .then((r) => r.json())
      .then((d) => { if (d.users?.[0]?.name) setUserName(d.users[0].name); })
      .catch(() => undefined);
    void fetch('/api/profile/companion')
      .then((r) => r.json())
      .then((d) => { if (d.companion) { setCompanion(d.companion); setNameDraft(d.companion === 'Tau' ? '' : d.companion); } })
      .catch(() => undefined);
    void fetch('/api/auth/x/status').then((r) => r.json()).then((d) => { if (d.ok) setXState({ configured: d.configured, connected: d.connected }); }).catch(() => undefined);
    void fetch('/api/tts/status').then((r) => r.json()).then((d) => { if (d.ok) setTtsState({ configured: d.configured }); }).catch(() => undefined);
    if (step === 2) runInit(); // 深链续跑（刷新/直接进入屏 2）
    return () => { timers.current.forEach((t) => window.clearTimeout(t)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { collectedRef.current = collected; }, [collected]);
  const runInit = useCallback(() => {
    setStep(2);
    setNotes(0);
    timers.current.forEach((t) => window.clearTimeout(t));
    const ids = collectedRef.current.map((c) => c.id);
    void fetch('/api/profile/init', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(ids.length ? { source_item_ids: ids } : {}) })
      .then(() => setInitDone(true))
      .catch(() => setInitDone(true));
    NOTE_STEPS.forEach((n, i) => {
      if (i === 0) return;
      timers.current.push(window.setTimeout(() => setNotes(i), n.at));
    });
  }, []);

  async function submitUrl() {
    const u = url.trim();
    if (!u) return;
    setBusy(true);
    try {
      let title = u;
      let content = u;
      if (/^https?:\/\//i.test(u)) {
        const fr = await fetch('/api/ingest/url', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: u }) });
        const fd = await fr.json();
        if (fd.ok && fd.contentText) { title = fd.title || u; content = fd.contentText; }
      }
      const ir = await fetch('/api/items', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'raw.document', title: title.slice(0, 120), domain: 'user', origin: 'user', source_label: 'onboarding', fields: { content_text: content } }),
      });
      const idr = await ir.json();
      if (idr.ok && idr.item?.id) {
        setCollected((c) => [...c, { id: idr.item.id, title: title.slice(0, 60) }]);
        setUrl('');
      } else {
        setErr(idr.message || '采集失败');
      }
    } catch {
      setErr('采集失败：API 不可达');
    } finally {
      setBusy(false);
    }
  }

  function toggleSource(id: string) {
    // U4 前为形态占位：点击标记「已添加」（绿勾），真实 OAuth 接入后置
    setConnected((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function saveCompanion(next: Step) {
    const name = nameDraft.trim() || 'Tau';
    setCompanion(name);
    void fetch('/api/profile/companion', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) }).catch(() => undefined);
    setStep(next);
  }

  if (step === 1) {
    return (
      <div className={styles.screen}>
        <div className={styles.logoRow}><img src="/brand/gsc-logo.png" alt="GSC" style={{ width: 44, height: 28, objectFit: 'contain' }} /></div>
        <div className={styles.center}>
          <h1 className={styles.hello}>Ceaser,<br />我们从哪里开始认识你？</h1>
          <div className={styles.logoGrid}>
            {SOURCE_LOGOS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.sourceBtn}
                title={s.id === 'x' && xState.configured ? '授权连接 X' : s.label}
                onClick={() => {
                  if (s.id === 'x' && xState.configured && !xState.connected) {
                    window.location.href = '/api/auth/x/start';
                    return;
                  }
                  toggleSource(s.id);
                }}
              >
                {s.id === 'x' ? (
                  <svg className={styles.sourceGlyph} width="26" height="26" viewBox="0 0 24 24" fill="#171717" aria-hidden="true">
                    <path d="M17.5 3h3.1l-6.8 7.8L21.9 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.4L2.4 3h6.4l4.4 5.9L17.5 3zm-1.1 16.2h1.7L7.6 4.7H5.8l10.6 14.5z" />
                  </svg>
                ) : (
                  <span className={styles.sourceGlyph}>{s.label.slice(0, 1)}</span>
                )}
                {connected.has(s.id) ? <span className={styles.greenCheck} aria-label="已添加">✓</span> : null}
              </button>
            ))}
          </div>
          {collected.length > 0 ? (
            <div className={styles.collected}>
              <span className={styles.collectedLabel}>已收入 {collected.length}</span>
              {collected.map((c) => <span key={c.id} className={styles.collectedChip} title={c.title}>{c.title.slice(0, 30)}</span>)}
            </div>
          ) : null}
          <div className={styles.composer}>
            <input
              className={styles.composerInput}
              placeholder="输入任何网址，或是你的秘密基地 coordinates"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submitUrl(); }}
            />
            <div className={styles.composerMeta}>
              <span className={styles.plusBtn}>+</span>
              <span className={styles.thinkPill}>思考一下</span>
              <span style={{ flex: 1 }} />
              <span className={styles.mic}>🎙</span>
              <button type="button" className={styles.voiceBtn} aria-label="提交" disabled={busy} onClick={() => void submitUrl()}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 9h1.5M7 5.5v7M10.5 3.5v11M14 6.5v5" />
                </svg>
              </button>
            </div>
          </div>
          {err ? <div className={styles.errLine}>{err}</div> : null}
          <button type="button" className={styles.primaryBtn} disabled={busy} onClick={runInit}>开始构建画像</button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={styles.screen}>
        <div className={styles.logoRow}><img src="/brand/gsc-logo.png" alt="GSC" style={{ width: 44, height: 28, objectFit: 'contain' }} /></div>
        <div className={styles.center}>
          <div className={styles.notes}>
            {NOTE_STEPS.slice(0, notes + 1).map((n, i) => (
              <div key={i} className={`${styles.notePill} ${n.done ? styles.noteDone : ''}`}>
                {n.spin ? <span className={styles.spinDots}>⁂</span> : null}
                {n.done ? <span className={styles.doneCheck}>✓</span> : null}
                {n.text}
              </div>
            ))}
          </div>
          {notes >= 2 ? (
            <div className={styles.introBlock}>
              <img src="/brand/tau.jpg" alt="Tau" style={{ width: 170, height: 170, objectFit: 'contain' }} />
              <div className={styles.introText}>
                <span className={styles.tauName}>{companion}</span>
                <span className={styles.tauAsk}>或者你想叫他____</span>
                <input
                  className={styles.nameInput}
                  placeholder={companion}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          {notes >= 2 ? (
            <button type="button" className={styles.greyPill} onClick={() => saveCompanion(3)}>继续画像的初始化:3</button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <div className={styles.logoRow}><img src="/brand/gsc-logo.png" alt="GSC" style={{ width: 44, height: 28, objectFit: 'contain' }} /></div>
      <div className={styles.center}>
        <div className={styles.step3Block}>
          <img src="/brand/tau.jpg" alt="Tau" style={{ width: 64, height: 64, objectFit: 'contain' }} />
          <p className={styles.step3Line}>无论您走到哪里，连接上GSC，<br />就会瞬间感到宾至如归</p>
        </div>
        <img src="/brand/gamma.jpg" alt="Gamma" style={{ position: 'absolute', right: '10%', bottom: '18%', width: 84, height: 84, objectFit: 'contain' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div className={styles.step3Hint} style={{ textAlign: 'left' }}>
            <div>太令人激动了… 等等 —— 初始画像已在提案面待你校准</div>
            <div>scroll down 查看你的工作区</div>
          </div>
          <button
            type="button"
            className={styles.greyPill}
            disabled={speaking}
            onClick={() => {
              setSpeaking(true);
              void fetch('/api/tts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '无论您走到哪里，连接上GSC，就会瞬间感到宾至如归。' }) })
                .then(async (r) => {
                  if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.message || '语音不可用'); return; }
                  const blob = await r.blob();
                  new Audio(URL.createObjectURL(blob)).play();
                })
                .catch(() => setErr('语音不可用：API 不可达'))
                .finally(() => setSpeaking(false));
            }}
          >
            {speaking ? 'Tau 说话中…' : '🔊 让 Tau 开口'}
          </button>
          <button type="button" className={styles.primaryBtn} onClick={onDone}>进入 GSC</button>
        </div>
      </div>
      <div className={styles.initState}>{initDone ? '画像初始化已完成' : '画像初始化进行中…'}</div>
    </div>
  );
}
