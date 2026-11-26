import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api.ts';
import { useT } from '../../lib/i18n.tsx';
import { TaskCard } from './TaskCard.tsx';
import { FlowPanel } from './FlowPanel.tsx';
import styles from './chat.module.css';

type Msg = api.ChatMessageDTO;

const FLOW_NOTICE = '为了让开发原型页面容纳下更多内容，这里不显示详细内容，在真实对话中这个生成的UI应该弹出来并占据页面右侧的大部分';

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2L13.5 13.5" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M10 2.5V13.5" />
    </svg>
  );
}

function MessageBlocks({ blocks, onOpenFlow, onOpenItem }: { blocks: api.ChatBlockDTO[]; onOpenFlow: (flowId: string) => void; onOpenItem: (id: string) => void }) {
  return (
    <>
      {blocks.map((b) => {
        if (b.kind === 'note') return <div key={b.id} className={styles.note}>{b.content}</div>;
        if (b.kind === 'operation') return <TaskCard key={b.id} taskId={b.ref_id ?? ''} />;
        if (b.kind === 'reference') return (
          <button key={b.id} type="button" className={styles.refChip} style={{ cursor: 'pointer' }} title={b.ref_id ?? ''} onClick={() => b.ref_id && onOpenItem(b.ref_id)}>
            条目 · {b.content.slice(0, 40)}
          </button>
        );
        if (b.kind === 'flow') return (
          <button key={b.id} type="button" className={styles.flowNotice} onClick={() => onOpenFlow(b.ref_id ?? '')}>
            {FLOW_NOTICE}
          </button>
        );
        return <div key={b.id} style={{ fontSize: 13, lineHeight: 1.6, margin: '4px 0' }}>{b.content}</div>;
      })}
    </>
  );
}

/**
 * GSC 对话工作面（UI_PARITY_FIX_PLAN R1/R3/R5）：顶栏 + 浅蓝大泡消息流 + 灰说明块 +
 * 胶囊 composer（附件/模型条只读形态）。
 */
export function ChatView({
  conversationId, title, onConversationsChanged, onOpenItem,
}: {
  conversationId: string;
  title?: string;
  onConversationsChanged?: () => void;
  onOpenItem?: (id: string) => void;
}) {
  const t = useT();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [flowId, setFlowId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('flow'));

  const load = useCallback(() => {
    void api.listMessages(conversationId)
      .then((r) => setMessages(r.messages))
      .catch(() => setMessages([]));
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      await api.sendChatMessage(conversationId, text);
      setInput('');
      load();
      onConversationsChanged?.();
    } catch {
      /* 保留在输入框 */
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 2px 12px', borderBottom: '0.5px solid var(--line)' }}>
        <span style={{ fontSize: 14, fontWeight: 500 }}>{title ?? t('nav.conversations')}</span>
        <span style={{ display: 'flex', gap: 14, color: 'var(--ink-3)' }}>
          <SearchIcon />
          <PanelIcon />
        </span>
      </div>
      <div className={styles.stream} style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 ? (
          <div className={styles.empty}>{t('chat.empty')}</div>
        ) : messages.map((m) => (
          <div key={m.id} className={`${styles.row} ${m.role === 'user' ? styles.rowUser : styles.rowAgent}`}>
            <div className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAgent}`}>
              {m.content ? <div>{m.content}</div> : null}
              <MessageBlocks blocks={m.blocks} onOpenFlow={setFlowId} onOpenItem={onOpenItem ?? (() => undefined)} />
            </div>
          </div>
        ))}
      </div>
      {flowId ? (
        <FlowPanel
          uiflowId={flowId}
          onClose={() => setFlowId(null)}
          onCompleted={() => {
            load();
            onConversationsChanged?.();
          }}
        />
      ) : null}
      <div style={{ paddingTop: 8 }}>
        <textarea
          className={styles.composerCapsule}
          rows={1}
          placeholder="Describe something to build, change, or fix"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <div className={styles.composerMeta}>
          <span className={styles.composerMetaGroup}>
            <span>+</span>
            <span>This computer</span>
            <span>Choose folder</span>
          </span>
          <span className={styles.composerMetaGroup}>
            <span>mimo-v2.6-pro</span>
            <span>High</span>
            <span>Auto</span>
            <button type="button" className={styles.sendBtn} disabled={busy || !input.trim()} onClick={() => void send()} style={{ width: 26, height: 26 }}>↑</button>
          </span>
        </div>
      </div>
    </div>
  );
}
