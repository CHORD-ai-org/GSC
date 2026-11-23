#!/usr/bin/env node
/**
 * gsc-push — shared transport for the G2 capture loop. ONLY moves text:
 * harvests conversation excerpts and POSTs them to GSC /api/ingest/batch
 * as a grouped batch (client × project × session). No semantics — naming,
 * classification and block assignment stay with the GSC pipeline (D-042).
 *
 * Usage:
 *   node gsc-push.mjs --client codex --project GSC --session abc123 --file excerpt.txt
 *   node gsc-push.mjs --client opencode --project GSC --session s1 --stdin --title "round"
 *   node gsc-push.mjs --codex-event '{"type":"agent-turn-complete",...}'   (notify hook)
 *   cat notes.md | node gsc-push.mjs --client workbuddy --project GSC --session manual-1
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = process.argv.slice(2);
const opt = (name, fallback = '') => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const API = opt('--api', process.env.GSC_API ?? 'http://127.0.0.1:8788');
const TOKEN = process.env.GSC_TOKEN ?? '';

function fail(msg) {
  process.stderr.write(`[gsc-push] ${msg}\n`);
  process.exit(1);
}

/** Extract text from a codex rollout JSONL (best-effort: format is not a stable API). */
function harvestCodexRollout(text) {
  const docs = [];
  for (const line of text.split('\n')) {
    if (!line.includes('"response_item"')) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const p = rec.payload ?? {};
    if (p.type !== 'message' || !Array.isArray(p.content)) continue;
    const body = p.content
      .map((c) => (typeof c === 'string' ? c : c.text ?? c.content ?? ''))
      .filter(Boolean)
      .join('\n');
    if (body.trim()) {
      docs.push({ title: `${p.role ?? 'turn'} · ${body.trim().slice(0, 24)}`, content_text: body.trim() });
    }
  }
  return docs;
}

async function main() {
  // --codex-event: notify hook entry (argv JSON carries the event)
  let client = opt('--client');
  let project = opt('--project');
  let sessionId = opt('--session');
  let title = opt('--title');
  let text = '';

  const eventIdx = args.indexOf('--codex-event');
  if (eventIdx >= 0) {
    const raw = args[eventIdx + 1] ?? '{}';
    let ev = {};
    try {
      ev = JSON.parse(raw);
    } catch {
      /* tolerate non-JSON argv */
    }
    client = 'codex';
    project = opt('--project', path.basename(process.cwd()));
    sessionId = opt('--session', ev['thread-id'] ?? ev.thread_id ?? process.env.CODEX_THREAD_ID ?? ev['turn-id'] ?? String(Date.now()));
    title = title || `codex turn ${ev['turn-id'] ?? ''}`.trim();
    // locate the session rollout (format not stable — harvest best-effort)
    const root = path.join(os.homedir(), '.codex', 'sessions');
    try {
      const { execSync } = await import('node:child_process');
      const found = execSync(
        `powershell -NoProfile -Command "Get-ChildItem -Path '${root.replace(/\\/g, '\\\\')}' -Recurse -Filter rollout-*.jsonl | Sort-Object LastWriteTime | Select-Object -Last 1 -ExpandProperty FullName"`,
        { encoding: 'utf-8' },
      ).trim();
      if (found) text = readFileSync(found, 'utf-8');
    } catch {
      /* no rollout found — push nothing */
    }
    if (!text.trim()) {
      process.stdout.write('[gsc-push] codex event: no rollout text, nothing to push\n');
      return;
    }
  } else if (args.includes('--file')) {
    text = readFileSync(opt('--file'), 'utf-8');
  } else if (args.includes('--stdin')) {
    text = readFileSync(0, 'utf-8');
  } else {
    fail('need --file, --stdin or --codex-event');
  }

  if (!client) fail('--client required (opencode|codex|workbuddy|manual)');
  if (!project) fail('--project required');
  if (!sessionId) sessionId = `s-${Date.now()}`;

  const isRollout = text.includes('"response_item"');
  const docs = isRollout
    ? harvestCodexRollout(text)
    : [{ title: title || `${client} session ${sessionId}`, content_text: text.trim() }];
  if (docs.length === 0) {
    process.stdout.write('[gsc-push] nothing to push (0 docs)\n');
    return;
  }

  const res = await fetch(`${API}/api/ingest/batch`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: JSON.stringify({ group: { client, project, session_id: sessionId }, docs }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.ok) {
    fail(`push failed (${res.status}): ${JSON.stringify(out).slice(0, 160)}`);
  }
  process.stdout.write(`[gsc-push] ok — imported ${out.imported}, skipped ${out.skipped}, block_proposals ${out.block_proposals}\n`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
