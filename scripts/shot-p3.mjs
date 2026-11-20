/* P3 acceptance shots: Overview proposal cards/badge clouds + detail main/rail layout. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9366;
const BASE = 'http://localhost:5173/';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-p3');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(url) { for (let i = 0; i < 60; i += 1) { try { const r = await fetch(url); if (r.ok) return r.json(); } catch { /* wait */ } await sleep(250); } throw new Error('timeout'); }
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let seq = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { seq += 1; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) })); });
  return { ws, send, ready: new Promise((r) => ws.addEventListener('open', r)) };
}

const chrome = spawn(CHROME, ['--headless=new','--disable-gpu','--no-sandbox','--hide-scrollbars','--allow-file-access-from-files',`--remote-debugging-port=${PORT}`,`--user-data-dir=${PROFILE}`,'--window-size=1440,900','--disable-breakpad','--disable-crash-reporter','--no-first-run','--no-default-browser-check','about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl); await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  async function evalJs(expression) { return send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId); }
  async function shot(name) { await sleep(650); const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId); writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64')); console.log(`saved ${name}.png`); }
  async function clickText(text) {
    const escaped = text.replace(/'/g, "\\'");
    await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes('${escaped}')); if (b) b.click(); return Boolean(b); })()`);
    await sleep(550);
  }

  await send('Page.navigate', { url: BASE }, sessionId);
  for (let i = 0; i < 40; i += 1) { const r = await evalJs(`document.querySelectorAll('nav button').length`); if ((r.result.value ?? 0) > 0) break; await sleep(250); }
  await sleep(400);

  await clickText('总览');
  await shot('ux-p3-1-overview');

  await clickText('原始信息');
  await evalJs(`document.querySelector('button[class*="listRow"]')?.click()`);
  await sleep(650);
  await shot('ux-p3-2-raw-detail');

  ws.close();
} finally { chrome.kill(); }
