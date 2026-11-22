# Phase 06 value validation: execute Scenarios A-D against the live API and
# print an ASCII evidence log. Stdlib only. Usage: python _phase06.py
import json
import os
import sys
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

BASE = os.environ.get('GSC_BASE_URL', 'http://localhost:8788')
TOKEN = os.environ.get('GSC_TOKEN', '')
if not TOKEN:
    sys.exit('Set GSC_TOKEN (mint one with: node scripts/create-token.mjs <name>)')

def call(method, path, body=None):
    req = urllib.request.Request(
        BASE + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'authorization': 'Bearer ' + TOKEN, 'content-type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or '{}')

def item(body):
    s, d = call('POST', '/api/items', body)
    assert s == 201, f'item create {s}: {d}'
    return d['item']['id']

def rel(frm, to, kind):
    s, d = call('POST', '/api/relations', {'from_id': frm, 'to_id': to, 'kind': kind})
    assert s in (200, 201), f'relation {s}: {d}'
    return s

print('=== Scenario A — Research ===')
paper = item({'type': 'raw.document', 'title': 'Paper: Attention Is All You Need',
              'source_label': 'arxiv:1706.03762', 'fields': {'content_text': 'The dominant sequence transduction models are based on recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.'}})
print('A1 paper imported:', paper)
h1 = item({'type': 'object.hypothesis', 'title': 'H1: attention can replace recurrence',
           'fields': {'claim': 'Self-attention alone suffices for sequence transduction.'}})
c1 = item({'type': 'object.concept', 'title': 'Self-Attention',
           'fields': {'definition': 'A mechanism relating different positions of a single sequence.'}})
print('A2 hypothesis+concept created:', h1, c1)
print('A3 derived_from h1->paper:', rel(h1, paper, 'derived_from'))
print('A4 derived_from c1->paper:', rel(c1, paper, 'derived_from'))
print('A5 supports h1->c1:', rel(h1, c1, 'supports'))
s, det = call('GET', f'/api/items/{h1}')
print('A6 inspect h1:', s, 'origin=', det.get('item', {}).get('origin'), 'relations_out=', len(det.get('relations', {}).get('outgoing', [])))

print('=== Scenario B — Knowledge Organization ===')
c2 = item({'type': 'object.concept', 'title': 'Semantic Naming',
           'fields': {'definition': 'Giving information units readable, stable names.'}})
m1 = item({'type': 'object.methodology', 'title': 'Propose-then-Confirm',
           'fields': {'name': 'Propose-then-Confirm', 'steps': '1. machine proposes; 2. human reviews; 3. confirmed entries persist.'}})
print('B1 concept+methodology created:', c2, m1)
print('B2 related_to c2->m1:', rel(c2, m1, 'related_to'))
print('B3 related_to m1->c2:', rel(m1, c2, 'related_to'))
s, det = call('GET', f'/api/items/{m1}')
print('B4 inspect m1 both ends:', s, 'out=', len(det.get('relations', {}).get('outgoing', [])), 'in=', len(det.get('relations', {}).get('incoming', [])))

print('=== Scenario C — Decision Continuity ===')
ev = item({'type': 'raw.evidence', 'title': 'Eval log 2026-11-21',
           'fields': {'content_text': 'Retries with exponential backoff cut provider failures to zero in the run.', 'locator': 'runs/2026-11-21/eval.log#L42'}})
dec = item({'type': 'object.decision', 'title': 'D: keep bounded retries in the LLM adapter',
            'fields': {'statement': 'Keep bounded retry with exponential backoff.',
                       'reasoning': 'Observed zero provider failures once retries were bounded.',
                       'alternatives': 'no retry; unlimited retry', 'consequences': 'adds up to ~8s worst case latency'}})
print('C1 evidence+decision created:', ev, dec)
print('C2 derived_from dec->ev:', rel(dec, ev, 'derived_from'))
s, patched = call('PATCH', f'/api/items/{dec}', {'fields': {'statement': 'Keep bounded retries (max 2).'}})
print('C3 decision edited:', s)
s, det = call('GET', f'/api/items/{dec}')
it = det.get('item', {})
print('C4 inspect decision:', s, 'statement=', (it.get('fields', {}).get('statement') or '')[:40], 'incoming=', len(det.get('relations', {}).get('incoming', [])))

print('=== Scenario D — Context Organization ===')
s, ctx = call('POST', '/api/contexts', {'title': 'Reliability review', 'subject': 'LLM reliability', 'scope': 'adapter layer', 'purpose': 'assemble evidence and decisions for review'})
assert s == 201, f'context {s}: {ctx}'
cid = ctx['context']['id']
print('D1 context created:', cid)
for target in (ev, dec, h1):
    s, d = call('POST', f'/api/contexts/{cid}/members', {'item_id': target})
    print('D2 add member', target, '->', s)
s, cdet = call('GET', f'/api/contexts/{cid}')
print('D3 inspect context members:', s, 'members=', len(cdet.get('context', {}).get('member_ids', cdet.get('member_ids', []))))

print('=== DONE ===')
