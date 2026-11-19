/* UI smoke: composer submit creates a raw.document and lands in Recently. */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9335;
const BASE = process.argv[2] ?? 'http://localhost:5174/';
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-smoke');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
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
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
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
  await send('Page.enable', {}, sessionId);
  const evalJs = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId);

  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1800);

  await evalJs(`(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'UI smoke capture — composer submit');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(300);
  await evalJs(`document.querySelector('[aria-label="Submit"]').click()`);
  await sleep(1500);

  const r = await evalJs(`JSON.stringify({
    text: document.body.innerText.slice(0, 400),
    captured: document.body.innerText.includes('UI smoke capture — composer submit'),
  })`);
  const state = JSON.parse(r.result.value);
  console.log('captured item visible in view:', state.captured);
  console.log('view text head:', state.text.replace(/\n/g, ' | ').slice(0, 260));
  console.log(state.captured ? 'SMOKE PASS' : 'SMOKE FAIL');

  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
