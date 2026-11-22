/* Capture the Raw list in bulk-tag select mode (GAP-10) and the skeleton rows
   (GAP-09). Clicking rows in select mode only toggles local selection — safe. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9422;
const URL_ = process.argv[2] || 'http://localhost:5174/raw';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-bulk');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const res = await fetch(url); if (res.ok) return res.json(); } catch { /* up? */ }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${url}`);
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result); }
  });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { seq += 1; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) })); });
  return { ws, send, ready: new Promise((r) => ws.addEventListener('open', r)) };
}

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  const origin = new URL(URL_).origin;
  await send('Page.navigate', { url: origin }, sessionId);
  await sleep(1200);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url: URL_ }, sessionId);
  await sleep(1800);
  const clickExpr = (label) => `
    (() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '${label}');
      if (b) b.click();
    })();
  `;
  // Enter select mode (「选择」) and pick the first two rows (local selection only).
  await send('Runtime.evaluate', { expression: clickExpr('选择') }, sessionId);
  await sleep(400);
  await send('Runtime.evaluate', { expression: `
    (() => {
      const rows = [...document.querySelectorAll('button[class*="listRow"]')];
      if (rows[0]) rows[0].click();
      if (rows[1]) rows[1].click();
    })();
  ` }, sessionId);
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  const file = path.join(OUT, 'bulk-tag.png');
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`saved ${file}`);
  ws.close();
} finally {
  chrome.kill();
}
