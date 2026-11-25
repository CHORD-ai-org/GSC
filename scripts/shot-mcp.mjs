/* MCP_CONFIG_UI_PLAN U-1/U-3 acceptance shot: Settings › 连接 › MCP onboarding card.
   Requires dev servers: npm run api (8788) + vite (5174). */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9422;
const URL_ = process.argv[2] || 'http://localhost:5174/settings';
const OUT = path.resolve(process.cwd(), 'ui-prototype/shots');
const PROFILE = path.resolve(process.cwd(), '.chrome-shot/profile-mcp');
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
  const origin = new URL(URL_).origin;
  await send('Page.navigate', { url: origin }, sessionId);
  await sleep(1200);
  await send('Runtime.evaluate', { expression: "localStorage.setItem('gsc.onboarding.done','1'); localStorage.setItem('gsc.account.done','1'); localStorage.setItem('gsc.session','usr_local');" }, sessionId);
  await send('Page.navigate', { url: URL_ }, sessionId);
  await sleep(2000);

  // Settings › 连接 (connections section hosts TokenSection + McpSection)
  await send('Runtime.evaluate', { expression: `
    (() => {
      const nav = [...document.querySelectorAll('button, a, [role=tab], [class*=settingsNavItem]')]
        .find((el) => el.textContent.trim() === '连接' || el.textContent.trim() === 'Connections');
      if (nav) { nav.click(); return 'clicked:' + nav.textContent.trim(); }
      return 'nav-not-found:' + [...document.querySelectorAll('[class*=settingsNavItem]')].map((e) => e.textContent.trim()).join('|');
    })()
  ` }, sessionId);
  await sleep(1600);

  // scroll the MCP card into view without smooth-scroll (skill pitfall #3)
  const probe = await send('Runtime.evaluate', { expression: `
    (() => {
      document.documentElement.style.scrollBehavior = 'auto';
      const captions = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.includes('MCP 接入'));
      const card = captions[0]?.closest('section');
      const base = { bodyLen: document.body.innerHTML.length, errs: (window.__errs || []).slice(0, 5), url: location.href };
      if (!card) return JSON.stringify({ ...base, found: false, navTexts: [...document.querySelectorAll('[class*=settingsNavItem]')].map((e) => e.textContent.trim()) });
      window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 70);
      const snippet = card.querySelector('pre')?.textContent ?? '';
      const tools = [...document.querySelectorAll('[class*=chipMono]')].map((e) => e.textContent.trim());
      const tabs = [...document.querySelectorAll('[role=tab]')].map((e) => e.textContent.trim());
      const tokenCards = [...document.querySelectorAll('[class*=tokenCard]')].length;
      const intRows = [...document.querySelectorAll('[class*=intRow]')].length;
      return JSON.stringify({ ...base, found: true, hasSnippet: snippet.includes('server/mcp/index.ts'), hasPlaceholder: snippet.includes('GSC_API_TOKEN'), tabs, toolCount: tools.length, tools, tokenCards, intRows });
    })()
  `, returnByValue: true }, sessionId);
  writeFileSync(path.join(OUT, 'mcp-settings.probe.json'), String(probe.result?.value ?? probe));
  await sleep(500);

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(path.join(OUT, 'mcp-settings.png'), Buffer.from(shot.data, 'base64'));
  process.stdout.write(`[shot-mcp] probe: ${probe.result?.value}\n[shot-mcp] wrote ui-prototype/shots/mcp-settings.png\n`);
  await send('Target.closeTarget', { targetId });
  ws.close();
} finally {
  chrome.kill();
}
