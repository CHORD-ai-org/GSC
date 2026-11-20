/* Generic headless-Chrome page screenshot (1440x900).
   Usage: node scripts/url-shot.mjs <url> <outName> [theme]
   theme: light|dark -> injects data-theme on <html> before shooting. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9412;
const URL_ = process.argv[2];
const NAME = process.argv[3];
const THEME = process.argv[4] === 'dark' ? 'dark' : 'light';
if (!URL_ || !NAME) {
  console.error('usage: node scripts/url-shot.mjs <url> <outName> [light|dark]');
  process.exit(1);
}
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-urlshot');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitJson(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${url}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      seq += 1;
      pending.set(seq, { resolve, reject });
      ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  return { ws, send, ready: new Promise((r) => ws.addEventListener('open', r)) };
}

const chrome = spawn(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900',
  '--disable-breakpad',
  '--disable-crash-reporter',
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
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
  await send('Page.navigate', { url: URL_ }, sessionId);
  await sleep(1500);
  await send('Runtime.evaluate', {
    expression: `document.documentElement.setAttribute('data-theme','${THEME}')`,
  }, sessionId);
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(OUT, `${THEME === 'dark' ? 'dark-' : ''}${NAME}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`saved ${file}`);
  ws.close();
} finally {
  chrome.kill();
}
