/* Debug: dump page state + console errors for the dev server. */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const BASE = process.argv[2] ?? 'http://localhost:5174/';
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-debug');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

try {
  let info;
  for (let i = 0; i < 40; i += 1) {
    try { info = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch { await sleep(250); }
  }
  const ws = new WebSocket(info.webSocketDebuggerUrl);
  let seq = 0;
  const pending = new Map();
  const logs = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
    if (msg.method === 'Runtime.consoleAPICalled' && (msg.params.type === 'error' || msg.params.type === 'warning')) {
      logs.push(`[console.${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push(`[exception] ${msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text}`);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      logs.push(`[log] ${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      seq += 1;
      pending.set(seq, { resolve, reject });
      ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  await new Promise((r) => ws.addEventListener('open', r));

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(2500);
  const r = await send('Runtime.evaluate', {
    expression: `JSON.stringify({href: location.href, ready: document.readyState, root: document.getElementById('root')?.innerHTML.length ?? -1, text: document.body.innerText.slice(0, 300)})`,
  }, sessionId);
  console.log(r.result.value);
  console.log(logs.join('\n') || '(no console errors)');
  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
