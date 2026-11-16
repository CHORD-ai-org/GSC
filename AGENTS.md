# AGENTS.md — Developer and Agent Handoff Rules

Mandatory. Applies to every human developer and coding agent on this repository.

## 1. Read before acting

In this order, every working session:

1. `THINKING.md`
2. `README.md`
3. `PROJECT_CONTEXT.md`
4. `DESIGN_BOUNDARIES.md`
5. `DEVELOPMENT_ROADMAP.md` and the documents relevant to the task
6. `IMPLEMENTATION_STATUS.md`, `DECISION_LOG.md`, `KNOWN_ISSUES.md`
7. The actual code involved

Do not assume prior conversation history exists. If a document and code disagree, code wins for "what exists"; document the drift in `KNOWN_ISSUES.md`.

## 2. Decision states

Use exactly these labels: `DECIDED`, `PROPOSED`, `OPEN`, `DEFERRED`.

- Do not implement a `PROPOSED` or `OPEN` item as if it were `DECIDED`.
- Do not silently skip, reorder, or merge roadmap phases. Record the reason in `DECISION_LOG.md` and wait for confirmation.
- For significant decisions record: decision, reasoning, alternatives, consequences, status, date.

## 3. Task card — required before each meaningful feature

Write these seven items into the working notes or the relevant design document before coding:

1. **Purpose** — what real problem this solves.
2. **Scope** — what is included.
3. **Interacts with** — concrete files/modules/objects.
4. **Does not own** — explicit boundary.
5. **User flow** — concrete actions, screen by screen.
6. **Minimum implementation** — smallest working version.
7. **Test method** — command or manual check with expected result.

Prefer a complete vertical slice over a large unfinished infrastructure layer.

## 4. Boundaries to check before adding anything

- Does this belong to GSC, Thylas, or WAM?
- Is it persistent information or temporary runtime state?
- Is it a product requirement or a technical convenience?
- Does it create a dependency on an agent framework, LLM provider, or Thylas internals? If yes, stop and document.
- Global does not mean unrestricted access. Do not imply universal visibility.

## 5. Documentation is part of implementation

After every meaningful stage, update:

- `IMPLEMENTATION_STATUS.md`
- affected design documents
- `DECISION_LOG.md` when a decision changed
- `KNOWN_ISSUES.md` when a limitation appeared

Never claim completion without verification. Never fabricate a test result.

## 6. Handoff report format

Every stage ends with a short report using exactly these headings:

- Completed
- Modified Files
- Design Decisions
- Assumptions
- Known Issues
- Next Steps
- Verification

## 7. Change discipline

- Do not rewrite unrelated code.
- Do not add dependencies without a recorded justification.
- Do not remove existing functionality without explicit approval.
- Do not silently redefine an established product concept through an implementation choice.
- Do not create a giant JSONB blob as the system of record.
- Do not add vector DB, graph DB, queues, microservices, or autonomous extraction/validation in the MVP.

## 8. Current state reminder

Phase 00 is documentation-only. Substantial implementation requires explicit user review and approval.
