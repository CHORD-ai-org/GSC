/* P1 hygiene report: pending composition, per-target stacking, duplicate check.
   Exit 1 when hygiene rules are violated (identical duplicates or stacking > cap).
   Usage: node scripts/verify-proposal-hygiene.mjs [apiBase] [--cap=3] */
const args = process.argv.slice(2);
const API = args[0] && !args[0].startsWith('--') ? args[0] : 'http://127.0.0.1:8788';
const capArg = args.find((a) => a.startsWith('--cap='));
const CAP = capArg ? Number(capArg.slice(6)) : 3;

const list = await fetch(`${API}/api/proposals?status=pending`).then((r) => r.json());
const rows = list.proposals;

const byKind = new Map();
const byTargetKind = new Map();
const identical = new Map();
for (const p of rows) {
  byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
  const tk = `${p.kind}:${p.target_id}`;
  byTargetKind.set(tk, (byTargetKind.get(tk) ?? 0) + 1);
  const ik = `${p.kind}:${p.target_id}:${p.proposed_value}`;
  identical.set(ik, (identical.get(ik) ?? 0) + 1);
}

console.log('pending total:', rows.length);
console.log('by kind:', [...byKind.entries()].map(([k, n]) => `${k}=${n}`).join('  '));
const stacked = [...byTargetKind.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
console.log('stacked (target+kind > 1):', stacked.length, stacked.slice(0, 5).map(([k, n]) => `${k.split(':')[1].slice(0, 10)}×${n}`).join('  '));
const dupes = [...identical.entries()].filter(([, n]) => n > 1);
console.log('identical duplicates:', dupes.length);

const overCap = [...byTargetKind.entries()].filter(([, n]) => n > CAP);
if (dupes.length > 0) {
  console.log(`HYGIENE FAIL: ${dupes.length} identical duplicate group(s)`);
  process.exit(1);
}
if (overCap.length > 0) {
  console.log(`HYGIENE FAIL: ${overCap.length} target+kind group(s) over cap ${CAP}`);
  process.exit(1);
}
console.log(`PROPOSAL HYGIENE PASS (cap=${CAP}, no identical duplicates)`);
