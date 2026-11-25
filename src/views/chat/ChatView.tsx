import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api.ts';
import { useT } from '../../lib/i18n.tsx';
import { TaskCard } from './TaskCard.tsx';
import { FlowPanel } from './FlowPanel.tsx';
import styles from './chat.module.css';

type Msg = api.ChatMessageDTO;

function MessageBlocks({ blocks, onOpenFlow, onOpenItem }: { blocks: api.ChatBlockDTO[]; onOpenFlow: (flowId: string) => void; onOpenItem: (id: string) => void }) {
  return (
    <>
      {blocks.map((b) => {
        if (b.kind === 'note') return <div key={b.id} className={styles.note}>{b.content}</div>;
        if (b.kind === 'operation') return <TaskCard key={b.id} taskId={b.ref_id ?? ''} />;
        if (b.kind === 'reference') return (
          <button key={b.id} type="button" className={styles.refChip} style={{ cursor: 'pointer' }} title={b.ref_id ?? ''} onClick={() => b.ref_id && onOpenItem(b.ref_id)}>
            📄 {b.content}
          </button>
        );
        if (b.kind === 'flow') return (
          <button key={b.id} type="button" className={styles.flowChip} style={{ cursor: 'pointer' }} onClick={() => onOpenFlow(b.ref_id ?? '')}>
            🧩 交互面（Onboarding）— 点击打开
          </button>
        );
        return <div key={b.id} className={styles.bubble} style={{ maxWidth: '100%', padding: '4px 2px' }}>{b.content}</div>;
      })}
    </>
  );
}

/**
 * GSC 对话工作面（GSC_CHAT_PLAN §2 Step 5，V1 骨架）：消息流 + 块渲染 + 任务卡 + 输入。
 * 投影=消息/块 DB 纯函数；发指令→POST messages（同步执行）→刷新。
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

  useEffect(() => {
    load();
  }, [load]);

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
      {title ? <h1 style={{ fontSize: 18, margin: '4px 0 10px' }}>{title}</h1> : null}
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
      <div className={styles.composerRow}>
        <textarea
          className={styles.composerInput}
          rows={1}
          placeholder={t('chat.input')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button type="button" className={styles.sendBtn} disabled={busy || !input.trim()} onClick={() => void send()}>
          ↑
        </button>
      </div>
    </div>
  );
}
