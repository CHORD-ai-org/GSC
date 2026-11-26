import { useEffect, useState } from 'react';
import styles from './chat/chat.module.css';

type Seg =
  | { t: 'h1' | 'h2'; text: string }
  | { t: 'p'; text: string }
  | { t: 'li'; text: string }
  | { t: 'code'; text: string };

/** 极简 MD 分段（FORAGENTS_PLAN F1 最小实现：标题/段落/列表/围栏代码块）。 */
function segment(md: string): Seg[] {
  const out: Seg[] = [];
  const lines = md.split(/\r?\n/);
  let code: string[] | null = null;
  for (const raw of lines) {
    if (raw.trimStart().startsWith('```')) {
      if (code) { out.push({ t: 'code', text: code.join('\n') }); code = null; }
      else code = [];
      continue;
    }
    if (code) { code.push(raw); continue; }
    if (raw.startsWith('# ')) out.push({ t: 'h1', text: raw.slice(2) });
    else if (raw.startsWith('## ')) out.push({ t: 'h2', text: raw.slice(3) });
    else if (raw.startsWith('- ')) out.push({ t: 'li', text: raw.slice(2) });
    else if (raw.trim()) out.push({ t: 'p', text: raw });
  }
  if (code) out.push({ t: 'code', text: code.join('\n') });
  return out;
}

/** 内联 `code` 与 **bold** 的极简替换（无依赖）。 */
function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-sunken);padding:1px 5px;border-radius:5px;font-size:12px">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
}

/**
 * /foragents（FORAGENTS_PLAN F1）：Agent 专用教程，隐藏路由（不进导航）。
 * 内容与 GET /api/foragents.md 同源（server/agents-tutorial.ts）——永不双写。
 */
export function ForAgentsView() {
  const [md, setMd] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/foragents.md')
      .then((r) => r.text())
      .then(setMd)
      .catch(() => setMd('# 无法加载教程\n\nAPI 未启动（npm run api）。'));
  }, []);

  function copy(text: string, i: number) {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(i);
      window.setTimeout(() => setCopied(null), 1200);
    });
  }

  const segs = md ? segment(md) : [];

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 36px 60px' }}>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 4 }}>for agents · 不在导航中展示</div>
      {md === null ? (
        <div style={{ color: 'var(--ink-3)' }}>加载中…</div>
      ) : (
        segs.map((s, i) => {
          if (s.t === 'h1') return <h1 key={i} style={{ fontSize: 19, fontWeight: 500, margin: '18px 0 10px' }}>{s.text}</h1>;
          if (s.t === 'h2') return <h2 key={i} style={{ fontSize: 14, fontWeight: 500, margin: '22px 0 8px', paddingBottom: 6, borderBottom: '0.5px solid var(--line)' }}>{s.text}</h2>;
          if (s.t === 'li') return <li key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: '2px 0 2px 18px' }} dangerouslySetInnerHTML={{ __html: inline(s.text) }} />;
          if (s.t === 'p') return <p key={i} style={{ fontSize: 13, lineHeight: 1.7, margin: '8px 0' }} dangerouslySetInnerHTML={{ __html: inline(s.text) }} />;
          return (
            <div key={i} style={{ position: 'relative', margin: '10px 0' }}>
              <button
                type="button"
                className={styles.subtleButton}
                style={{ position: 'absolute', top: 8, right: 8 }}
                onClick={() => copy(s.text, i)}
              >
                {copied === i ? '已复制' : '复制'}
              </button>
              <pre style={{
                background: 'var(--bg-sunken)', border: '0.5px solid var(--line)', borderRadius: 10,
                padding: '12px 14px', fontSize: 12, lineHeight: 1.6, overflowX: 'auto', margin: 0,
              }}>{s.text}</pre>
            </div>
          );
        })
      )}
    </div>
  );
}
