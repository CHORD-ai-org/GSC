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
