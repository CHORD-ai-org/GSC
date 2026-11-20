/* P1 acceptance shots: Sync brand wall + connect panel + source cards. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9344;
const BASE = 'http://localhost:5173/';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-p1');
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
  '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter',
  '--no-first-run', '--no-default-browser-check', 'about:blank',
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

  async function evalJs(expression) {
    return send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId);
  }
  async function shot(name) {
    await sleep(650);
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = path.join(OUT, `${name}.png`);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`saved ${file}`);
  }
  async function clickText(text) {
    const escaped = text.replace(/'/g, "\\'");
    await evalJs(`(() => {
      const buttons = [...document.querySelectorAll('button')];
      const target = buttons.find((b) => b.textContent.trim().includes('${escaped}'));
      if (target) target.click();
      return Boolean(target);
    })()`);
    await sleep(550);
  }

  await send('Page.navigate', { url: BASE }, sessionId);
  for (let i = 0; i < 40; i += 1) {
    const r = await evalJs(`document.querySelectorAll('nav button').length`);
    if ((r.result.value ?? 0) > 0) break;
    await sleep(250);
  }
  await sleep(400);

  await clickText('同步');
  await shot('ux-p1-1-sync-wall');

  await clickText('GitHub');
  await shot('ux-p1-2-connect-panel');

  await evalJs(`document.querySelector('[class*="panelOverlay"]').click()`);
  await sleep(400);

  // open ··· menu on first source card if any
  const hasSource = await evalJs(`(() => {
    const b = document.querySelector('[class*="iconButton"]');
    if (b) { b.click(); return true; }
    return false;
  })()`);
  if (hasSource.result.value) {
    await shot('ux-p1-3-source-menu');
    await evalJs(`document.body.click()`);
    await sleep(200);
  } else {
    console.log('no source card present (empty state) — skipping menu shot');
    await shot('ux-p1-3-source-menu');
  }

  ws.close();
} finally {
  chrome.kill();
}
