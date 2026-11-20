/* Color-block refactor acceptance shots: skip onboarding, navigate (zh labels),
   shoot main screens -> ui-prototype/shots/cb-*.png. Read-only, clicks only nav/back. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9344;
const BASE = 'http://localhost:5173/';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-cbshot');
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
  const evalJs = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId);
  async function shot(name) {
    await sleep(650);
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = path.join(OUT, `cb-${name}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log('saved', file);
  }
  async function clickText(text) {
    const escaped = text.replace(/'/g, "\\'");
    const r = await evalJs(`(() => {
      const btns = [...document.querySelectorAll('button')];
      const el = btns.find((b) => b.textContent.trim().includes('${escaped}'));
      if (el) { el.click(); return true; } return false;
    })()`);
    await sleep(550);
    console.log('nav', text, '->', r.result.value);
    return r.result.value;
  }
  async function clickSel(selector) {
    const escaped = selector.replace(/'/g, "\\'");
    const r = await evalJs(`(() => { const el = document.querySelector('${escaped}'); if (el) el.click(); return !!el; })()`);
    await sleep(650);
    console.log('sel', selector, '->', r.result.value);
  }

  await send('Page.navigate', { url: BASE }, sessionId);
  const waitNav = async () => {
    for (let i = 0; i < 48; i += 1) {
      const r = await evalJs(`document.querySelectorAll('nav button').length`);
      if ((r.result.value ?? 0) > 0) return true;
      await sleep(250);
    }
    return false;
  };
  await waitNav();
  await evalJs(`localStorage.setItem('gsc.onboarding.done','1')`);
  await send('Page.reload', {}, sessionId);
  await waitNav();
  await sleep(500);

  await clickText('开始'); await shot('start');
  await clickText('原始信息'); await shot('raw-list');
  await clickSel('button[class*="listRow"]'); await shot('raw-detail');
  await clickSel('button[class*="backButton"]');
  await clickText('设置'); await shot('settings');
  await clickText('总览'); await shot('overview');
  await clickText('最近'); await shot('recently');

  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
