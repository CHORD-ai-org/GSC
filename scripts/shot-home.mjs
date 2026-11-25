/* Home screenshot + recent/pinned element probe (visual audit). */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9425;
const BASE = process.argv[2] || 'http://localhost:5174';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-home');
mkdirSync(OUT, { recursive: true }); mkdirSync(PROFILE, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) { try { const r = await fetch(url); if (r.ok) return r.json(); } catch {} await sleep(250); }
  throw new Error(`timeout ${url}`);
}
function connect(wsUrl) {
  const ws = new WebSocket(wsUrl); let seq = 0; const pending = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const { resolve, reject } = pending.get(m.id); pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { seq += 1; pending.set(seq, { resolve, reject }); ws.send(JSON.stringify({ id: seq, method, params, ...(sessionId ? { sessionId } : {}) })); });
  return { ws, send, ready: new Promise((r) => ws.addEventListener('open', r)) };
}
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl); await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId); await send('Runtime.enable', {}, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId); await sleep(1500);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url: `${BASE}/` }, sessionId); await sleep(2600);
  const probe = await send('Runtime.evaluate', { expression: `
    (() => {
      const hits = [...document.querySelectorAll('button, a, [role=button], [class*=groupLabel], [class*=tab]')]
        .filter((e) => /^(最近|置顶)$/.test(e.textContent.trim()))
        .map((e) => ({ tag: e.tagName, cls: e.className?.toString().slice(0, 90), text: e.textContent.trim(), html: e.outerHTML.slice(0, 260) }));
      return JSON.stringify({ bodyLen: document.body.innerHTML.length, hits });
    })()
  `, returnByValue: true }, sessionId);
  writeFileSync(path.join(OUT, 'home.probe.json'), String(probe.result?.value));
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(path.join(OUT, 'home.png'), Buffer.from(shot.data, 'base64'));
  process.stdout.write(probe.result?.value + '\nwrote ui-prototype/shots/home.png\n');
  await send('Target.closeTarget', { targetId }); ws.close();
} finally { chrome.kill(); }
