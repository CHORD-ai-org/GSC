/* V4 acceptance shot: spatial view + marquee selection + context bar.
   Usage: node scripts/shot-spatial.mjs [url] [out.png] */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9443;
const url = process.argv[2] || 'http://localhost:5174/raw';
const outAbs = path.resolve(process.argv[3] || 'ui-prototype/shots/v4-spatial.png');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-spatial');
mkdirSync(path.dirname(outAbs), { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(u, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const res = await fetch(u); if (res.ok) return res.json(); } catch { /* up? */ }
    await sleep(250);
  }
  throw new Error('timeout');
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

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Page.navigate', { url: 'http://localhost:5174/' }, sessionId);
  await sleep(1500);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local'); localStorage.setItem('gsc.ui.viewmode.v1', '{\"raw\":\"spatial\",\"objects\":\"spatial\"}');" }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await sleep(3800);
  // marquee drag across the card field (content area, past the sidebar)
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 360, button: 'left', clickCount: 1 }, sessionId);
  for (let i = 1; i <= 10; i += 1) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420 + i * 80, y: 360 + i * 38, button: 'left' }, sessionId);
    await sleep(40);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1220, y: 740, button: 'left', clickCount: 1 }, sessionId);
  await sleep(800);
  const diag = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      picked: document.querySelectorAll('[class*="spatPicked"]').length,
      ctxBar: !!document.querySelector('[class*="ctxBar"]'),
      wrap: !!document.querySelector('[class*="spatWrap"]'),
      cards: document.querySelectorAll('[data-card]').length,
      topAtStart: (() => { const el = document.elementFromPoint(420, 360); return el ? (el.getAttribute('class') || el.tagName) : 'none'; })(),
    })`,
    returnByValue: true,
  }, sessionId);
  console.log('DIAG:', diag.result.value);
  /* bring the context bar into view (the card field is tall) */
  await send('Runtime.evaluate', { expression: "document.querySelector('[class*=\"ctxBar\"]')?.scrollIntoView({ block: 'center' }); window.scrollBy(0, -60);" }, sessionId);
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(outAbs, Buffer.from(data, 'base64'));
  console.log(`saved ${outAbs}`);
  ws.close();
} finally {
  chrome.kill();
}
