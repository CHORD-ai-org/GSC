import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ITEM_LABELS, RAW_TYPES } from '../lib/items.ts';
import type { ItemType } from '../lib/items.ts';
import { mergeSegments, normalizeText, segmentText, splitSegment } from '../lib/lightup.ts';
import type { Segment } from '../lib/lightup.ts';
import { isApplicableProposalKind } from '../lib/proposals.ts';
import type { ProposalDTO } from '../lib/proposals.ts';
import type { TagDefinitionDTO } from '../lib/tags.ts';
import { SemanticObjectSheet } from '../components/SemanticObjectSheet.tsx';
import type { Sheet } from '../components/SemanticObjectSheet.tsx';
import styles from './lightup.module.css';

export type CreatedItem = { id: string; title: string; type: ItemType; source_label: string };
export type PersistResult = { created: CreatedItem[]; failed: { key: string; message: string }[] };

const STAGES = ['Capture', 'Understand', 'Shape', 'Curate', 'Illuminate'] as const;
const STAGE_WORDS = ['Reading Source', 'Identifying Information', 'Establishing Semantic Identity', 'Preparing Review'];

function toSheet(seg: Segment): Sheet {
  return {
    ...seg,
    status: 'ready',
    type: 'raw.document',
    author: 'extracted',
    locator: '',
    tags: [],
  };
}

/**
 * Light Up Studio — Capture → Understand → Shape → Curate → Illuminate
 * (LIGHT_UP_UX_VISION.md). D-047 human-review gate: nothing persists until the
 * user confirms here; original content is preserved verbatim.
 */
export function LightUpStudio({
  manualContent,
  onPreviewUrl,
  onSubmitSheets,
  onPropose,
  proposals,
  onResolve,
  onDetect,
  tagDefinitions,
  onNavigate,
  busy,
  error,
}: {
  manualContent: ReactNode;
  onPreviewUrl: (url: string) => Promise<{ title: string; text: string; url: string }>;
  onSubmitSheets: (sheets: Sheet[], sourceLabel: string) => Promise<PersistResult>;
  onPropose: (rows: { title: string; content: string }[]) => Promise<{ index: number; semantic_name: string }[]>;
  proposals: ProposalDTO[];
  onResolve: (proposal: ProposalDTO, status: 'accepted' | 'rejected') => Promise<void>;
  onDetect: () => Promise<void>;
  tagDefinitions: TagDefinitionDTO[];
  onNavigate: (view: 'raw' | 'overview') => void;
  busy: boolean;
  error: string;
}) {
  const [phase, setPhase] = useState<'capture' | 'understand' | 'shape' | 'illuminate'>('capture');
  const [stageStep, setStageStep] = useState(-1);
  const [text, setText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [url, setUrl] = useState('');
  const [urlOpen, setUrlOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState('');
  const [sourceLabel, setSourceLabel] = useState('lightup:text');
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [view, setView] = useState<'overview' | 'chunks' | 'source'>('chunks');
  const [mergePicked, setMergePicked] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const [created, setCreated] = useState<CreatedItem[]>([]);
  const [failed, setFailed] = useState<{ key: string; message: string }[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tagDimensions = tagDefinitions.map((d) => d.name);
  const persistable = sheets.filter((s) => s.status === 'ready' || s.status === 'accepted' || s.status === 'edited');
  const deferredCount = sheets.filter((s) => s.status === 'deferred').length;

  /* ── Capture ─────────────────────────────────────────────── */

  async function fetchUrl() {
    setLocalError('');
    try {
      const result = await onPreviewUrl(url.trim());
      setText((current) => (current ? `${current}\n\n${result.text}` : result.text));
      setPreviewNote(`来自 ${result.url} 的内容 —— 尚未进入 GSC`);
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
    let combined = '';
    for (const file of Array.from(files)) {
      combined += (combined ? '\n\n' : '') + normalizeText(await file.text());
    }
    setText((current) => (current ? `${current}\n\n${combined}` : combined));
    setSourceLabel('lightup:file');
    if (fileRef.current) fileRef.current.value = '';
  }

  /* ── Understand → Shape ──────────────────────────────────── */

  function identify() {
    setLocalError('');
    const raw = text;
    if (!normalizeText(raw)) {
      setLocalError('没有可识别的内容。');
      return;
    }
    setSourceText(raw);
    setPhase('understand');
    setStageStep(0);
    // Real work is synchronous and fast; the stage words reflect actual steps.
    const steps = [120, 260, 400];
    steps.forEach((ms, i) => window.setTimeout(() => setStageStep(i + 1), ms));
    window.setTimeout(() => {
      const built = segmentText(raw).map(toSheet);
      if (built.length === 0) {
        setPhase('capture');
        setLocalError('没有可切块的内容。');
        return;
      }
      setSheets(built);
      setSelectedKey(built[0].key);
      setView('chunks');
      setPhase('shape');
    }, 520);
  }

  /* ── Curate ──────────────────────────────────────────────── */

  function patchSheet(key: string, patch: Partial<Sheet>) {
    setSheets((current) => current.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function setStatus(key: string, status: Sheet['status']) {
    setSheets((current) => current.map((s) => (s.key === key ? { ...s, status } : s)));
  }

  function splitSheet(key: string) {
    setSheets((current) => {
      const idx = current.findIndex((s) => s.key === key);
      if (idx < 0) return current;
      const parts = splitSegment(current[idx], Math.floor(current[idx].content.length / 2));
      if (!parts) return current;
      const next = [...current];
      next.splice(idx, 1, toSheet(parts[0]), toSheet(parts[1]));
      return next;
    });
  }

  function mergeSheets() {
    if (mergePicked.length < 2) return;
    setSheets((current) => {
      const picked = current.filter((s) => mergePicked.includes(s.key));
      const others = current.filter((s) => !mergePicked.includes(s.key));
      const merged = toSheet(mergeSegments(picked.map(({ status, type, author, locator, tags, ...seg }) => seg)));
      merged.tags = picked.flatMap((s) => s.tags);
      merged.type = picked[0].type;
      return [...others, merged].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    });
    setMergePicked([]);
  }

  async function applyAgentSuggestions() {
    setLocalError('');
    try {
      const suggestions = await onPropose(sheets.map((s) => ({ title: s.title, content: s.content })));
      const byIndex = new Map(suggestions.map((s) => [s.index, s]));
      setSheets((current) => current.map((sheet, index) => {
        const suggestion = byIndex.get(index);
        return suggestion?.semantic_name
          ? { ...sheet, title: suggestion.semantic_name, nameOrigin: 'agent' }
          : sheet;
      }));
    } catch {
      setLocalError('Agent 不可用（需配置 GSC_LLM_*）。其余流程不受影响。');
    }
  }

  /* ── Persist → Illuminate ────────────────────────────────── */

  async function persist() {
    setLocalError('');
    setPreviewNote('');
    const result = await onSubmitSheets(persistable, sourceLabel || 'lightup');
    setCreated(result.created);
    setFailed(result.failed);
    setPhase('illuminate');
    if (result.failed.length > 0) {
      // failed sheets stay in review state for retry
      setSheets((current) => current.map((s) => {
        const f = result.failed.find((x) => x.key === s.key);
        return f ? { ...s, persistError: f.message } : s;
      }));
    }
  }

  function resetStudio() {
    setPhase('capture');
    setText('');
    setSourceText('');
    setSheets([]);
    setCreated([]);
    setFailed([]);
    setPreviewNote('');
    setLocalError('');
    setStageStep(-1);
    setSourceLabel('lightup:text');
  }

  /* ── Source view highlighting ────────────────────────────── */

  function sourceBody() {
    const selected = sheets.find((s) => s.key === selectedKey);
    if (!selected || selected.start === undefined || selected.end === undefined) {
      return { before: sourceText, mark: '', after: '', precise: false };
    }
    return {
      before: sourceText.slice(0, selected.start),
      mark: sourceText.slice(selected.start, selected.end),
      after: sourceText.slice(selected.end),
      precise: true,
    };
  }

  /* ── Render ──────────────────────────────────────────────── */

  const stageIndex = phase === 'capture' ? 0 : phase === 'understand' ? 1 : phase === 'shape' ? 2 : phase === 'illuminate' ? 4 : 2;

  return (
    <div className={styles.studio}>
      <div className={styles.kicker}>
        {STAGES.map((s, i) => (
          <span key={s} className={`${styles.kickerStep} ${i === stageIndex ? styles.on : ''} ${i < stageIndex ? styles.done : ''}`}>
            {i > 0 ? <span className={styles.kickerSep}>·</span> : null} {s}
          </span>
        ))}
      </div>

      {phase === 'capture' ? (
        <>
          <h1 className={styles.studioTitle}>Light Up</h1>
          <p className={styles.studioSub}>
            把信息带入 GSC，给它一个持久的语义身份。文本、文件、粘贴、网页 —— 都进入同一个过程。原文永远逐字保留。
          </p>

          <div
            className={`${styles.composer} ${dragging ? styles.drop : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void addFiles(e.dataTransfer.files);
            }}
          >
            {dragging ? <div className={styles.dropHint}>松手，把文件带进 GSC</div> : null}
            {previewNote ? (
              <div className={styles.previewBanner}>
                <strong>预览</strong> {previewNote}
              </div>
            ) : null}
            <textarea
              className={styles.intake}
              placeholder="把信息带进 GSC…（可直接输入、粘贴、拖入文件）"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') identify(); }}
            />
            <div className={styles.composerBar}>
              <button type="button" className={styles.ghost} onClick={() => void pasteClipboard()}>粘贴剪贴板</button>
              <button type="button" className={styles.ghost} onClick={() => fileRef.current?.click()}>导入文件</button>
              <button type="button" className={styles.ghost} onClick={() => setUrlOpen((v) => !v)}>URL</button>
              <span className={styles.count}>
                {text.length} 字{sourceLabel !== 'lightup:text' ? ` · ${sourceLabel}` : ''}
              </span>
            </div>
            {urlOpen ? (
              <div className={styles.composerBar}>
                <div className={styles.urlRow}>
                  <input
                    className={styles.urlInput}
                    placeholder="https://... 抓取正文（仅预览，不落库）"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button type="button" className={styles.ghost} onClick={() => void fetchUrl()} disabled={busy}>预览</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.composerBar} style={{ padding: '14px 0 0' }}>
            <button type="button" className={styles.primary} onClick={identify} disabled={!text.trim()}>
              Identify Information
            </button>
            <span className={styles.count} style={{ margin: 0 }}>
              Ctrl+Enter 也可以 · 短笔记可用 Start 页 Composer 直接入库
            </span>
          </div>

          {localError || error ? <div className={styles.errorLine}>{localError || error}</div> : null}

          <details className={styles.manualFold}>
            <summary>手动逐字段创建（Vision 3.1-A Manual Input）</summary>
            <div style={{ marginTop: 14 }}>{manualContent}</div>
          </details>

          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".txt,.md,text/*"
            style={{ display: 'none' }}
            onChange={(e) => void addFiles(e.target.files)}
          />
        </>
      ) : phase === 'understand' ? (
        <>
          <h1 className={styles.studioTitle}>Understanding</h1>
          <div className={styles.stageLabel}>
            <div>
              {STAGE_WORDS.map((w, i) => (
                <div key={w} className={`${styles.stageRow} ${i === stageStep ? styles.on : ''} ${i < stageStep ? styles.done : ''}`}>
                  <span className={styles.stageDot} /> {w}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : phase === 'illuminate' ? (
        <div className={styles.illuminate}>
          <h1 className={styles.illuminateTitle}>Your information now has a place in GSC.</h1>
          <p className={styles.illuminateSub}>
            {created.length} 个信息单元已获得持久身份，原文逐字保留，来源可溯。
          </p>
          {created.map((c) => (
            <div key={c.id} className={styles.createdRow}>
              <span className={styles.cName}>{c.title}</span>
              <span className={styles.cType}>{ITEM_LABELS[c.type]}</span>
              <span className={styles.cSrc}>{c.source_label}</span>
            </div>
          ))}
          {failed.length > 0 ? (
            <div className={styles.errorLine}>{failed.length} 项入库失败 —— 返回审阅可重试。</div>
          ) : null}
          {deferredCount > 0 ? (
            <div className={styles.pendingNote}>{deferredCount} 项未决（已延后，未入库）。</div>
          ) : null}
          <div className={styles.illuminateActions}>
            <button type="button" className={styles.primary} onClick={() => onNavigate('raw')}>
              查看这些信息
            </button>
            <button type="button" className={styles.ghost} onClick={() => onNavigate('overview')}>
              回到 Context Space
            </button>
            <button type="button" className={styles.ghost} onClick={resetStudio}>
              再来一次 Light Up
            </button>
            {failed.length > 0 ? (
              <button type="button" className={styles.ghost} onClick={() => setPhase('shape')}>返回审阅</button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <h1 className={styles.studioTitle}>Shape</h1>
          <p className={styles.studioSub}>
            GSC 识别出 {sheets.length} 个信息单元。语义名可以改，原文不动；采纳的进入 GSC，拒绝/延后的不入库。
          </p>

          <div className={styles.bulkBar}>
            <button type="button" className={styles.ghost} onClick={() => setSheets((c) => c.map((s) => ({ ...s, status: 'accepted' as const })))}>
              Accept all {persistable.length}
            </button>
            <button type="button" className={styles.ghost} disabled={busy} onClick={() => void applyAgentSuggestions()}>
              Ask Agent for names
            </button>
            {mergePicked.length >= 2 ? (
              <button type="button" className={styles.ghost} onClick={mergeSheets}>Merge {mergePicked.length} selected</button>
            ) : null}
            <span className={styles.spacer} />
            <span>{persistable.length} 将入库 · {sheets.length - persistable.length} 不入库</span>
            <button type="button" className={styles.primary} disabled={busy || persistable.length === 0} onClick={() => void persist()}>
              {busy ? '入库中…' : `确认 ${persistable.length} 条`}
            </button>
          </div>

          <div className={styles.shapeHead}>
            {(['overview', 'chunks', 'source'] as const).map((v) => (
              <button key={v} type="button" className={`${styles.viewTab} ${view === v ? styles.on : ''}`} onClick={() => setView(v)}>
                {v === 'overview' ? 'Overview' : v === 'chunks' ? 'Chunks' : 'Source'}
              </button>
            ))}
            <span className={styles.shapeCount}>{sheets.length} chunks · {new Set(sheets.map((s) => s.type)).size} types</span>
          </div>

          {view === 'overview' ? (
            <div className={styles.overviewGrid}>
              <div className={styles.statBlock}>
                <div className={styles.statNum}>{sheets.length}</div>
                <div className={styles.statLabel}>Information Units</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statNum}>{sheets.filter((s) => s.start !== undefined).length}</div>
                <div className={styles.statLabel}>With Source Ref</div>
              </div>
              <div className={styles.statBlock}>
                <div>
                  {RAW_TYPES.filter((t) => sheets.some((s) => s.type === t)).map((t) => (
                    <div className={styles.typeLine} key={t}>
                      <span className={styles.typeName}>{ITEM_LABELS[t]}</span>
                      <span>{sheets.filter((s) => s.type === t).length}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.statLabel}>Types</div>
              </div>
            </div>
          ) : view === 'chunks' ? (
            sheets.map((sheet, index) => (
              <SemanticObjectSheet
                key={sheet.key}
                sheet={sheet}
                index={index}
                selected={selectedKey === sheet.key}
                tagDimensions={tagDimensions}
                onSelect={() => setSelectedKey(sheet.key)}
                onPatch={(patch) => patchSheet(sheet.key, patch)}
                onAccept={() => setStatus(sheet.key, sheet.nameOrigin === 'user' ? 'edited' : 'accepted')}
                onReject={() => setStatus(sheet.key, 'rejected')}
                onDefer={() => setStatus(sheet.key, 'deferred')}
                onRestore={() => setStatus(sheet.key, 'ready')}
                onSplit={() => splitSheet(sheet.key)}
                onMergeToggle={() => setMergePicked((c) => (c.includes(sheet.key) ? c.filter((k) => k !== sheet.key) : [...c, sheet.key]))}
                mergePicked={mergePicked.includes(sheet.key)}
              />
            ))
          ) : (
            (() => {
              const src = sourceBody();
              return (
                <>
                  <div className={styles.sourceNote}>
                    {src.precise
                      ? '选中的信息单元对应下方高亮的原文段。'
                      : selectedKey
                        ? '该信息单元没有精确的原文引用（不伪造高亮）。'
                        : '选择一个信息单元以查看其原文出处。'}
                  </div>
                  <div className={styles.sourcePane}>
                    {src.before}
                    {src.mark ? <mark className={styles.sourceMark}>{src.mark}</mark> : null}
                    {src.after}
                  </div>
                </>
              );
            })()
          )}

          {localError || error ? <div className={styles.errorLine}>{localError || error}</div> : null}

          <div className={styles.queueWrap}>
            <div className={styles.bulkBar} style={{ border: 0 }}>
              <strong style={{ fontSize: 13 }}>提案队列</strong>
              <span className={styles.stateNote}>Agent 提议 · Detector 观察 · 人工裁决（不确认不写入）</span>
              <span className={styles.spacer} />
              <button type="button" className={styles.ghost} onClick={() => setQueueOpen((v) => !v)}>
                {queueOpen ? '收起' : `展开 (${proposals.length})`}
              </button>
            </div>
            {queueOpen ? (
              <>
                <div className={styles.bulkBar}>
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => void onDetect()}>运行 Detector</button>
                  <span className={styles.stateNote}>查重 · 关联候选 · 缺来源检查（增量）</span>
                </div>
                {proposals.length === 0 ? (
                  <div className={styles.sourceNote}>队列为空。</div>
                ) : proposals.map((p) => (
                  <div key={p.id} className={styles.createdRow}>
                    <span className={styles.cName} style={{ fontSize: 13 }}>{p.kind}</span>
                    <span className={styles.cType}>{p.proposed_value}</span>
                    <span className={styles.cSrc}>{p.source} · {p.rationale}</span>
                    {p.status === 'pending' ? (
                      <>
                        <button type="button" className={`${styles.action} ${styles.accept}`} disabled={busy} onClick={() => void onResolve(p, 'accepted')}>接受</button>
                        <button type="button" className={`${styles.action} ${styles.reject}`} disabled={busy} onClick={() => void onResolve(p, 'rejected')}>拒绝</button>
                        {!isApplicableProposalKind(p.kind) ? (
                          <span className={styles.stateNote}>接受=标记已审</span>
                        ) : null}
                      </>
                    ) : (
                      <span className={styles.stateNote}>{p.status}</span>
                    )}
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
