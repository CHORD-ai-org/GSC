import { CommandBar } from '../app/CommandBar.tsx';
import { ITEM_GLYPHS, ITEM_LABELS } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import styles from './views.module.css';

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

export function SyncView({
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
          <li><strong>Contexts</strong> — 显式组装的知识上下文视图。</li>
          <li><strong>Sync</strong> — 数据导出（JSON / Markdown / Claude Code·Codex 上下文）。</li>
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
