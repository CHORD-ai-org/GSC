# PROJECT_CONTEXT.md — Purpose and Boundaries

Status: `DECIDED` (from the task brief and the Thylas manifesto).

## 1. Purpose

GSC (Global Shared Context) organizes, preserves, discovers, and evolves information produced through human and AI collaboration. Its purpose is to let valuable context outlive a single conversation, workspace, or Coworker, so authorized consumers do not rebuild history from scratch.

Central principle:

> GSC must be independently implementable, independently useful, and independently evolvable.

## 2. Repository state

| Item | Verified fact |
|---|---|
| Repository | `D:\github projects\GSC`, branch `main`, one initial commit |
| Files at Phase 00 start | `.gitattributes`, `LICENSE`, `README.md` only |
| Application code | none |
| Package manifest | none |
| Tests | none |
| Documentation | created in Phase 00; see `README.md` |

This is a new independent repository, not a fork or subdirectory of Thylas.

## 3. Relationship with other systems

| System | Owns | Relationship to GSC |
|---|---|---|
| GSC | Persistent information objects, provenance, relationships, context views | The system being built here |
| Thylas | Product experience, Overview, Workspaces, Coworkers, conversation UI | Consumer and presentation environment. GSC may become one section of Overview; it must not own Overview |
| WAM | Agent runtime: reasoning, planning, tool execution, coordination | Not a dependency. No WAM internals in GSC |
| Coworkers | Identities, mind frameworks, methodologies, work history | Potential authorized consumers; not required by the MVP |
| LLM providers | Model inference | Not used by GSC core; no provider dependency in the infrastructure layer |

Thylas Overview currently contains: header, intent input, Continue, Needs you, Workspaces, Recently, and an optional Ask panel. There is no GSC section in code or design docs (`THYLAS_REFERENCE.md`).

## 4. Concept distinctions — do not merge these

| Concept | Meaning |
|---|---|
| Context Space | Complete persistent information environment |
| Raw Information | Original information with source and provenance |
| Structured Object | Independently addressable semantic object |
| Context | Organized view assembled for a subject, scope, purpose, or access boundary |
| Retrieved Context | Information selected for a particular purpose |
| Working Context | Information currently used by a Coworker |
| Shared Context | Information shared among authorized participants |

"Global" describes the scope of the environment, not universal read access. Permission management is deliberately outside the initial MVP, but the model must not imply open access.

## 5. What the MVP must prove

1. Original information can be preserved with source metadata.
2. Structured objects can be created, edited, and addressed.
3. Relationships between raw information and objects, and between objects, can be established and inspected.
4. Information can be organized into a small number of explicit context views.
5. A user can browse and inspect provenance and modification history.
6. The system is useful without WAM, Coworkers, or external AI.

## 6. Source material

The upstream charter is `D:\github projects\Thylas\docs\product\gsc\MANIFESTO.md` (179 lines, verified 2026-11-16). It states architectural independence (§5), six information properties (§2), and what GSC is not (§7). Thylas contains no other GSC documentation and no GSC implementation.
