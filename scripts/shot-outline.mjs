/* SEMANTIC_TITLE_PLAN batch C acceptance shot: raw detail → outline panel
   (three-state badges) → generate → screenshot. Requires api (8788) + vite. */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9423;
const API = 'http://127.0.0.1:8788';
const BASE = process.argv[2] || 'http://localhost:5175';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-outline');
mkdirSync(OUT, { recursive: true });
mkdirSync(PROFILE, { recursive: true });

const FIXTURE = {
  type: 'raw.document',
  title: '语义标题验收夹具',
  domain: 'knowledge',
  origin: 'user',
  fields: {
    content_text: '# 背景\n\n项目起因与目标概述。\n\n# 方案\n\n分阶段实施路径。\n\n# 排期\n\n本周完成设计。',
  },
};

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

// fixture item via API (heading-mode doc → 3 L1 nodes)
const created = await fetch(`${API}/api/items`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(FIXTURE),
}).then((r) => r.json());
const itemId = created.item?.id;
if (!itemId) throw new Error(`fixture create failed: ${JSON.stringify(created).slice(0, 200)}`);

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
  await send('Page.navigate', { url: BASE }, sessionId);
  await sleep(1500);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url: `${BASE}/raw/${itemId}` }, sessionId);
  await sleep(2500);

  // probe outline panel + click generate
  const before = await send('Runtime.evaluate', { expression: `
    (() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const caption = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === '大纲');
      if (!caption) return JSON.stringify({ found: false, errs: (window.__errs || []).slice(0, 3) });
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('生成语义标题'));
      const rows = [...document.querySelectorAll('[class*=listRow]')]
        .map((r) => r.textContent.trim())
        .filter((t) => /背景|方案|排期|规则名|提案中|已确认/.test(t));
      if (btn) { btn.scrollIntoView(); window.scrollBy(0, -70); btn.click(); }
      return JSON.stringify({ found: true, rows, clicked: Boolean(btn) });
    })()
  `, returnByValue: true }, sessionId);
  await sleep(3500);

  const after = await send('Runtime.evaluate', { expression: `
    (() => {
      const rows = [...document.querySelectorAll('[class*=listRow]')]
        .map((r) => r.textContent.trim())
        .filter((t) => /背景|方案|排期|规则名|提案中|已确认|我的命名/.test(t));
      return JSON.stringify({ rows, errs: (window.__errs || []).slice(0, 3), url: location.href });
    })()
  `, returnByValue: true }, sessionId);

  // four-state acceptance: wait for proposals to land (LLM latency), accept ONE
  let nodeProposal;
  for (let i = 0; i < 20 && !nodeProposal; i += 1) {
    await sleep(1000);
    const pendings = await fetch(`${API}/api/proposals?status=pending`).then((r) => r.json());
    nodeProposal = (pendings.proposals ?? []).find((p) => p.target_path && p.target_id === itemId);
  }
  if (nodeProposal) {
    const res = await fetch(`${API}/api/proposals/${nodeProposal.id}/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'accepted' }),
    });
    process.stdout.write(`[shot-outline] accepted ${nodeProposal.id} (${res.status}) for path ${nodeProposal.target_path}\n`);
    await send('Page.navigate', { url: `${BASE}/raw/${itemId}` }, sessionId);
    await sleep(2500);
  }
  const settled = await send('Runtime.evaluate', { expression: `
    (() => {
      const rows = [...document.querySelectorAll('[class*=listRow]')]
        .map((r) => r.textContent.trim())
        .filter((t) => /背景|方案|排期|规则名|提案中|已确认|我的命名/.test(t));
      return JSON.stringify({ rows, errs: (window.__errs || []).slice(0, 3) });
    })()
  `, returnByValue: true }, sessionId);

  writeFileSync(path.join(OUT, 'outline.probe.json'), JSON.stringify({ item: itemId, before: before.result?.value, after: after.result?.value, settled: settled.result?.value }, null, 2));
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(path.join(OUT, 'outline.png'), Buffer.from(shot.data, 'base64'));
  process.stdout.write(`[shot-outline] item=${itemId}\nbefore: ${before.result?.value}\nafter: ${after.result?.value}\nsettled: ${settled.result?.value}\nwrote ui-prototype/shots/outline.png\n`);
  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
