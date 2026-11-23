/* V5 attribution reconciliation: compare detail.attribution + events against an
   expected ledger. Usage: node scripts/verify-attribution.mjs [ledger.json] [apiBase] */
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ledgerPath = path.resolve(process.argv[2] || 'data/v5-ledger.json');
const API = process.argv[3] || 'http://127.0.0.1:8788';
const ledger = JSON.parse(readFileSync(ledgerPath, 'utf-8'));

let failed = 0;
const rows = [];
for (const entry of ledger) {
  const detail = await fetch(`${API}/api/items/${entry.item_id}`).then((r) => r.json());
  if (!detail.ok) {
    rows.push({ id: entry.item_id, verdict: 'FAIL', why: `fetch: ${JSON.stringify(detail).slice(0, 60)}` });
    failed += 1;
    continue;
  }
  const a = detail.attribution ?? { user_edits: 0, agent_edits: 0, field_owners: {} };
  const problems = [];
  if (typeof entry.expect.user_edits === 'number' && a.user_edits !== entry.expect.user_edits) {
    problems.push(`user_edits ${a.user_edits}≠${entry.expect.user_edits}`);
  }
  if (typeof entry.expect.agent_edits === 'number' && a.agent_edits !== entry.expect.agent_edits) {
    problems.push(`agent_edits ${a.agent_edits}≠${entry.expect.agent_edits}`);
  }
  for (const [key, owner] of Object.entries(entry.expect.field_owners ?? {})) {
    if (a.field_owners[key] !== owner) problems.push(`field ${key} owner ${a.field_owners[key] ?? '∅'}≠${owner}`);
  }
  if (entry.via) {
    const hit = detail.events.some((e) => e.actor === 'agent' && e.detail.includes(`via proposal ${entry.via}`));
    if (!hit) problems.push(`no via-proposal event for ${entry.via}`);
  }
  if (entry.noEditAfter) {
    /* rejected/deferred proposals must not have produced edit events */
    const touched = detail.events.some((e) => (e.action === 'updated' || e.action === 'status_changed') && e.detail.includes(entry.noEditAfter));
    if (touched) problems.push(`unexpected edit mentioning ${entry.noEditAfter}`);
  }
  const verdict = problems.length === 0 ? 'PASS' : 'FAIL';
  if (verdict === 'FAIL') failed += 1;
  rows.push({ id: entry.item_id.slice(0, 14), label: entry.label ?? '', verdict, why: problems.join('; ') });
}

const w = (s, n) => String(s).padEnd(n);
console.log(w('item', 16), w('label', 28), w('verdict', 8), 'detail');
for (const r of rows) console.log(w(r.id, 16), w(r.label, 28), w(r.verdict, 8), r.why);
console.log(failed === 0 ? `ATTRIBUTION RECONCILIATION PASS (${rows.length} entries)` : `ATTRIBUTION RECONCILIATION FAIL (${failed}/${rows.length})`);
process.exit(failed === 0 ? 0 : 1);
