import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ITEM_LABELS, RAW_TYPES } from '../lib/items.ts';
import type { ItemType } from '../lib/items.ts';
import { normalizeText, segmentText } from '../lib/lightup.ts';
import { isApplicableProposalKind } from '../lib/proposals.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import styles from './views.module.css';

export type SegmentRow = {
  key: string;
  title: string;
  content: string;
  keep: boolean;
  type: ItemType;
  author: string;
  locator: string;
};

const PIPELINE_TYPES: ItemType[] = [...RAW_TYPES];

function rowsFromText(text: string): SegmentRow[] {
  return segmentText(text).map((seg) => ({
    ...seg,
    keep: true,
    type: 'raw.document' as ItemType,
    author: 'extracted',
    locator: '',
  }));
}

export function LightUpView({
  manualContent,
  onPreviewUrl,
  onSubmitRows,
  onPropose,
  proposals,
  onResolve,
  onDetect,
  busy,
  error,
}: {
  manualContent: ReactNode;
  onPreviewUrl: (url: string) => Promise<{ title: string; text: string; url: string }>;
  onSubmitRows: (rows: SegmentRow[], sourceLabel: string) => Promise<void>;
  onPropose: (rows: SegmentRow[]) => Promise<{ index: number; semantic_name: string }[]>;
  proposals: ProposalDTO[];
  onResolve: (proposal: ProposalDTO, status: 'accepted' | 'rejected') => Promise<void>;
  onDetect: () => Promise<void>;
  busy: boolean;
  error: string;
}) {
  const [tab, setTab] = useState<'manual' | 'pipeline' | 'queue'>('manual');
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [sourceLabel, setSourceLabel] = useState('lightup:text');
  const [rows, setRows] = useState<SegmentRow[]>([]);
  const [localError, setLocalError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function updateRow(key: string, patch: Partial<SegmentRow>) {
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function applyAgentSuggestions() {
    const suggestions = await onPropose(rows);
    const byIndex = new Map(suggestions.map((s) => [s.index, s]));
    setRows((current) => current.map((row, index) => {
      const suggestion = byIndex.get(index);
      return suggestion?.semantic_name ? { ...row, title: suggestion.semantic_name } : row;
    }));
  }

  async function fetchUrl() {
    setLocalError('');
    try {
      const result = await onPreviewUrl(url.trim());
      setText(result.text);
      setSourceLabel(result.url);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'URL fetch failed');
    }
  }

  async function pasteClipboard() {
    setLocalError('');
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) {
        setText((current) => (current ? `${current}\n\n${clip}` : clip));
        setSourceLabel('lightup:clipboard');
      }
    } catch {
      setLocalError('剪贴板不可读，请直接粘贴到输入框。');
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setLocalError('');
    const next: SegmentRow[] = [];
    for (const file of Array.from(files)) {
      const content = normalizeText(await file.text());
      next.push({
        key: `file-${file.name}-${Date.now()}`,
        title: file.name,
        content,
        keep: true,
        type: 'raw.filecontent',
        author: 'extracted',
        locator: '',
      });
    }
    setRows((current) => [...current, ...next]);
    setSourceLabel((label) => (label.startsWith('lightup:') ? 'lightup:file' : label));
    if (fileRef.current) fileRef.current.value = '';
  }

  function generate() {
    setLocalError('');
    const generated = rowsFromText(text);
    if (generated.length === 0) {
      setLocalError('没有可切块的内容。');
      return;
    }
    setRows((current) => [...current, ...generated]);
    setText('');
  }

  const kept = rows.filter((r) => r.keep);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Light Up</h1>
      <p className={styles.pageSub}>
        把外部信息带入 GSC 的持久空间：输入 → 切块 → 语义命名 → 分类 → 逐条审阅 → 入库。原文始终逐字保留。
      </p>

      <div className={styles.tabRow}>
        <button type="button" className={`${styles.tab} ${tab === 'manual' ? styles.on : ''}`} onClick={() => setTab('manual')}>
          手动输入
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'pipeline' ? styles.on : ''}`} onClick={() => setTab('pipeline')}>
          采集管线
        </button>
        <button type="button" className={`${styles.tab} ${tab === 'queue' ? styles.on : ''}`} onClick={() => setTab('queue')}>
          提案队列
        </button>
      </div>

      {tab === 'manual' ? (
        <>
          <div className={styles.hint} style={{ margin: '8px 0 16px' }}>
            手动模式（Vision 3.1-A）：直接填写表单，控制每一步。原文与元数据一次到位。
          </div>
          {manualContent}
        </>
      ) : tab === 'pipeline' ? (
        <>
          <div className={styles.section}>
            <h2 className={styles.blockTitle}>1–2 · 输入与摄取</h2>
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                placeholder="https://... 抓取网页正文（只预览，不落库）"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button type="button" className={styles.secondaryButton} onClick={() => void fetchUrl()} disabled={busy}>抓取</button>
              <button type="button" className={styles.secondaryButton} onClick={() => void pasteClipboard()}>粘贴剪贴板</button>
              <button type="button" className={styles.secondaryButton} onClick={() => fileRef.current?.click()}>导入文件</button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".txt,.md,text/*"
                style={{ display: 'none' }}
                onChange={(e) => void addFiles(e.target.files)}
              />
            </div>
            <textarea
              className={styles.intake}
              placeholder="粘贴或输入文本。点「生成审阅」按段落/标题切块。"
              value={text}
              rows={7}
              onChange={(e) => setText(e.target.value)}
            />
            <div className={styles.toolbar}>
              <input
                className={styles.search}
                placeholder="来源标签（source_label），如 URL 或出处"
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
              />
              <button type="button" className={styles.secondaryButton} disabled={busy || rows.length === 0} onClick={() => void applyAgentSuggestions()}>
                Agent 建议
              </button>
              <button type="button" className={styles.primaryButton} onClick={generate} disabled={busy}>生成审阅</button>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className={styles.section}>
              <h2 className={styles.blockTitle}>3–7 · 审阅（不确认不入库）</h2>
              {rows.map((row) => (
                <div key={row.key} className={styles.reviewRow}>
                  <label className={styles.keepBox}>
                    <input
                      type="checkbox"
                      checked={row.keep}
                      onChange={(e) => updateRow(row.key, { keep: e.target.checked })}
                    />
                    保留
                  </label>
                  <div className={styles.reviewFields}>
                    <input
                      className={styles.settingInput}
                      value={row.title}
                      placeholder="语义名（Semantic Name）"
                      onChange={(e) => updateRow(row.key, { title: e.target.value })}
                    />
                    <select
                      className={styles.select}
                      value={row.type}
                      onChange={(e) => updateRow(row.key, { type: e.target.value as ItemType })}
                    >
                      {PIPELINE_TYPES.map((t) => <option key={t} value={t}>{ITEM_LABELS[t]}</option>)}
                    </select>
                    {row.type === 'raw.message' ? (
                      <input
                        className={styles.settingInput}
                        value={row.author}
                        placeholder="author"
                        onChange={(e) => updateRow(row.key, { author: e.target.value })}
                      />
                    ) : null}
                    {row.type === 'raw.evidence' ? (
                      <input
                        className={styles.settingInput}
                        value={row.locator}
                        placeholder="locator"
                        onChange={(e) => updateRow(row.key, { locator: e.target.value })}
                      />
                    ) : null}
                  </div>
                  <pre className={styles.reviewContent}>{row.content.slice(0, 400)}{row.content.length > 400 ? '…' : ''}</pre>
                  <button type="button" className={styles.removeButton} onClick={() => setRows((c) => c.filter((r) => r.key !== row.key))}>
                    丢弃
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {(localError || error) ? <div className={styles.hint} style={{ color: 'var(--error)' }}>{localError || error}</div> : null}

          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy || kept.length === 0}
              onClick={() => void onSubmitRows(kept, sourceLabel || 'lightup')}
            >
              {busy ? '入库中…' : `入库 ${kept.length} 条`}
            </button>
            <div className={styles.hint}>原文逐字入库；语义名可随时在详情页修改。</div>
          </div>
        </>
      ) : tab === 'queue' ? (
        <>
          <div className={styles.hint} style={{ margin: '8px 0 16px' }}>
            Agent 解释并提议，Detector 观察并标记候选（Vision §4.2）。所有提议在此等待人工裁决——接受前不写入任何用户数据。
          </div>
          <div className={styles.toolbar}>
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void onDetect()}>
              运行 Detector
            </button>
            <div className={styles.hint}>查重 · 关联候选 · 缺来源检查（增量，跳过已有待审）</div>
          </div>
          {proposals.length === 0 ? (
            <div className={styles.emptyLine}>队列为空。用「Agent 建议」或「运行 Detector」产生提议。</div>
          ) : proposals.map((p) => (
            <div key={p.id} className={styles.reviewRow}>
              <div className={styles.keepBox}>{p.source}</div>
              <div className={styles.reviewFields}>
                <strong>{p.kind}</strong>
                <span className={styles.rowType}>{p.proposed_value}</span>
                <span className={styles.rowType}>{p.rationale}</span>
                <span className={styles.rowType}>target {p.target_id}{p.related_id ? ` · related ${p.related_id}` : ''}</span>
                {!isApplicableProposalKind(p.kind) ? (
                  <span className={styles.rowType}>该类型接受后仅标记已审（应用在模型扩展后）</span>
                ) : null}
              </div>
              {p.status === 'pending' ? (
                <div className={styles.reviewFields}>
                  <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => void onResolve(p, 'accepted')}>接受</button>
                  <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void onResolve(p, 'rejected')}>拒绝</button>
                </div>
              ) : (
                <div className={styles.keepBox}>{p.status}</div>
              )}
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
