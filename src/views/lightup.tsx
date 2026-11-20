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
import { useRelativeTime, useT } from '../lib/i18n.tsx';
import styles from './lightup.module.css';

export type CreatedItem = { id: string; title: string; type: ItemType; source_label: string };
export type PersistResult = { created: CreatedItem[]; failed: { key: string; message: string }[] };

const STAGE_KEYS = ['lu.capture', 'lu.understand', 'lu.shape', 'lu.curate', 'lu.illuminate'] as const;
const STAGE_WORD_KEYS = ['lu.reading', 'lu.identifying', 'lu.naming', 'lu.preparing'];

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
  const t = useT();
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
      setPreviewNote(t('lu.previewNote', { url: result.url }));
      setSourceLabel(result.url);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : t('lu.urlFail'));
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
      setLocalError(t('lu.clipboardFail'));
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
      setLocalError(t('lu.noContent'));
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
        setLocalError(t('lu.noChunks'));
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
      setLocalError(t('lu.agentUnavailable'));
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
        {STAGE_KEYS.map((key, i) => (
          <span key={key} className={`${styles.kickerStep} ${i === stageIndex ? styles.on : ''} ${i < stageIndex ? styles.done : ''}`}>
            {i > 0 ? <span className={styles.kickerSep}>·</span> : null} {t(key)}
          </span>
        ))}
      </div>

      {phase === 'capture' ? (
        <>
          <h1 className={styles.studioTitle}>Light Up</h1>
          <p className={styles.studioSub}>
            {t('lu.sub')}
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
            {dragging ? <div className={styles.dropHint}>{t('lu.dropHint')}</div> : null}
            {previewNote ? (
              <div className={styles.previewBanner}>
                <strong>{t('lu.previewBadge')}</strong> {previewNote}
              </div>
            ) : null}
            <textarea
              className={styles.intake}
              placeholder={t('composer.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') identify(); }}
            />
            <div className={styles.composerBar}>
              <button type="button" className={styles.ghost} onClick={() => void pasteClipboard()}>{t('lu.pasteClipboard')}</button>
              <button type="button" className={styles.ghost} onClick={() => fileRef.current?.click()}>{t('lu.importFile')}</button>
              <button type="button" className={styles.ghost} onClick={() => setUrlOpen((v) => !v)}>URL</button>
              <span className={styles.count}>
                {t('lu.count', { n: text.length })}{sourceLabel !== 'lightup:text' ? ` · ${sourceLabel}` : ''}
              </span>
            </div>
            {urlOpen ? (
              <div className={styles.composerBar}>
                <div className={styles.urlRow}>
                  <input
                    className={styles.urlInput}
                    placeholder={t('lu.urlPlaceholder')}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <button type="button" className={styles.ghost} onClick={() => void fetchUrl()} disabled={busy}>{t('lu.preview')}</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className={styles.composerBar} style={{ padding: '14px 0 0' }}>
            <button type="button" className={styles.primary} onClick={identify} disabled={!text.trim()}>
              {t('lu.identify')}
            </button>
            <span className={styles.count} style={{ margin: 0 }}>
              {t('start.quickHint')}
            </span>
          </div>

          {localError || error ? <div className={styles.errorLine}>{localError || error}</div> : null}

          <details className={styles.manualFold}>
            <summary>{t('lu.manual')}</summary>
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
          <h1 className={styles.studioTitle}>{t('lu.understanding')}</h1>
          <div className={styles.stageLabel}>
            <div>
              {STAGE_WORD_KEYS.map((w, i) => (
                <div key={w} className={`${styles.stageRow} ${i === stageStep ? styles.on : ''} ${i < stageStep ? styles.done : ''}`}>
                  <span className={styles.stageDot} /> {t(w)}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : phase === 'illuminate' ? (
        <div className={styles.illuminate}>
          <h1 className={styles.illuminateTitle}>{t('lu.doneTitle')}</h1>
          <p className={styles.illuminateSub}>
            {t('lu.doneSub', { n: created.length })}
          </p>
          {created.map((c) => (
            <div key={c.id} className={styles.createdRow}>
              <span className={styles.cName}>{c.title}</span>
              <span className={styles.cType}>{ITEM_LABELS[c.type]}</span>
              <span className={styles.cSrc}>{c.source_label}</span>
            </div>
          ))}
          {failed.length > 0 ? (
            <div className={styles.errorLine}>{t('lu.failed', { n: failed.length })}</div>
          ) : null}
          {deferredCount > 0 ? (
            <div className={styles.pendingNote}>{t('lu.pendingNote', { n: deferredCount })}</div>
          ) : null}
          <div className={styles.illuminateActions}>
            <button type="button" className={styles.primary} onClick={() => onNavigate('raw')}>
              {t('lu.inspect')}
            </button>
            <button type="button" className={styles.ghost} onClick={() => onNavigate('overview')}>
              {t('lu.home')}
            </button>
            <button type="button" className={styles.ghost} onClick={resetStudio}>
              {t('lu.again')}
            </button>
            {failed.length > 0 ? (
              <button type="button" className={styles.ghost} onClick={() => setPhase('shape')}>{t('lu.backToReview')}</button>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <h1 className={styles.studioTitle}>{t('lu.shape')}</h1>
          <p className={styles.studioSub}>
            {t('lu.shapeSub', { n: sheets.length })}
          </p>

          <div className={styles.bulkBar}>
            <button type="button" className={styles.ghost} onClick={() => setSheets((c) => c.map((s) => ({ ...s, status: 'accepted' as const })))}>
              {t('lu.acceptAll', { n: persistable.length })}
            </button>
            <button type="button" className={styles.ghost} disabled={busy} onClick={() => void applyAgentSuggestions()}>
              {t('lu.askAgent')}
            </button>
            {mergePicked.length >= 2 ? (
              <button type="button" className={styles.ghost} onClick={mergeSheets}>{t('lu.mergeSelected', { n: mergePicked.length })}</button>
            ) : null}
            <span className={styles.spacer} />
            <span>{t('lu.willPersist', { n: persistable.length, m: sheets.length - persistable.length })}</span>
            <button type="button" className={styles.primary} disabled={busy || persistable.length === 0} onClick={() => void persist()}>
              {busy ? t('lu.persisting') : t('lu.confirmN', { n: persistable.length })}
            </button>
          </div>

          <div className={styles.shapeHead}>
            {(['overview', 'chunks', 'source'] as const).map((v) => (
              <button key={v} type="button" className={`${styles.viewTab} ${view === v ? styles.on : ''}`} onClick={() => setView(v)}>
                {v === 'overview' ? t('lu.tabOverview') : v === 'chunks' ? t('lu.tabChunks') : t('lu.tabSource')}
              </button>
            ))}
            <span className={styles.shapeCount}>{sheets.length} chunks · {new Set(sheets.map((s) => s.type)).size} types</span>
          </div>

          {view === 'overview' ? (
            <div className={styles.overviewGrid}>
              <div className={styles.statBlock}>
                <div className={styles.statNum}>{sheets.length}</div>
                <div className={styles.statLabel}>{t('lu.units')}</div>
              </div>
              <div className={styles.statBlock}>
                <div className={styles.statNum}>{sheets.filter((s) => s.start !== undefined).length}</div>
                <div className={styles.statLabel}>{t('lu.withRef')}</div>
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
                <div className={styles.statLabel}>{t('lu.types')}</div>
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
                      ? t('lu.sourceSelected')
                      : selectedKey
                        ? t('lu.sourceNoRef')
                        : t('lu.sourcePick')}
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
              <strong style={{ fontSize: 13 }}>{t('lu.queue')}</strong>
              <span className={styles.stateNote}>{t('lu.queueIntro')}</span>
              <span className={styles.spacer} />
              <button type="button" className={styles.ghost} onClick={() => setQueueOpen((v) => !v)}>
                {queueOpen ? t('lu.collapse') : t('lu.expand', { n: proposals.length })}
              </button>
            </div>
            {queueOpen ? (
              <>
                <div className={styles.bulkBar}>
                  <button type="button" className={styles.ghost} disabled={busy} onClick={() => void onDetect()}>{t('lu.runDetector')}</button>
                  <span className={styles.stateNote}>{t('lu.detectorHint')}</span>
                </div>
                {proposals.length === 0 ? (
                  <div className={styles.sourceNote}>{t('lu.queueEmpty')}</div>
                ) : proposals.map((p) => (
                  <div key={p.id} className={styles.createdRow}>
                    <span className={styles.cName} style={{ fontSize: 13 }}>{p.kind}</span>
                    <span className={styles.cType}>{p.proposed_value}</span>
                    <span className={styles.cSrc}>{p.source} · {p.rationale}</span>
                    {p.status === 'pending' ? (
                      <>
                        <button type="button" className={`${styles.action} ${styles.accept}`} disabled={busy} onClick={() => void onResolve(p, 'accepted')}>{t('common.accept')}</button>
                        <button type="button" className={`${styles.action} ${styles.reject}`} disabled={busy} onClick={() => void onResolve(p, 'rejected')}>{t('common.reject')}</button>
                        {!isApplicableProposalKind(p.kind) ? (
                          <span className={styles.stateNote}>{t('lu.resolveOnly')}</span>
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
