/* Capture a localhost page at fixed viewport via CDP (chrome-headless-screenshot-cdp skill).
   Usage: node scripts/shot-url.mjs <url> <out.png> [width] [height] */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9433;
const [url, outFile, w, h] = process.argv.slice(2);
const WIDTH = Number(w || 1440);
const HEIGHT = Number(h || 900);
const outAbs = path.resolve(outFile);
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-url');
mkdirSync(path.dirname(outAbs), { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(u, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const res = await fetch(u); if (res.ok) return res.json(); } catch { /* up? */ }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${u}`);
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

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, `--window-size=${WIDTH},${HEIGHT}`, '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  const origin = new URL(url).origin;
  await send('Page.navigate', { url: origin }, sessionId);
  await sleep(1200);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  if (process.env.SHOT_VIEW) {
    const preset = `{"raw":"${process.env.SHOT_VIEW}","objects":"${process.env.SHOT_VIEW}"}`;
    await send('Runtime.evaluate', { expression: `localStorage.setItem('gsc.ui.viewmode.v1', '${preset}')` }, sessionId);
  }
  await send('Page.navigate', { url }, sessionId);
  await sleep(3800);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(outAbs, Buffer.from(data, 'base64'));
  console.log(`saved ${outAbs}`);
  ws.close();
} finally {
  chrome.kill();
}
