/* Capture the registration receipt flow (RECEIPT_DEMO_PLAN.md):
   sign-in sheet → create account form → the thermal printer prints the
   registration receipt → Continue (tear) → the app. Real end-to-end clicks
   against the dev server + API. Screenshots land in .workbuddy/tmp. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9433;
const BASE = process.argv[2] || 'http://localhost:5174/';
const OUT = path.resolve(process.cwd(), '.workbuddy/tmp');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-receipt');
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
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1200);
  // fresh run every time: the profile keeps localStorage across runs (a stored
  // session would skip the login page and silently capture the wrong screen)
  await send('Runtime.evaluate', { expression: 'localStorage.clear();' }, sessionId);
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1600);

  const shot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const file = path.join(OUT, name);
    writeFileSync(file, Buffer.from(data, 'base64'));
    console.log(`saved ${file}`);
  };
  const evalJs = async (expression, what) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true }, sessionId);
    if (exceptionDetails) throw new Error(`step "${what}" failed: ${exceptionDetails.text}`);
    return result.value;
  };
  const clickText = (label, selector = 'button') => `
    (() => {
      const b = [...document.querySelectorAll('${selector}')].find((x) => x.textContent.trim() === '${label}');
      if (!b) throw new Error('button not found: ${label}');
      b.click();
    })();
  `;

  await shot('receipt-1-signin.png');

  // switch to "Create an account"
  await evalJs(clickText('Create an account'), 'switch to create');
  await sleep(400);
  await evalJs("if (!document.querySelector('input[aria-label=\"Name\"]')) throw new Error('create form not shown');", 'create form visible');

  // fill the form through the React-controlled inputs
  await evalJs(`
    (() => {
      const set = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set(document.querySelector('input[aria-label="Name"]'), 'Ada Lovelace');
      set(document.querySelector('input[aria-label="Email"]'), 'ada@example.com');
      set(document.querySelector('input[aria-label="Password"]'), 'analytical-engine');
    })();
  `, 'fill form');
  await sleep(300);
  await shot('receipt-2-form.png');

  // submit — registration creates the user, then the receipt step replaces the form
  await evalJs("document.querySelector('button[type=submit]').click();", 'submit');
  await sleep(2600); // feed animation + settle
  await evalJs("if (!document.body.textContent.includes('Registration receipt') || !document.body.textContent.includes('Ada Lovelace')) throw new Error('receipt step not shown');", 'receipt step visible');
  await shot('receipt-3-printed.png');

  // Continue tears the receipt off and enters the workspace
  await evalJs(clickText('Continue'), 'continue');
  await sleep(1800);
  await evalJs("if (document.body.textContent.includes('Drag the receipt')) throw new Error('still on receipt step');", 'left receipt step');
  await shot('receipt-4-continued.png');

  ws.close();
} finally {
  chrome.kill();
}
