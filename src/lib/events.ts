export type EventAction =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'relation_added'
  | 'relation_removed'
  | 'opened'
  | 'proposed';

export type EventDTO = {
  id: string;
  item_id: string;
  at: string;
  actor: 'user' | 'agent' | 'system';
  action: EventAction;
  detail: string;
};

/* V3 (M3): edit-level attribution computed from events. Pure — shared by the
   server detail response and the V5 scenario script. */
export type Attribution = {
  user_edits: number;
  agent_edits: number;
  field_owners: Record<string, 'user' | 'agent'>;
};

const FIELD_KEY_RE = /^(title|domain|origin|source_label|status|fields\.[\w.-]+)$/;

export function computeAttribution(events: EventDTO[]): Attribution {
  const out: Attribution = { user_edits: 0, agent_edits: 0, field_owners: {} };
  // listEvents returns desc by time; walk oldest→newest so later edits win field ownership.
  for (const e of [...events].reverse()) {
    if (e.action !== 'updated' && e.action !== 'status_changed') continue;
    const actor = e.actor === 'agent' ? 'agent' : 'user';
    if (e.actor === 'agent') out.agent_edits += 1;
    else out.user_edits += 1;
    const keysPart = e.detail.split('|')[0]; // drop " | via proposal …" suffix
    for (const key of keysPart.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (FIELD_KEY_RE.test(key)) out.field_owners[key] = actor;
    }
  }
  return out;
}
