/* Headless Chrome CDP screenshots for UI verification (1440x900 exact viewport). */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const BASE = process.argv[2] ?? 'http://localhost:5173/';
const MODE = process.argv[3] === 'dark' ? 'dark' : 'light';
const PREFIX = MODE === 'dark' ? 'dark-' : '';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-uishots');

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

  async function evalJs(expression) {
    return send('Runtime.evaluate', { expression, awaitPromise: true }, sessionId);
  }

  async function shot(name) {
    await sleep(650);
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = path.join(OUT, `${PREFIX}${name}.png`);
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

  async function clickSel(selector) {
    const escaped = selector.replace(/'/g, "\\'");
    await evalJs(`(() => {
      const target = document.querySelector('${escaped}');
      if (target) target.click();
      return Boolean(target);
    })()`);
    await sleep(650);
  }

  await send('Page.navigate', { url: BASE }, sessionId);
  // wait for the app to mount (first load compiles the bundle; 1.8s is not enough)
  for (let i = 0; i < 40; i += 1) {
    const r = await evalJs(`document.querySelectorAll('nav button').length`);
    if ((r.result.value ?? 0) > 0) break;
    await sleep(250);
  }
  await sleep(400);

  await clickText('Settings');
  await clickText(MODE === 'dark' ? 'Dark' : 'Light');
  await clickText('Start');
  await shot('01-start');

  await clickText('Overview');
  await shot('02-overview');

  await clickText('Recently');
  await shot('03-recently');

  await clickText('Raw Information');
  await shot('04-raw-list');
  await clickSel('button[class*="listRow"]');
  await shot('05-raw-detail');
  await clickSel('button[class*="backButton"]');

  await clickText('Structured Objects');
  await shot('06-objects-list');
  await clickSel('button[class*="listRow"]');
  await shot('07-object-detail');
  await clickSel('button[class*="backButton"]');

  await clickText('Contexts');
  await shot('08-contexts-list');
  await clickSel('button[class*="listRow"]');
  await shot('09-context-detail');

  await clickText('Sync');
  await shot('10-sync');

  await clickText('Settings');
  await shot('11-settings');

  await clickText('Start');
  await clickText('画布预览');
  await shot('12-canvas-empty');

  await clickText('画布预览');
  await shot('13-canvas-preview');

  await clickText('Clusters');
  await shot('14-clusters-list');
  await clickSel('button[class*="listRow"]');
  await shot('15-cluster-detail');

  await clickText('Start');
  await clickText('Light Up');
  await shot('16-lightup-manual');

  await clickText('采集管线');
  await evalJs(`(() => {
    const ta = document.querySelector('textarea');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, 'Chunking beats long context for retrieval quality.\\n\\n# Section Two\\nSecond paragraph talks about semantic identity of information units.');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`);
  await sleep(300);
  await clickText('生成审阅');
  await shot('17-lightup-review');

  await clickText('Sync');
  await shot('18-sync-sources');

  await clickText('Export');
  await shot('19-export');

  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
