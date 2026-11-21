/* Canvas tree verification screenshots (D-079). Overview → Canvas tab → expand. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9419;
const BASE = process.argv[2] ?? 'http://localhost:5174';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-canvas');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const res = await fetch(url); if (res.ok) return res.json(); } catch { /* up? */ }
    await sleep(250);
  }
  throw new Error('timeout ' + url);
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    seq += 1; pending.set(seq, { resolve, reject });
    ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  return { ws, send, ready: new Promise((r) => ws.addEventListener('open', r)) };
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad',
  '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank',
], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  const evalJs = (e) => send('Runtime.evaluate', { expression: e, awaitPromise: true }, sessionId);
  async function shot(name) {
    await sleep(500);
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = path.join(OUT, `canvas-${name}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('saved', file);
  }
  async function clickText(text) {
    const r = await evalJs(`(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '${text}');
      if (b) { b.click(); return true; } return false;
    })()`);
    await sleep(500);
    console.log('click', text, '->', r.result.value);
    return r.result.value;
  }

  await send('Page.navigate', { url: `${BASE}/overview` }, sessionId);
  await sleep(1200);
  await evalJs(`localStorage.setItem('gsc.onboarding.done','1')`);
  await send('Page.navigate', { url: `${BASE}/overview` }, sessionId);
  await sleep(1200);

  await clickText('Canvas');
  await shot('1-root');

  // expand one level: click every collapsed toggle ('+')
  await evalJs(`[...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '+').forEach((b) => b.click())`);
  await sleep(500);
  await shot('2-domains');

  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
