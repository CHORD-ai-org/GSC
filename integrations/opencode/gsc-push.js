/**
 * GSC push plugin for opencode — thin transport only (G2 capture loop).
 * Accumulates conversation text from message events and pushes the round to
 * GSC via integrations/gsc-push.mjs when the session goes idle.
 *
 * Install: copy/softlink this file into <project>/.opencode/plugins/ (or the
 * global opencode config dir). Requires GSC_PUSH_CLI (absolute path to
 * gsc-push.mjs) in the environment; falls back to a sibling path.
 *
 * NOTE: event payload field names come from the opencode plugin docs but are
 * defensively extracted — verify against your installed opencode version and
 * record any drift in KNOWN_ISSUES.md (same class as codex rollouts).
 */
export const GscPushPlugin = async ({ project, $ }) => {
  const buffer = []; // {role, text} per message update
  const cli = process.env.GSC_PUSH_CLI; // set in opencode.jsonc env if not next to this file
  const projectName = project?.name ?? project?.path?.split(/[\\/]/).pop() ?? 'unknown';

  const extractText = (msg) => {
    if (!msg) return '';
    if (typeof msg === 'string') return msg;
    const parts = msg.content ?? msg.parts ?? [];
    if (typeof parts === 'string') return parts;
    return parts
      .map((p) => (typeof p === 'string' ? p : p.text ?? p.content ?? ''))
      .filter(Boolean)
      .join('\n');
  };

  return {
    event: async ({ event }) => {
      if (event.type === 'message.updated' || event.type === 'message.part.updated') {
        const msg = event.properties?.message ?? event.properties?.part ?? event.message;
        const text = extractText(msg).trim();
        const role = msg?.role ?? 'turn';
        if (text) buffer.push({ role, text });
        return;
      }
      if (event.type === 'session.idle' && buffer.length > 0) {
        const sessionId = event.properties?.sessionID ?? event.sessionID ?? `s-${Date.now()}`;
        const body = buffer.splice(0).map((m) => `## ${m.role}\n${m.text}`).join('\n\n');
        try {
          if (cli) {
            await $`printf "%s" ${body} | node ${cli} --client opencode --project ${projectName} --session ${sessionId} --stdin`.quiet();
          } else {
            await $`printf "%s" ${body} | node ${new URL('./gsc-push.mjs', import.meta.url).pathname} --client opencode --project ${projectName} --session ${sessionId} --stdin`.quiet();
          }
        } catch {
          /* transport failure must never break the session */
        }
      }
    },
  };
};
