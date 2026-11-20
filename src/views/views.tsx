import { CommandBar } from '../app/CommandBar.tsx';
import { useEffect, useRef, useState } from 'react';
import { ITEM_GLYPHS, ITEM_LABELS } from '../lib/items.ts';
import type { ItemDTO } from '../lib/items.ts';
import type { SourceDTO, SourceFrequency, SourceKind } from '../lib/sources.ts';
import { BrandLogo } from '../components/BrandLogo.tsx';
import type { BrandKind } from '../components/BrandLogo.tsx';
import { useRelativeTime, useT } from '../lib/i18n.tsx';
import { Glyph } from '../components/Glyph.tsx';
import styles from './views.module.css';

const SOURCE_BRANDS: { kind: SourceKind; brand: BrandKind; descKey: string }[] = [
  { kind: 'github', brand: 'github', descKey: 'sync.cardGithub' },
  { kind: 'notion', brand: 'notion', descKey: 'sync.cardNotion' },
  { kind: 'drive', brand: 'googledrive', descKey: 'sync.cardDrive' },
  { kind: 'x', brand: 'x', descKey: 'sync.cardX' },
];

const BRAND_OF: Record<SourceKind, BrandKind> = { github: 'github', notion: 'notion', drive: 'googledrive', x: 'x' };
const BRAND_LABEL_OF: Record<SourceKind, string> = { github: 'GitHub', notion: 'Notion', drive: 'Google Drive', x: 'X' };

export function SyncView({
  sources,
  busy,
  error,
  onCreate,
  onTogglePause,
  onDelete,
  onSync,
  onFrequency,
  itemCount,
  contextCount,
  onExportJson,
  onExportMarkdown,
  onExportAgent,
}: {
  sources: SourceDTO[];
  busy: boolean;
  error: string;
  onCreate: (body: { kind: SourceKind; label: string; scope: string; frequency: SourceFrequency; token: string }) => Promise<void>;
  onTogglePause: (source: SourceDTO) => Promise<void>;
  onDelete: (source: SourceDTO) => Promise<void>;
  onSync: (source: SourceDTO) => Promise<void>;
  onFrequency: (source: SourceDTO, frequency: SourceFrequency) => Promise<void>;
  itemCount: number;
  contextCount: number;
  onExportJson: () => void;
  onExportMarkdown: () => void;
  onExportAgent: () => void;
}) {
  const t = useT();
  const [connectKind, setConnectKind] = useState<SourceKind | null>(null);

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('sync.title')}</h1>
      <p className={styles.pageSub}>{t('sync.sub')}</p>

      <div className={styles.section}>
        <h2 className={styles.blockTitle}>{t('sync.wallTitle')}</h2>
        <p className={styles.hint} style={{ margin: '0 0 12px' }}>{t('sync.wallSub')}</p>
        <div className={styles.brandWall}>
          {SOURCE_BRANDS.map((b) => (
            <button key={b.kind} type="button" className={styles.brandCard} onClick={() => setConnectKind(b.kind)}>
              <BrandLogo kind={b.brand} size={28} />
              <span className={styles.brandName}>{BRAND_LABEL_OF[b.kind]}</span>
              <span className={styles.brandDesc}>{t(b.descKey)}</span>
            </button>
          ))}
        </div>
        <div className={styles.hint} style={{ marginTop: 10 }}>{t('sync.v1Only')}</div>
      </div>

      {error ? <div className={styles.hint} style={{ color: 'var(--error)' }}>{error}</div> : null}

      <div className={styles.section}>
        <h2 className={styles.blockTitle}>{t('sync.connected')}</h2>
        {sources.length === 0 ? (
          <div className={styles.emptyLine}>{t('sync.none')}</div>
        ) : (
          <div className={styles.sourceGrid}>
            {sources.map((source) => (
              <SourceCard
                key={source.id}
                source={source}
                busy={busy}
                onTogglePause={onTogglePause}
                onDelete={onDelete}
                onSync={onSync}
                onFrequency={onFrequency}
              />
            ))}
          </div>
        )}
      </div>

      {connectKind ? (
        <ConnectPanel
          kind={connectKind}
          busy={busy}
          onClose={() => setConnectKind(null)}
          onSubmit={async (body) => {
            await onCreate(body);
            setConnectKind(null);
          }}
        />
      ) : null}

      {/* Export section — same page as sync (合并「导出」与「同步」) */}
      <div className={styles.section}>
        <h2 className={styles.blockTitle}>{t('export.title')}</h2>
        <p className={styles.hint} style={{ margin: '0 0 12px' }}>{t('export.sub')}</p>
        <div className={styles.countLine}>items: {itemCount} · contexts: {contextCount}</div>
        <div className={styles.exportGrid}>
          <div className={styles.exportCard}>
            <strong>{t('settings.exportFull')}</strong>
            <span className={styles.exportName}>gsc-export.json</span>
            <span className={styles.exportDesc}>{t('export.fullDesc')}</span>
            <button type="button" className={styles.downloadButton} onClick={onExportJson} disabled={busy}>{t('common.download')}</button>
          </div>
          <div className={styles.exportCard}>
            <strong>{t('settings.exportMd')}</strong>
            <span className={styles.exportName}>gsc-bundle.md</span>
            <span className={styles.exportDesc}>{t('export.mdDesc')}</span>
            <button type="button" className={styles.downloadButton} onClick={onExportMarkdown} disabled={busy}>{t('common.download')}</button>
          </div>
          <div className={styles.exportCard}>
            <strong>{t('settings.exportAgent')}</strong>
            <span className={styles.exportName}>GSC-CONTEXT.md</span>
            <span className={styles.exportDesc}>{t('export.agentDesc')}</span>
            <button type="button" className={styles.downloadButton} onClick={onExportAgent} disabled={busy}>{t('common.download')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Connected source card: logo + status dot + ··· menu (no bare button rows) ── */

function SourceCard({
  source, busy, onTogglePause, onDelete, onSync, onFrequency,
}: {
  source: SourceDTO;
  busy: boolean;
  onTogglePause: (source: SourceDTO) => Promise<void>;
  onDelete: (source: SourceDTO) => Promise<void>;
  onSync: (source: SourceDTO) => Promise<void>;
  onFrequency: (source: SourceDTO, frequency: SourceFrequency) => Promise<void>;
}) {
  const t = useT();
  const rt = useRelativeTime();
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number }>({ right: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  function toggleMenu() {
    if (menu) {
      setMenu(false);
      return;
    }
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const openUp = rect.bottom + 180 > window.innerHeight;
      setMenuPos(openUp
        ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
        : { top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
    setMenu(true);
  }

  useEffect(() => {
    if (!menu) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu(false);
    }
    function close() { setMenu(false); }
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const dotClass = source.status === 'connected' ? styles.dotConnected : source.status === 'paused' ? styles.dotPaused : styles.dotError;
  const statusText = source.status === 'connected' ? t('sync.statusConnected') : source.status === 'paused' ? t('sync.statusPaused') : t('sync.statusError');

  return (
    <div className={styles.sourceCard}>
      <BrandLogo kind={BRAND_OF[source.kind]} size={32} />
      <div className={styles.sourceMain}>
        <div className={styles.sourceTitle}>{source.label}</div>
        <div className={styles.sourceMeta}>
          <span className={`${styles.statusDot} ${dotClass}`} />
          {statusText} · {t('sync.scopeLabel', { scope: source.scope || '—' })} · {source.last_sync_at ? rt(source.last_sync_at) : t('sync.never')}
        </div>
        {source.last_error ? (
          <div className={styles.sourceErrorCard}>
            <span className={styles.sourceErrorText}>{source.last_error}</span>
            <button type="button" className={styles.rowActionButton} title={t('sync.now')} aria-label={t('sync.now')} onClick={() => void onSync(source)}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M13 6.5A5.2 5.2 0 0 0 3.6 5.2" /><path d="M3 2.8v2.6h2.6" /><path d="M3 9.5a5.2 5.2 0 0 0 9.4 1.3" /><path d="M13 13.2v-2.6h-2.6" /></svg>
            </button>
          </div>
        ) : null}
      </div>
      <div className={styles.menuWrap} ref={wrapRef}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label={t('sync.more')}
          onClick={toggleMenu}
        >
          ···
        </button>
        {menu ? (
          <div className={styles.menuPop} style={{ position: 'fixed', top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}>
            <button type="button" className={styles.menuItem} disabled={busy} onClick={() => { setMenu(false); void onSync(source); }}>{t('sync.now')}</button>
            <button type="button" className={styles.menuItem} onClick={() => { setMenu(false); void onTogglePause(source); }}>
              {source.status === 'paused' ? t('sync.resume') : t('sync.pause')}
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => { setMenu(false); void onFrequency(source, source.frequency === 'daily' ? 'manual' : 'daily'); }}
            >
              {t('sync.freqToggle', { mode: source.frequency === 'daily' ? t('sync.manual') : t('sync.dailyShort') })}
            </button>
            <button
              type="button"
              className={`${styles.menuItem} ${styles.menuDanger}`}
              onClick={() => {
                setMenu(false);
                if (window.confirm(t('sync.disconnectConfirm', { label: source.label }))) void onDelete(source);
              }}
            >
              {t('sync.disconnect')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── Connect panel: slide-out, stepped fields (identity → scope → credentials) ── */

function ConnectPanel({
  kind, busy, onClose, onSubmit,
}: {
  kind: SourceKind;
  busy: boolean;
  onClose: () => void;
  onSubmit: (body: { kind: SourceKind; label: string; scope: string; frequency: SourceFrequency; token: string }) => Promise<void>;
}) {
  const t = useT();
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState('issues');
  const [token, setToken] = useState('');

  return (
    <div className={styles.panelOverlay} onClick={onClose}>
      <div className={styles.slidePanel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panelHead}>
          <BrandLogo kind={BRAND_OF[kind]} size={22} />
          <span className={styles.panelTitle}>{t('sync.connectTitle', { brand: BRAND_LABEL_OF[kind] })}</span>
          <button type="button" className={styles.iconButton} aria-label="close" onClick={onClose}>✕</button>
        </div>
        <div className={styles.panelBody}>
          <div className={styles.stepLabel}>{t('sync.step1')}</div>
          <input
            className={styles.settingInput}
            placeholder={kind === 'github' ? t('sync.repoPlaceholder') : t('sync.labelPlaceholder')}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            autoFocus
          />
          <div className={styles.stepLabel}>{t('sync.step2')}</div>
          <input
            className={styles.settingInput}
            placeholder={t('sync.scopePlaceholder')}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          />
          <div className={styles.stepLabel}>{t('sync.step3')}</div>
          <input
            className={styles.settingInput}
            type="password"
            placeholder={kind === 'github' ? t('sync.tokenGithubPlaceholder') : t('sync.tokenPlaceholder')}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoComplete="off"
          />
          <div className={styles.hint} style={{ marginTop: 12 }}>{t('sync.v1Only')}</div>
        </div>
        <div className={styles.panelFoot}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>{t('common.cancel')}</button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={busy || !label.trim()}
            onClick={async () => {
              await onSubmit({ kind, label: label.trim(), scope, frequency: 'manual', token });
            }}
          >
            {t('sync.connectBtn')}
          </button>
        </div>
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
  const t = useT();
  const visible = items.filter((item) => item.title.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className={styles.canvasArea}>
      <CommandBar query={query} onQuery={onQuery} onNew={onNew} panelOpen={panelOpen} onTogglePanel={onTogglePanel} />
      {!previewing ? (
        <div className={styles.canvasEmpty}>
          <div className={styles.canvasActions}>
            <button type="button" className={styles.canvasRow} onClick={onPreview}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2.5" y="3" width="11" height="10" rx="1.5" /><path d="M5 8h6" /></svg>
              <span className={styles.label}>{t('canvas.preview')}</span>
            </button>
            <button type="button" className={styles.canvasRow} onClick={onOpenFile}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 2.5h6l3.5 3.5v7.5H3z" /><path d="M9 2.5V6h3.5" /></svg>
              <span className={styles.label}>{t('canvas.openFile')}</span>
              <span className={styles.quickKey}>Ctrl O</span>
            </button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.canvasEmpty}>
          <div className={styles.hint}>{t('canvas.noMatch')}</div>
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
              <span className={styles.cardGlyph}><Glyph kind={item.type} size={16} /></span>
              <span className={styles.cardTitle}>{item.title}</span>
              <span className={styles.cardMeta}>{ITEM_LABELS[item.type]} · {item.status}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function DocsView() {
  const t = useT();
  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('docs.title')}</h1>
      <p className={styles.pageSub}>{t('docs.sub')}</p>

      <nav className={styles.docsToc}>
        <a href="#doc-views">{t('docs.views')}</a>
        <a href="#doc-hotkeys">{t('docs.hotkeys')}</a>
        <a href="#doc-anim">{t('docs.anim')}</a>
      </nav>

      <div className={styles.section} id="doc-views">
        <h2 className={styles.sectionTitle}>{t('docs.views')}</h2>
        <ul className={styles.docsList}>
          <li><strong>Start</strong> — {t('docs.vStart')}</li>
          <li><strong>Overview</strong> — {t('docs.vOverview')}</li>
          <li><strong>Recently</strong> — {t('docs.vRecently')}</li>
          <li><strong>Raw Information</strong> — {t('docs.vRaw')}</li>
          <li><strong>Structured Objects</strong> — {t('docs.vObjects')}</li>
          <li><strong>Clusters</strong> — {t('docs.vClusters')}</li>
          <li><strong>Contexts</strong> — {t('docs.vContexts')}</li>
          <li><strong>Sync &amp; Export</strong> — {t('docs.vSync')}</li>
        </ul>
      </div>

      <div className={styles.section} id="doc-hotkeys">
        <h2 className={styles.sectionTitle}>{t('docs.hotkeys')}</h2>
        <ul className={styles.docsList}>
          <li><kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>O</kbd> — {t('docs.hOpenFile')}</li>
          <li><kbd className={styles.kbd}>Ctrl</kbd> + <kbd className={styles.kbd}>K</kbd> — {t('docs.hPalette')}</li>
          <li><kbd className={styles.kbd}>Enter</kbd> — {t('docs.hSubmit')}<kbd className={styles.kbd}>Shift</kbd> + <kbd className={styles.kbd}>Enter</kbd>{t('docs.hSubmitTail')}</li>
        </ul>
      </div>

      <div className={styles.section} id="doc-anim">
        <h2 className={styles.sectionTitle}>{t('docs.anim')}</h2>
        <ul className={styles.docsList}>
          <li>{t('docs.animPage')}</li>
          <li>{t('docs.animBg')}</li>
        </ul>
      </div>
    </div>
  );
}
