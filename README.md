# GSC — Global Shared Context

Independent prototype of a persistent context infrastructure for human–AI collaboration.

**Status:** Phase 01 complete — documentation only. No runnable code, schema, API, or UI exists yet.

## Read first

1. `THINKING.md` — active task and standing pre-answer instruction.
2. `AGENTS.md` — mandatory rules for agents and developers.
3. `PROJECT_CONTEXT.md` — purpose and boundaries.
4. `DESIGN_BOUNDARIES.md` — scope and non-goals.
5. `DEVELOPMENT_ROADMAP.md` — phase order, verification, open questions.
6. `PRODUCT_VISION.md` + `INFORMATION_MODEL.md` — product intent and finalized model.
7. `RAW_INFORMATION_TAXONOMY.md`, `STRUCTURED_OBJECT_TAXONOMY.md`, `RELATIONSHIP_MODEL.md` — MVP types and relations.
8. `THYLAS_REFERENCE.md` — verified facts about the reference project.
9. `IMPLEMENTATION_STATUS.md`, `DECISION_LOG.md`, `KNOWN_ISSUES.md` — current state.

Do not rely on conversation history. These files are the source of truth.

## Repository layout (verified 2026-11-16)

```text
GSC/
  README.md                  this file
  THINKING.md                active task record
  AGENTS.md                  developer/agent rules
  PROJECT_CONTEXT.md         purpose, boundaries, consumer relationships
  PRODUCT_VISION.md          intended value; model summary
  INFORMATION_MODEL.md       finalized hybrid + three-level model
  RAW_INFORMATION_TAXONOMY.md    raw item types
  STRUCTURED_OBJECT_TAXONOMY.md  object types and fields
  RELATIONSHIP_MODEL.md          relation kinds and provenance
  DESIGN_BOUNDARIES.md       in scope / out of scope / ownership
  THYLAS_REFERENCE.md        Thylas audit: verified vs assumed
  DEVELOPMENT_ROADMAP.md     Phase 00-05 plan and Phase 01/02 task cards
  IMPLEMENTATION_STATUS.md   what actually works
  DECISION_LOG.md            decisions with status
  KNOWN_ISSUES.md            limitations and unresolved problems
```

No `src/`, `server/`, package manifest, or tests exist yet. They are Phase 02/03 work.

## Environment facts (verified locally, 2026-11-16)

| Item | Result |
|---|---|
| Node | v22.22.2 |
| npm | 10.9.7 |
| Docker | 29.1.5 available |
| PostgreSQL on 127.0.0.1:5432 / 55432 | not reachable |
| `psql` | not installed |
| pnpm | not installed |

PostgreSQL remains the persistence target. Local provisioning is Docker PostgreSQL (`DECISION_LOG.md` D-004, `DECIDED`). No container was started in Phase 01.

## Setup

Not applicable yet. Setup instructions will be added in Phase 03 when a runnable prototype exists.

## Origin

GSC is an independent repository. It was separated from Thylas so that it can be implemented, used, and evolved without depending on WAM, Thylas, or any agent runtime. Thylas is a consumer. The source charter is `D:\github projects\Thylas\docs\product\gsc\MANIFESTO.md`.
