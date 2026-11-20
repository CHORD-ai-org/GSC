import { CommandBar } from '../app/CommandBar.tsx';
import { useState } from 'react';
import { ITEM_GLYPHS, ITEM_LABELS } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { SourceDTO, SourceFrequency, SourceKind } from '../lib/sources.ts';
import { SOURCE_FREQUENCIES, SOURCE_KINDS } from '../lib/sources.ts';
import styles from './views.module.css';

const BRAND: Record<SourceKind, { letter: string; color: string }> = {
  github: { letter: 'G', color: '#181717' },
  notion: { letter: 'N', color: '#000000' },
  drive: { letter: 'D', color: '#4285F4' },
  x: { letter: 'X', color: '#000000' },
};

export function SyncView({
  sources,
  busy,
  error,
  onCreate,
  onTogglePause,
  onDelete,
  onSync,
  onFrequency,
}: {
  sources: SourceDTO[];
  busy: boolean;
  error: string;
  onCreate: (body: { kind: SourceKind; label: string; scope: string; frequency: SourceFrequency; token: string }) => Promise<void>;
  onTogglePause: (source: SourceDTO) => Promise<void>;
  onDelete: (source: SourceDTO) => Promise<void>;
  onSync: (source: SourceDTO) => Promise<void>;
  onFrequency: (source: SourceDTO, frequency: SourceFrequency) => Promise<void>;
}) {
  const [kind, setKind] = useState<SourceKind>('github');
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('issues');
  const [token, setToken] = useState('');

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Sync</h1>
      <p className={styles.pageSub}>连接外部信息源，持续采集进 GSC（Vision §3.2）。同步条目以 <code>sync:&lt;kind&gt;:&lt;ref&gt;</code> 来源标记进入原始信息。</p>

      <div className={styles.section}>
        <h2 className={styles.blockTitle}>连接信息源</h2>
        <div className={styles.toolbar}>
          <select className={styles.select} value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
            {SOURCE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input className={styles.search} placeholder={kind === 'github' ? 'owner/repo' : '源标识（B3-1 待官方接入）'} value={label} onChange={(e) => setLabel(e.target.value)} />
          <input className={styles.search} placeholder="同步范围（scope），如 issues" value={scope} onChange={(e) => setScope(e.target.value)} />
          <input className={styles.search} type="password" placeholder="访问令牌（存本机 .data/secrets.json）" value={token} onChange={(e) => setToken(e.target.value)} />
          <button
            type="button"
            className={styles.primaryButton}
            disabled={busy || !label.trim()}
            onClick={async () => {
              await onCreate({ kind, label: label.trim(), scope, frequency: 'manual', token });
              setLabel('');
              setToken('');
            }}
          >
            连接
          </button>
        </div>
        <div className={styles.hint}>
          v1 仅 GitHub 适配器可同步（issues → raw 条目，按 source_label 去重）。Notion / Drive / X 的官方接入（OAuth + 品牌素材）在 B3-1，需要凭据与外网。
        </div>
      </div>

      {error ? <div className={styles.hint} style={{ color: 'var(--error)' }}>{error}</div> : null}

      <div className={styles.section}>
        <h2 className={styles.blockTitle}>已连接的源</h2>
        {sources.length === 0 ? (
          <div className={styles.emptyLine}>还没有连接任何源。在上方添加第一个。</div>
        ) : sources.map((source) => (
          <div key={source.id} className={styles.sourceCard}>
            <div className={styles.sourceBadge} style={{ background: BRAND[source.kind].color }}>{BRAND[source.kind].letter}</div>
            <div className={styles.sourceMain}>
              <div className={styles.rowTitle}>{source.label} <span className={styles.rowType}>· {source.kind}</span></div>
              <div className={styles.rowType}>
                范围 {source.scope || '—'} · 状态 {source.status} · 上次同步 {source.last_sync_at ? source.last_sync_at.slice(0, 16).replace('T', ' ') : '从未'}
                {source.last_error ? ` · 错误：${source.last_error}` : ''}
              </div>
            </div>
            <select
              className={styles.select}
              value={source.frequency}
              onChange={(e) => void onFrequency(source, e.target.value as SourceFrequency)}
            >
              {SOURCE_FREQUENCIES.map((f) => <option key={f} value={f}>{f === 'daily' ? '每日（调度在 C3-1）' : '手动'}</option>)}
            </select>
            <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => void onSync(source)}>Sync now</button>
            <button type="button" className={styles.secondaryButton} onClick={() => void onTogglePause(source)}>
              {source.status === 'paused' ? '恢复' : '暂停'}
            </button>
            <button type="button" className={styles.removeButton} onClick={() => void onDelete(source)}>断开</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CanvasView({
  items,
  query,
  onQuery,
  selectedId,
  panelOpen,
  onTogglePanel,
  onNew,
  onOpenFile,
  onPreview,
  previewing,
  onOpenItem,
}: {
  items: ItemDTO[];
  query: string;
  onQuery: (value: string) => void;
  selectedId: string;
  panelOpen: boolean;
  onTogglePanel: () => void;
  onNew: () => void;
  onOpenFile: () => void;
  onPreview: () => void;
  previewing: boolean;
  onOpenItem: (id: string) => void;
}) {
  const visible = items.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={styles.canvasArea}>
      <CommandBar query={query} onQuery={onQuery} onNew={onNew} panelOpen={panelOpen} onTogglePanel={onTogglePanel} />
      {!previewing ? (
        <div className={styles.canvasEmpty}>
          <div className={styles.canvasActions}>
            <button type="button" className={styles.canvasRow} onClick={onPreview}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M5 8h6" /></svg>
              <span className={styles.label}>画布预览</span>
            </button>
            <button type="button" className={styles.canvasRow} onClick={onOpenFile}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h6l3.5 3.5v7.5H3z" /><path d="M9 2.5V6h3.5" /></svg>
              <span className={styles.label}>打开文件...</span>
              <span className={styles.quickKey}>Ctrl O</span>
            </button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.canvasEmpty}>
          <div className={styles.hint}>画布上没有匹配的条目。</div>
        </div>
      ) : (
        <div className={styles.canvasGrid}>
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.canvasCard} ${selectedId === item.id ? styles.selected : ''}`}
              onClick={() => onOpenItem(item.id)}
            >
              <span className={styles.cardGlyph}>{ITEM_GLYPHS[item.type]}</span>
              <span className={styles.cardTitle}>{item.title}</span>
              <span className={styles.cardMeta}>{ITEM_LABELS[item.type]} · {item.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportView({
  itemCount,
  contextCount,
  onExportJson,
  onExportMarkdown,
  onExportAgent,
  busy,
}: {
  itemCount: number;
  contextCount: number;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportAgent: () => void;
  busy: boolean;
}) {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Sync</h1>
      <p className={styles.pageSub}>用于数据的同步，导出....（比如导出给 Claude Code 或者是 Codex）</p>
      <div className={styles.countLine}>items: {itemCount} · contexts: {contextCount}</div>
      <div className={styles.exportGrid}>
        <div className={styles.exportCard}>
          <strong>完整数据</strong>
          <span className={styles.exportName}>gsc-export.json</span>
          <span className={styles.exportDesc}>全部条目、关系、历史事件与上下文视图的 JSON 快照。</span>
          <button type="button" className={styles.downloadButton} onClick={onExportJson} disabled={busy}>下载</button>
        </div>
        <div className={styles.exportCard}>
          <strong>Markdown 打包</strong>
          <span className={styles.exportName}>gsc-bundle.md</span>
          <span className={styles.exportDesc}>按条目分节的 Markdown，含来源、关系与修改历史，便于阅读与归档。</span>
          <button type="button" className={styles.downloadButton} onClick={onExportMarkdown} disabled={busy}>下载</button>
        </div>
        <div className={styles.exportCard}>
          <strong>Claude Code / Codex 上下文</strong>
          <span className={styles.exportName}>GSC-CONTEXT.md</span>
          <span className={styles.exportDesc}>放进代码仓库根目录，供 Claude Code 或 Codex 作为共享上下文读取。</span>
          <button type="button" className={styles.downloadButton} onClick={onExportAgent} disabled={busy}>下载</button>
        </div>
      </div>
    </div>
  );
}

export function DocsView() {
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>Documentation</h1>
      <p className={styles.pageSub}>GSC — Global Shared Context。本地 MVP 使用说明。</p>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>视图</h2>
        <ul className={styles.docsList}>
          <li><strong>Start</strong> — 起始页。输入「Ask anything」把内容记录为原始信息；提供画布与文件入口。</li>
          <li><strong>Overview</strong> — Context Space 总入口：数量概览、最近更新、你的 Contexts。</li>
          <li><strong>Recently</strong> — 按时间分组的最近访问与修改。</li>
          <li><strong>Raw Information</strong> — 原始信息（文档 / 消息 / 证据 / 文件内容）列表与详情。</li>
          <li><strong>Structured Objects</strong> — 结构化对象（概念 / 假设 / 方法 / 决策 / 证据引用）。</li>
          <li><strong>Clusters</strong> — 关联分组（多归属，显式成员）。</li>
          <li><strong>Contexts</strong> — 显式组装的知识上下文视图。</li>
          <li><strong>Sync</strong> — 外部信息源连接与持续采集（GitHub issues 等）。</li>
          <li><strong>Export</strong> — 数据导出（JSON / Markdown / Claude Code·Codex 上下文）。</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>快捷键</h2>
        <ul className={styles.docsList}>
          <li><code>Ctrl O</code> — 打开文件并导入画布（raw.filecontent）。</li>
          <li><code>Enter</code> — 提交 Composer 输入（<code>Shift+Enter</code> 换行）。</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>动画</h2>
        <ul className={styles.docsList}>
          <li>页面切换：马赛克瓦片动画，可在 Settings 关闭。</li>
          <li>背景：鼠标跟随点阵动画，质量 Off / Low / Medium / High / Max 在 Settings 调整。</li>
        </ul>
      </div>
    </div>
  );
}
