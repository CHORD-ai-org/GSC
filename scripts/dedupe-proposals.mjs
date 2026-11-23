/* P1 hygiene: collapse duplicate pending proposals, then trim per-target+kind
   stacks to the cap (keeping the earliest). Duplicates: same kind+target+value.
   Usage: node scripts/dedupe-proposals.mjs [apiBase] [--dry] [--cap=3] */
const args = process.argv.slice(2);
const API = args[0] && !args[0].startsWith('--') ? args[0] : 'http://127.0.0.1:8788';
const DRY = args.includes('--dry');
const capArg = args.find((a) => a.startsWith('--cap='));
const CAP = capArg ? Number(capArg.slice(6)) : 3;

const list = await fetch(`${API}/api/proposals?status=pending`).then((r) => r.json());

const reject = async (p) => {
  if (DRY) {
    console.log('would reject', p.id.slice(0, 12), p.kind, p.target_id.slice(0, 12), '|', String(p.proposed_value).slice(0, 30));
    return true;
  }
  /* paced + retried: the resolve endpoint is rate-limited and a silent 429 used
     to fake a successful cleanup. */
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const res = await fetch(`${API}/api/proposals/${p.id}/resolve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.ok) return true;
    const wait = Number(res.headers.get('retry-after') ?? 1) * 1000;
    await new Promise((r) => setTimeout(r, Math.max(wait, 200)));
  }
  console.log('REJECT FAILED', p.id.slice(0, 12));
  return false;
};

// pass 1: identical duplicates (same kind+target+value) — keep earliest
const groups = new Map();
for (const p of list.proposals) {
  const key = `${p.kind}:${p.target_id}:${p.proposed_value}`;
  const arr = groups.get(key) ?? [];
  arr.push(p);
  groups.set(key, arr);
}
let collapsed = 0;
for (const arr of groups.values()) {
  if (arr.length <= 1) continue;
  arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const p of arr.slice(1)) {
    if (await reject(p)) collapsed += 1;
  }
}

// pass 2: per target+kind stacks over the cap — keep earliest CAP
const stacks = new Map();
for (const p of list.proposals) {
  const key = `${p.kind}:${p.target_id}`;
  const arr = stacks.get(key) ?? [];
  arr.push(p);
  stacks.set(key, arr);
}
let trimmed = 0;
for (const arr of stacks.values()) {
  if (arr.length <= CAP) continue;
  arr.sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const p of arr.slice(CAP)) {
    if (await reject(p)) trimmed += 1;
  }
}
console.log(`${DRY ? '[dry]' : '[done]'} collapsed ${collapsed} identical duplicates, trimmed ${trimmed} over-cap stack entries (cap=${CAP})`);
