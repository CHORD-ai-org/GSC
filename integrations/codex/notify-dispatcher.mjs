/**
 * Codex notify dispatcher — chains G2 capture onto the EXISTING notify hook.
 * 1) Forwards all args to the original hook (Codex Desktop computer-use) so the
 *    current behavior is preserved exactly.
 * 2) Best-effort hands the event to integrations/gsc-push.mjs (--codex-event).
 * Never throws: a GSC failure must not break Codex Desktop notifications.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ORIGINAL_HOOK = 'C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.1117.4957.0_x64__2p2nqsd0c76g0\\app\\resources\\cua_node\\bin\\node_modules\\@oai\\sky\\bin\\windows\\codex-computer-use.exe';

const args = process.argv.slice(2);

// 1) original hook (Codex Desktop) — detached pass-through
try {
  spawn(ORIGINAL_HOOK, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
} catch {
  /* keep going — GSC push must still run */
}

// 2) G2 push — best-effort
try {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cli = path.join(here, '..', 'gsc-push.mjs');
  const ev = args[0] ?? '{}';
  spawn(
    process.execPath,
    [cli, '--codex-event', ev, '--project', path.basename(process.cwd())],
    { detached: true, stdio: 'ignore', windowsHide: true },
  ).unref();
} catch {
  /* swallow — transport failure never breaks the notify chain */
}

// give the detached children a moment to spawn, then exit
setTimeout(() => process.exit(0), 200);
void os;
