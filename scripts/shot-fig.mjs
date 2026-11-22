/* Generic fixed-viewport HTML → PNG via CDP (chrome-headless-screenshot-cdp skill).
   Usage: node scripts/shot-fig.mjs <input.html> <output.png> <width> <height> */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9431;
const [inFile, outFile, w, h] = process.argv.slice(2);
const WIDTH = Number(w || 1120);
const HEIGHT = Number(h || 620);
const inAbs = path.resolve(inFile);
const outAbs = path.resolve(outFile);
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-fig');
mkdirSync(path.dirname(outAbs), { recursive: true });
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

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, `--window-size=${WIDTH},${HEIGHT}`, '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  // pathToFileURL handles spaces (D:\github projects\... → %20)
  await send('Page.navigate', { url: pathToFileURL(inAbs).href }, sessionId);
  await sleep(900);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(outAbs, Buffer.from(data, 'base64'));
  console.log(`saved ${outAbs}`);
  await send('Target.closeTarget', { targetId }).catch(() => {});
  ws.close();
} finally {
  chrome.kill();
}
