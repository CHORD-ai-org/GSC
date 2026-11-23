/* Probe DOM for activity bars + read the network payload (debug helper).
   Usage: node scripts/probe-bars.mjs <url> */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9435;
const url = process.argv[2] || 'http://localhost:5174/raw';
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-probe');

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

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--window-size=1440,900', '--disable-breakpad', '--disable-crash-reporter', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
try {
  const info = await waitJson(`http://127.0.0.1:${PORT}/json/version`);
  const { ws, send, ready } = connect(info.webSocketDebuggerUrl);
  await ready;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Network.enable', {}, sessionId);
  const payloads = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.method === 'Network.responseReceived' && msg.params?.response?.url?.includes('/api/items')) {
      payloads.push(msg.params.requestId);
    }
  });
  await send('Page.navigate', { url: 'http://localhost:5174/' }, sessionId);
  await sleep(1200);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await sleep(3500);
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const bars = document.querySelectorAll('[class*="activityBar"]');
      const rows = document.querySelectorAll('[class*="listRow"]');
      const row0 = rows[0];
      const timeCell = row0 ? row0.querySelector('[class*="rowTime"]') : null;
      return JSON.stringify({
        barCount: bars.length,
        rowCount: rows.length,
        rowTimeHTML: timeCell ? timeCell.outerHTML.slice(0, 400) : 'no-time-cell',
        rowTimeClass: timeCell ? timeCell.className : '',
      });
    })()`,
    returnByValue: true,
  }, sessionId);
  console.log('DOM:', probe.result.value);
  const pageFetch = await send('Runtime.evaluate', {
    expression: `fetch('/api/items').then((r) => r.json()).then((d) => JSON.stringify({
      items: d.items.length,
      actKeys: Object.keys(d.activity || {}).length,
      sample: Object.entries(d.activity || {})[0] || null,
    }))`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  console.log('PAGE-FETCH:', pageFetch.result.value);
  for (const id of payloads.slice(-1)) {
    try {
      const body = await send('Network.getResponseBody', { requestId: id }, sessionId);
      const json = JSON.parse(body.body);
      console.log('API items:', json.items?.length, 'activity:', JSON.stringify(json.activity).slice(0, 300));
    } catch (e) { console.log('body err', e.message); }
  }
  ws.close();
} finally {
  chrome.kill();
}
