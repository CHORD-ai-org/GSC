# PRODUCT_VISION.md — Intended Value

Status of vision: `DECIDED` (inherited from the charter and task brief). Information model finalized in Phase 01 — see `INFORMATION_MODEL.md`.

## 1. Value proposition

Information accumulated during human–AI work is normally trapped in conversations, documents, and isolated memory stores. GSC provides a single independent place where original material, semantic objects, their relationships, and their histories can persist and be discovered.

The product is successful if a user can answer, without reconstructing prior chats:

- What do we know about this subject?
- Which source did this claim come from?
- How did this decision or concept change, and why?
- Which objects are related to this one?

## 2. Design principles carried from the charter

| Principle | MVP interpretation |
|---|---|
| Persistent | Information survives sessions and app restarts |
| Structured | Objects have explicit types, identity, and relationships |
| Addressable | Every object and raw item has a stable id and detail view |
| Discoverable | Users can browse and filter; no "inject everything" behavior |
| Governed | Source, author, timestamps, and change history are preserved |
| Evolvable | Objects can be revised and connected without silent mutation |
| Practical utility | Every capability maps to a real user action |

## 3. Model summary

GSC stores two complementary forms of information:

- **Raw Information** — original material preserved with provenance (documents, messages, observations, evidence, imported files). It does not have to be converted into structured objects.
- **Structured Objects** — independent, addressable semantic objects (Concept, Decision, Hypothesis, Methodology, Principle, Experience, Taxonomy, Evidence reference).

Relationships are optional, not mandatory: an object may originate from raw information, reference it, or be created independently. There is no forced extraction pipeline.

Three conceptual levels sit above this: `Information` → `Contextual Objects` → `Context`. They are distinctions of meaning, not three required database layers.

Finalized detail: `INFORMATION_MODEL.md` and the three taxonomy documents.

## 4. Priority domains for the MVP

Only `Knowledge Context` plus a small object set is required. Candidate domains recorded for future reference: User Context, Knowledge Context, Work Context, Coworker Context, Artifact Context, and Context Access & Retrieval. None of these is a required separate database.

## 5. Explicitly not the product

GSC is not a document manager, vector database, chat-memory dump, agent orchestrator, WAM component, or a system that treats generated statements as verified knowledge. Full boundary list: `DESIGN_BOUNDARIES.md`.

## 6. Evolution stance

Evolution must be traceable. A revision, a new relationship, or a status change records who/when/what. Autonomous extraction, autonomous validation, and automatic memory consolidation are out of scope.
