/* V5 loop runner: spatial marquee → click 提交给 Agent → wait for proposal cards
   → screenshot + dump pending proposals (for the ledger).
   Usage: node scripts/v5-loop.mjs <scenarioTag> [url] */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TAG = process.argv[2] || 'a5';
const url = process.argv[3] || 'http://localhost:5174/raw';
const outAbs = path.resolve(`ui-prototype/shots/m5-${TAG}-delegate.png`);
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9445;
const PROFILE = path.resolve(process.cwd(), `.chrome-shot/profile-v5-${TAG}`);
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

  // count proposals before
  const before = await send('Runtime.evaluate', { expression: "fetch('/api/proposals?status=pending').then((r)=>r.json()).then((d)=>d.proposals.length)", awaitPromise: true, returnByValue: true }, sessionId);
  console.log('pending before:', before.result.value);

  // marquee across the card field
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 420, y: 360, button: 'left', clickCount: 1 }, sessionId);
  for (let i = 1; i <= 10; i += 1) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 420 + i * 80, y: 360 + i * 38, button: 'left' }, sessionId);
    await sleep(40);
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1220, y: 740, button: 'left', clickCount: 1 }, sessionId);
  await sleep(600);

  // click 提交给 Agent (context bar button)
  const clicked = await send('Runtime.evaluate', {
    expression: `(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim().includes('提交给 Agent'));
      if (b) { b.click(); return true; }
      return false;
    })()`,
    returnByValue: true,
  }, sessionId);
  console.log('delegate clicked:', clicked.result.value);
  if (!clicked.result.value) throw new Error('delegate button not found');

  // wait for the LLM round-trip + proposals to fall back (up to 90s)
  let after = before.result.value;
  for (let i = 0; i < 45; i += 1) {
    await sleep(2000);
    const now = await send('Runtime.evaluate', { expression: "fetch('/api/proposals?status=pending').then((r)=>r.json()).then((d)=>d.proposals.length)", awaitPromise: true, returnByValue: true }, sessionId);
    after = now.result.value;
    if (after > before.result.value) break;
  }
  console.log('pending after:', after);

  await send('Runtime.evaluate', { expression: "document.querySelector('[class*=\"ctxBar\"]')?.scrollIntoView({ block: 'center' });" }, sessionId);
  await sleep(400);
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(outAbs, Buffer.from(data, 'base64'));
  console.log(`saved ${outAbs}`);

  // dump the NEW pending proposals (for the ledger + resolution)
  const dump = await send('Runtime.evaluate', {
    expression: `fetch('/api/proposals?status=pending').then((r)=>r.json()).then((d)=>JSON.stringify(d.proposals.slice(-30).map((p)=>({id:p.id,kind:p.kind,target_id:p.target_id,value:p.proposed_value}))))`,
    awaitPromise: true,
    returnByValue: true,
  }, sessionId);
  console.log('NEW-PROPOSALS:', dump.result.value);
  ws.close();
} finally {
  chrome.kill();
}
