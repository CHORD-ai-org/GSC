/**
 * GSC push plugin for opencode — thin transport only (G2 capture loop).
 * Dual-loader compatible export (verified against the installed opencode):
 *   - V2 loader reads `id` + `setup(ctx)`
 *   - V1 loader calls `server()` and uses its hooks map
 * Both share one buffer; pushes are deduped per session within 60s.
 *
 * Install: this file + gsc-push.mjs (sibling) into
 *   ~/.config/opencode/plugins/            (global — verified scanned)
 * or <project>/.opencode/plugins/.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = process.env.GSC_PUSH_CLI || path.join(HERE, 'gsc-push.mjs');

const buffer = [];
const recentPush = new Map(); // session -> last push ts (dedupe double-loader)

function extractText(msg) {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  const parts = msg.content ?? msg.parts ?? [];
  if (typeof parts === 'string') return parts;
  return parts
    .map((p) => (typeof p === 'string' ? p : p?.text ?? p?.content ?? ''))
    .filter(Boolean)
    .join('\n');
}

function noteMessage(payload) {
  const msg = payload?.message ?? payload?.part ?? payload?.payload ?? payload;
  const text = extractText(msg).trim();
  if (text) buffer.push({ role: msg?.role ?? 'turn', text });
}

function push(sessionId, projectName) {
  const now = Date.now();
  const last = recentPush.get(sessionId) ?? 0;
  if (now - last < 60_000) return;
  const body = buffer.splice(0).map((m) => `## ${m.role}\n${m.text}`).join('\n\n');
  if (!body.trim()) return;
  recentPush.set(sessionId, now);
  spawn(
    process.execPath,
    [CLI, '--client', 'opencode', '--project', String(projectName), '--session', String(sessionId), '--stdin'],
    { detached: true, stdio: ['pipe', 'ignore', 'ignore'], windowsHide: true },
  ).unref();
}

function handleEvent(type, payload, projectName) {
  if (type === 'message.updated' || type === 'message.part.updated') {
    noteMessage(payload ?? {});
  } else if (type === 'session.idle' && buffer.length > 0) {
    const sessionId = payload?.sessionID ?? payload?.properties?.sessionID ?? `s-${Date.now()}`;
    push(sessionId, projectName);
  }
}

export default {
  id: 'gsc-push',

  /* V2 loader */
  async setup(ctx) {
    const projectName = ctx.project?.name ?? path.basename(process.cwd());
    const controller = new AbortController();
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({
          types: ['session.idle', 'message.updated', 'message.part.updated'],
          signal: controller.signal,
        })) {
          handleEvent(event?.type ?? '', event?.properties ?? event, projectName);
        }
      } catch {
        /* stream aborted — teardown */
      }
    })();
    return () => controller.abort();
  },

  /* V1 loader */
  async server() {
    const projectName = path.basename(process.cwd());
    return {
      event: async ({ event }) => {
        handleEvent(event?.type ?? '', event?.properties ?? event, projectName);
      },
    };
  },
};
