export const PROPOSAL_KINDS = [
  'semantic_name',
  'classification',
  'meta_tag',
  'association',
  'cluster',
] as const;

export type ProposalKind = (typeof PROPOSAL_KINDS)[number];

export const PROPOSAL_STATUSES = ['pending', 'accepted', 'rejected'] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

export const PROPOSAL_SOURCES = ['agent', 'detector'] as const;
export type ProposalSource = (typeof PROPOSAL_SOURCES)[number];

export type ProposalDTO = {
  id: string;
  kind: ProposalKind;
  target_id: string;
  related_id: string;
  proposed_value: string;
  rationale: string;
  source: ProposalSource;
  status: ProposalStatus;
  created_at: string;
  resolved_at: string;
};

export type CreateProposalBody = {
  kind: ProposalKind;
  target_id: string;
  related_id?: string;
  proposed_value: string;
  rationale?: string;
  source?: ProposalSource;
};

export type ResolveProposalBody = {
  status: 'accepted' | 'rejected';
};

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isProposalKind(value: unknown): value is ProposalKind {
  return typeof value === 'string' && (PROPOSAL_KINDS as readonly string[]).includes(value);
}

export function validateCreateProposalBody(value: unknown): value is CreateProposalBody {
  if (typeof value !== 'object' || value === null) return false;
  const b = value as Record<string, unknown>;
  return isProposalKind(b.kind)
    && nonEmptyString(b.target_id)
    && nonEmptyString(b.proposed_value)
    && (b.related_id === undefined || typeof b.related_id === 'string')
    && (b.rationale === undefined || typeof b.rationale === 'string')
    && (b.source === undefined || (PROPOSAL_SOURCES as readonly string[]).includes(b.source as string));
}

export function validateResolveProposalBody(value: unknown): value is ResolveProposalBody {
  if (typeof value !== 'object' || value === null) return false;
  return (value as Record<string, unknown>).status === 'accepted' || (value as Record<string, unknown>).status === 'rejected';
}
