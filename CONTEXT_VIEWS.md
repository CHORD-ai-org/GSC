# CONTEXT_VIEWS.md — Context Space vs Context View

Phase 04 deliverable. Status: `DECIDED`.

## 1. Definitions

| Concept | Meaning in GSC |
|---|---|
| Context Space | The complete persistent information environment: raw information, objects, relations, events, contexts |
| Context View | An explicitly assembled subset of the Context Space, organized for a subject, scope and purpose |
| Member | An item explicitly added to a Context View by id |

A Context View does not create new information. It selects existing information.

## 2. What Phase 04 implements

- One view type: Knowledge Context.
- Fields: `title`, `subject`, `scope`, `purpose`.
- Explicit ordered `member_ids`.
- Add/remove member actions.
- Open a member to inspect its item detail.
- Persistence in `contexts` and `context_members` tables.

## 3. What a Context View is not

- Not automatic retrieval.
- Not a permission boundary.
- Not a new storage layer for copies of items.
- Not a graph or semantic cluster.
- Not a Thylas Overview section.

## 4. Boundary rule

Context Space answers "what exists?". Context View answers "what did someone explicitly select together?".

If membership cannot be traced to an explicit add action, it does not belong in the MVP Context View.

Phase 05 must evaluate Context Views without claiming dynamic Context Assembly.
