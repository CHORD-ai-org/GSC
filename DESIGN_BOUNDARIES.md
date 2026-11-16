# DESIGN_BOUNDARIES.md — Scope and Non-Goals

Status: `DECIDED`. Exclusions come from the task brief; MVP type choices were finalized in Phase 01.

## 1. Ownership

| Question | Owner |
|---|---|
| Persistent raw information, structured objects, relationships, provenance, context views | GSC |
| Overview page, Workspaces, Coworkers, conversations, presentation | Thylas |
| Agent runtime, reasoning, planning, tool execution, scheduling | WAM |
| LLM inference | external provider, not GSC core |

If ownership is unclear, record an `OPEN` item in `DECISION_LOG.md` and propose a boundary. Do not implement by default.

## 2. MVP in scope

- Create / read / update / delete raw information and supported structured objects.
- Stable ids and detail views for each item.
- Explicit relationships: object ↔ source, object ↔ object.
- Source metadata and basic modification history.
- Browse and filter by type and domain.
- A small number of explicitly assembled context views (Knowledge Context first).
- Basic persistence and validation.
- A standalone UI prototype that does not depend on Thylas at runtime.

## 3. Explicitly out of scope

Do not implement unless explicitly requested later:

- WAM integration or any agent runtime internals
- Full multi-agent collaboration
- Autonomous knowledge extraction or validation
- Complex semantic search; dedicated vector database
- Graph database
- Distributed infrastructure, queues, microservices
- Enterprise permission management
- Complex conflict resolution
- Automatic memory consolidation
- Fully automated Context Assembly
- Advanced knowledge evolution workflows
- Complete Thylas Overview integration
- Full User / Workspace / Coworker / Artifact domains

## 4. Product boundaries often confused

- Context Space ≠ Context View. The first is the whole environment; the second is an assembled subset.
- Raw Information ≠ Structured Object. Preserving a document is not the same as asserting a claim from it.
- Shared Context ≠ unrestricted access.
- Methodology definition ≠ Methodology execution.
- Configuration text ≠ executable behavior.
- A Thylas section ≠ the entire Overview page.

## 5. Technical boundaries

- Prefer PostgreSQL-compatible persistence. Keep object identity and relationships explicit.
- Do not store the whole system in one JSONB field.
- Keep data access and domain logic reasonably separated.
- Do not introduce specialized databases without a demonstrated need.
- No LLM provider dependency in GSC core.
- No dependency on Thylas source code, stores, or routes. Similarity of visual language is allowed; importing Thylas code is not.

## 6. Integration boundary with Thylas

For now: define a future-facing interface, not an integration. The MVP must expose data in a form a later Thylas section can consume without a rewrite. No Thylas code changes are part of Phase 00–05 unless separately approved.

## 7. Decision rule for changes

A technical convenience may not silently redefine a product concept. If implementation pressure changes the meaning of "Structured Object", "Context", or "provenance", stop, record the conflict, and ask.
