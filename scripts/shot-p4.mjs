/* P4 acceptance shots: Ctrl+K palette, "/" menu, empty states. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9377;
const BASE = 'http://localhost:5173/';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-p4');
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
  async function pressCombo(key, code, keyCode) {
    for (const type of ['keyDown', 'keyUp']) {
      await send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode, modifiers: 2 }, sessionId);
    }
    await sleep(350);
  }

  await send('Page.navigate', { url: BASE }, sessionId);
  for (let i = 0; i < 40; i += 1) { const r = await evalJs(`document.querySelectorAll('nav button').length`); if ((r.result.value ?? 0) > 0) break; await sleep(250); }
  await sleep(400);

  // Ctrl+K palette
  await pressCombo('k', 'KeyK', 75);
  await shot('ux-p4-1-palette');

  // type a query
  await send('Input.insertText', { text: 'raw' }, sessionId);
  await sleep(400);
  await shot('ux-p4-2-palette-search');

  await pressCombo('Escape', 'Escape', 27);

  // "/" menu in composer
  await evalJs(`[...document.querySelectorAll('nav button')].find(b=>b.textContent.includes('开始'))?.click()`);
  await sleep(500);
  const ta = await evalJs(`(() => { const ta = document.querySelector('textarea'); if (ta) { ta.focus(); const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; setter.call(ta, '/'); ta.dispatchEvent(new Event('input', { bubbles: true })); return true; } return false; })()`);
  console.log('typed slash:', ta.result.value);
  await sleep(450);
  await shot('ux-p4-3-slash-menu');

  ws.close();
} finally { chrome.kill(); }
