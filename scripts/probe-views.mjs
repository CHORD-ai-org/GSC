/* V2 zero-copy probe: spy on fetch while switching projections; assert zero
   mutating requests (POST/PATCH/PUT/DELETE). Usage: node scripts/probe-views.mjs [url] */
import { spawn } from 'node:child_process';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9439;
const url = process.argv[2] || 'http://localhost:5174/raw';
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-views');

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
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Page.navigate', { url: 'http://localhost:5174/' }, sessionId);
  await sleep(1500);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url }, sessionId);
  await sleep(3500);
  // install fetch spy BEFORE any view switching
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.__writes = [];
      const orig = window.fetch;
      window.fetch = function (input, init) {
        const m = (init && init.method ? init.method : (typeof input === 'object' && input.method ? input.method : 'GET')).toUpperCase();
        if (m !== 'GET' && m !== 'HEAD') window.__writes.push(m + ' ' + (typeof input === 'string' ? input : input.url));
        return orig.apply(this, arguments);
      };
    })()`,
  }, sessionId);
  const clickByTitle = async (title) => {
    const r = await send('Runtime.evaluate', {
      expression: `(() => { const b = [...document.querySelectorAll('button[title]')].find((x) => x.getAttribute('title') === '${title}' && !x.disabled); if (b) b.click(); return !!b; })()`,
      returnByValue: true,
    }, sessionId);
    await sleep(1400);
    return r.result.value === true;
  };
  let failed = false;
  for (const round of [1, 2]) {
    for (const title of ['关系', '时间线', '列表', '网格', '关系']) {
      const ok = await clickByTitle(title);
      if (!ok) { console.log(`round ${round}: button '${title}' NOT FOUND`); failed = true; }
    }
  }
  if (failed) {
    const titles = await send('Runtime.evaluate', {
      expression: "JSON.stringify([...document.querySelectorAll('button[title]')].map((b) => b.getAttribute('title')))",
      returnByValue: true,
    }, sessionId);
    console.log('available button titles:', titles.result.value);
  }
  const probe = await send('Runtime.evaluate', {
    expression: `JSON.stringify({
      writes: window.__writes,
      nodes: document.querySelectorAll('svg [class*="relNode"]').length,
      tlRows: document.querySelectorAll('[class*="tlRow"]').length,
    })`,
    returnByValue: true,
  }, sessionId);
  const result = JSON.parse(probe.result.value);
  console.log('mutating requests:', result.writes.length, result.writes);
  console.log('rel nodes (last relations view switched away):', result.nodes, '| timeline rows (last view=relations):', result.tlRows);
  console.log(result.writes.length === 0 ? 'ZERO-COPY PASS' : 'ZERO-COPY FAIL');
  ws.close();
} finally {
  chrome.kill();
}
