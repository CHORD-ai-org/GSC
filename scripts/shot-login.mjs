/* LOGIN_REDESIGN_PLAN acceptance: 4 shots (card/split × light/dark) + form
   flow probe (empty submit → error). Requires vite on 5174. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9424;
const BASE = process.argv[2] || 'http://localhost:5174';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-login');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitJson(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try { const res = await fetch(url); if (res.ok) return res.json(); } catch { /* retry */ }
    await sleep(250);
  }
  throw new Error(`timeout waiting for ${url}`);
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

const COMBOS = [
  { name: 'login-card-light', layout: 'card', theme: 'light' },
  { name: 'login-card-dark', layout: 'card', theme: 'dark' },
  { name: 'login-split-light', layout: 'split', theme: 'light' },
  { name: 'login-split-dark', layout: 'split', theme: 'dark' },
];

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });

try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "window.__errs = []; window.addEventListener('error', (e) => window.__errs.push(String(e.message || e.error)));" }, sessionId);

  const probes = {};
  for (const combo of COMBOS) {
    await send('Page.navigate', { url: BASE }, sessionId);
    await sleep(1200);
    await send('Runtime.evaluate', {
      // no gsc.session on purpose — the login page shows when signed out
      expression: `localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.removeItem('gsc.session'); localStorage.setItem('gsc.ui.prefs.v1', JSON.stringify({ theme: '${combo.theme}' }));`,
    }, sessionId);
    const url = combo.layout === 'split' ? `${BASE}/?layout=split` : `${BASE}/`;
    await send('Page.navigate', { url }, sessionId);
    await sleep(combo.name === 'login-card-light' ? 3200 : 1800);

    const probe = await send('Runtime.evaluate', { expression: `
      (() => {
        const oauth = [...document.querySelectorAll('button')].filter((b) => b.textContent.includes('Continue with')).length;
        const inputs = document.querySelectorAll('input').length;
        const submit = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sign in');
        const brand = document.body.textContent.includes('Give information a persistent identity.');
        const sketch = Boolean(document.querySelector('svg[data-sketch], [class*=sketch], [class*=Sketch]'));
        return JSON.stringify({ oauth, inputs, hasSubmit: Boolean(submit), brandStatement: brand, sketchElements: sketch, bodyLen: document.body.innerHTML.length, errs: (window.__errs || []).slice(0, 4), text: document.body.textContent.trim().slice(0, 120) });
      })()
    `, returnByValue: true }, sessionId);
    probes[combo.name] = probe.result?.value;

    const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    writeFileSync(path.join(OUT, `${combo.name}.png`), Buffer.from(shot.data, 'base64'));
    process.stdout.write(`[shot-login] ${combo.name}: ${probe.result?.value}\n`);
  }

  // form flow probe (card-light): empty submit must show the validation error
  await send('Page.navigate', { url: `${BASE}/` }, sessionId);
  await sleep(1500);
  const flow = await send('Runtime.evaluate', { expression: `
    (() => {
      const submit = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Sign in' && b.type === 'submit');
      submit?.click();
      return new Promise((resolve) => setTimeout(() => {
        const err = document.querySelector('[role=alert]');
        resolve(JSON.stringify({ errorShown: Boolean(err), errorText: err?.textContent ?? '' }));
      }, 400));
    })()
  `, awaitPromise: true, returnByValue: true }, sessionId);
  probes.formFlow = flow.result?.value;

  writeFileSync(path.join(OUT, 'login.probe.json'), JSON.stringify(probes, null, 2));
  process.stdout.write(`[shot-login] formFlow: ${flow.result?.value}\nwrote ui-prototype/shots/login-*.png\n`);
  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
