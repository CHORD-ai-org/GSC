# GSC — Product Vision

**Version:** 0.2
**Status:** Vision Draft
**Core Thesis:** A persistent information infrastructure that continuously collects, understands, organizes, and distributes human context.

---

# 1. Vision

GSC is an independent information infrastructure designed to help humans and AI systems continuously accumulate, understand, organize, and reuse information.

Today's AI systems operate across fragmented information environments. Personal knowledge is scattered across conversations, documents, code repositories, social platforms, and individual workspaces. Even when information is collected, it often lacks stable semantic identities, meaningful relationships, and reusable organizational structures.

GSC aims to solve this problem.

It provides a persistent information space where incoming information can be understood, semantically identified, connected to existing knowledge, and made accessible to different AI systems.

GSC is not merely a storage system, a vector database, or a personal knowledge management application.

**GSC turns fragmented information into persistent, addressable, and reusable context.**

# 2. Core Product Philosophy

## 2.1 Information Should Have an Identity

Information should not remain an anonymous collection of text fragments.

Every meaningful information unit should be independently identifiable, understandable, and referenceable.

GSC introduces semantic identification for information Chunks. Instead of exposing users and external Agents to opaque text fragments, GSC gives each Chunk a meaningful semantic name and relevant metadata.

The original content must remain preserved. Semantic names and interpretations enrich the information; they do not replace its source.

## 2.2 Information Should Accumulate Over Time

GSC should continuously collect information from both direct user contributions and connected external sources.

Information should survive individual conversations, projects, applications, and Agent sessions.

The value of GSC should increase as users accumulate more information and establish more meaningful connections between it.

## 2.3 Information Should Be Organized, Not Just Stored

Information needs more than folders and embeddings.

GSC introduces multiple organizational structures:

- Chunks: independently identifiable information units.
- Clusters: groups of related information.
- Contexts: purpose-oriented views over information.
- Meta Tags: semantic descriptors that make information understandable and discoverable.

These structures should complement one another rather than compete to become a universal organizational mechanism.

## 2.4 Context Should Be Accessible Across Applications

GSC should not require users to work exclusively inside its own interface.

External AI products and Agents should be able to access authorized GSC information through stable interfaces.

GSC should become an independent information layer that can serve different applications without depending on a particular Agent Runtime or orchestration framework.

# 3. Information Acquisition — Bringing Information into GSC

GSC needs a dedicated Information Acquisition System.

Its responsibility is to collect information, process it, establish semantic identities, and prepare it for long-term organization.

There are two primary acquisition paths.

## 3.1 Light Up — User-Initiated Information Acquisition

**Light Up** is the name for every user-initiated process of adding new information into GSC.

It is not simply an upload action. It represents the transition of information from an external or temporary state into GSC's persistent information space.

A Light Up can begin with:

- Text written directly by the user.
- Documents and files.
- URLs and online articles.
- Conversation excerpts.
- Code and repository references.
- Other supported information sources.

A proposed Light Up pipeline:

1. **Input** — The user provides information.
2. **Ingestion** — GSC receives and preserves the original content and source information.
3. **Segmentation** — GSC identifies meaningful information Chunks when appropriate.
4. **Semantic Identification** — Each Chunk receives a meaningful semantic name.
5. **Classification** — GSC identifies information types and proposes Meta Tags.
6. **Association** — GSC detects potential relationships with existing Chunks and Clusters.
7. **User Review** — The user reviews, edits, accepts, or rejects proposed organization.
8. **Persistence** — Confirmed information and its organization are saved into GSC.

Not every Light Up needs to execute every step.

A short text entry should be fast. A large document or complex research collection may require more extensive processing.

The experience should offer two onboarding modes:

**A. Manual Input**

Users directly fill in forms, create information units, provide semantic names, and assign organizational metadata.

This mode prioritizes control, predictability, and precision.

**B. Agent-Assisted Pipeline**

Users provide raw information and let GSC's Agent propose segmentation, semantic names, Meta Tags, and Cluster associations.

Users review the results before they become authoritative.

Both modes should lead to the same underlying information model.

## 3.2 Sync — Continuous External Information Acquisition

GSC should provide a dedicated Sync page where users can connect external information sources.

Examples include:

- X
- GitHub
- Notion
- Google Drive
- Other supported applications and services

Users should be able to add a source through its account connection or supported URL-based configuration.

The Sync interface should use recognizable third-party brand assets and logos rather than inventing replacement visual identities.

Each connected source should eventually expose:

- Source identity.
- Connection status.
- Available information scope.
- Synchronization status.
- Last synchronization time.
- User-controlled synchronization settings.

Sync and Light Up have different responsibilities:

- Light Up handles an intentional information contribution.
- Sync handles ongoing acquisition from connected sources.

Synced information should enter the same underlying information infrastructure, preserving source provenance and avoiding an entirely separate data model.

# 4. Information Understanding — Agent and Detector

GSC needs dedicated intelligence components to understand and organize accumulated information.

## 4.1 GSC Agent

The GSC Agent is responsible for interpreting information and helping users organize it.

Its potential responsibilities include:

- Semantic naming of Chunks.
- Information classification.
- Meta Tag recommendation.
- Cluster creation recommendations.
- Identifying potential relationships.
- Detecting relevant existing information.
- Assisting with information organization.

The Agent should operate with access to the existing GSC information space, allowing it to understand new information in relation to what the user has already accumulated.

Its output should distinguish between original content, machine-generated interpretation, and user-confirmed organization.

## 4.2 Detector

Detector is a dedicated mechanism for discovering signals and potential structures within GSC.

It should complement the GSC Agent rather than simply duplicate its responsibilities.

Potential Detector capabilities:

- Detecting related Chunks.
- Discovering potential Cluster membership.
- Identifying duplicate or overlapping information.
- Detecting changes in existing information.
- Finding missing or inconsistent metadata.
- Identifying emerging themes across accumulated information.

A key distinction:

**Agent interprets and proposes. Detector observes and identifies candidates.**

Neither should silently turn uncertain interpretations into authoritative user information.

The exact boundary between Agent and Detector remains an implementation question to be validated through the MVP.

# 5. Information Structure

GSC should support several complementary organizational concepts.

## 5.1 Chunk — The Fundamental Information Unit

A Chunk is an independently identifiable unit of information.

It may represent:

- A research insight.
- A concept definition.
- An observation.
- A decision.
- A meaningful passage from a document.
- A piece of project information.
- A user preference or working principle.

A Chunk should preserve its original content and provenance while supporting additional semantic information.

Potential attributes:

- Semantic Name.
- Original Content or Content Reference.
- Information Type.
- Meta Tags.
- Source.
- Relationships.
- Cluster Membership.
- Context Membership.
- Creation and Update History.

A Chunk should not be treated as merely a technical text segment created for embedding generation.

Semantic identity is a first-class product concept.

## 5.2 Cluster — Related Information Groups

A Cluster is a group of Chunks organized around a common subject, project, activity, or other meaningful association.

Examples:

- Kaggle Competition Project.
- Personal Website Project.
- AI Agent Architecture Research.
- University Application.
- A particular research initiative.

Clusters can be created in two ways:

**Manual Creation**

Users create a Cluster, define its identity, and explicitly add Chunks.

**Detector-Assisted Creation**

Detector identifies recurring relationships or emerging groups and proposes a Cluster for user review.

Clusters should not be restricted to a single rigid hierarchy.

A Chunk may participate in multiple Clusters when appropriate.

A Cluster is an organizational structure, not necessarily a project management workspace or a physical folder.

## 5.3 Context — Purpose-Oriented Information Views

A Context organizes selected information for a particular subject, scope, and purpose.

Examples:

- Knowledge Context.
- User Context.
- Workspace Context.
- Research Context.

Contexts are not equivalent to Clusters.

A Cluster describes an association among information. A Context describes an intentionally organized view of information for a particular purpose.

A Context may reference individual Chunks and other supported information objects without owning or duplicating their original content.

Context Views should remain explicitly manageable and reusable.

## 5.4 Meta Tags — Cross-Context Semantic Descriptors

GSC should introduce a Meta Tag system to describe information through reusable semantic dimensions.

Meta Tags should do more than provide ordinary topical labels.

Potential examples:

| Meta Tag | Meaning |
|---|---|
| Thinking Style | How a person approaches reasoning and problem-solving |
| User Profile | Information describing a user's characteristics, preferences, and working context |
| Expertise | Areas of knowledge or demonstrated experience |
| Interest | Subjects a user is interested in |
| Methodology | Approaches or methods used to accomplish work |
| Project Association | The project or activity an information unit relates to |

A particularly important category is **User Profile**.

User Profile information may be useful across many third-party AI applications. For example, an external coding Agent may need to understand a user's technical background, coding preferences, and working style without requiring the user to repeatedly explain them.

Meta Tags should therefore be:

- Reusable across different information types.
- Semantically understandable by external systems.
- Capable of expressing appropriate scope.
- Governed by user-controlled visibility and permissions.

GSC should avoid allowing arbitrary, inconsistent tags to become an unmanageable taxonomy.

The Meta Tag model should eventually distinguish between tag definitions, assigned values, and the scope in which those values are valid.

# 6. GSC as an External Information Infrastructure

GSC must be independently useful beyond its own Web Dashboard.

It should expose stable interfaces that allow external applications and Agents to access authorized information.

## 6.1 GSC API

The GSC API is the foundational programmatic interface.

It should expose capabilities for:

- Reading and managing Chunks.
- Accessing original information and provenance.
- Managing Clusters.
- Accessing Contexts.
- Reading Meta Tags.
- Searching and discovering information.
- Managing access and permissions.
- Creating and updating information through authorized operations.

The API should provide stable contracts independent of any particular Agent framework.

## 6.2 GSC MCP

GSC should develop its own MCP server.

This allows compatible AI applications to access GSC through the Model Context Protocol.

Initial target environments include:

- Codex.
- Claude Code.
- Pi Agent.
- Other MCP-compatible Agent environments.

Potential MCP capabilities include:

- Discovering relevant information.
- Retrieving a Chunk by identity.
- Browsing Clusters and Contexts.
- Reading user-authorized User Profile information.
- Creating or proposing new information.
- Updating information when explicitly authorized.

MCP should expose meaningful GSC operations rather than simply wrapping every internal database operation.

## 6.3 GSC API Provider

GSC should also provide integration support for applications that prefer a direct API or SDK instead of MCP.

The API Provider layer should make it easier for third-party applications to consume GSC capabilities.

API and MCP should share the same underlying domain contracts and authorization model.

**GSC should be the source of information and context, not the runtime that controls every Agent consuming it.**

# 7. GSC Dashboard — The Human Information Workspace

GSC needs an independent Web Dashboard.

The Dashboard should provide users with a direct way to inspect, understand, organize, and govern their information.

It should not become an administrative control panel.

Its core pages should include:

### Overview

An overview of the user's Context Space.

It should present:

- Information Space summary.
- Recently updated information.
- Existing Clusters.
- Existing Contexts.
- Relevant information organization activity.

### Raw Information

A workspace for inspecting and managing original information.

It should emphasize:

- Original content.
- Source and provenance.
- Information type.
- Semantic identity.
- Related objects and organizational membership.

### Structured Objects

A workspace for managing semantically meaningful objects such as Concepts, Decisions, Methodologies, and Hypotheses.

It should emphasize:

- Definitions.
- Properties.
- Relationships.
- Source information.
- Context membership.

### Clusters

A workspace for browsing and managing related information groups.

It should support manual creation, member management, and future Detector-generated recommendations.

### Contexts

A workspace for creating and maintaining purpose-oriented Context Views.

It should support explicit information membership and future cross-application reuse.

### Sync

A dedicated interface for connecting external information sources and managing synchronization.

### Recently

A convenient entry point for returning to recently accessed or updated information.

### Settings

A place to manage accounts, data, connections, privacy, and access permissions.

# 8. Reimagining the Chunk Interface

The Chunk should receive a dedicated and carefully designed presentation.

A conventional document list is insufficient because Chunks may contain different kinds of information and semantic dimensions.

The interface should make these distinctions visible.

Potential visual directions:

- Different visual regions for original content, semantic identity, metadata, and provenance.
- Stable color semantics for different information categories.
- Source indicators that distinguish original information from generated interpretation.
- Relationship indicators showing Cluster and Context membership.
- Temporal visualization for information creation and evolution.

A useful inspiration is GitHub's contribution visualization: different colors can encode meaningful information states or categories, allowing users to understand a large collection visually.

However, colors must have consistent semantic meanings rather than being assigned arbitrarily.

The goal is not decoration.

**The interface should make the structure of information visible before the user has to inspect every individual field.**

# 9. Shared Clusters and Collaborative Information

GSC should eventually support sharing Clusters between different users.

This creates the possibility of collaborative information spaces.

Examples:

- A team sharing information about a research project.
- Multiple collaborators maintaining a common project Cluster.
- A community sharing a curated collection of resources.
- A research team accumulating and organizing evidence together.

Sharing should not mean transferring ownership of all underlying information.

GSC should distinguish:

- Cluster ownership.
- Cluster membership.
- Shared access.
- Original information ownership.
- Permissions to view, add, edit, or remove information.

A shared Cluster may reference information owned by different users, subject to their authorization.

The sharing model should preserve provenance and prevent access to unrelated private information.

# 10. Product Principles

The following principles should guide GSC's development.

1. **Preserve Before Interpreting** — Original information must remain distinguishable from machine-generated interpretations.
2. **Identity Before Retrieval** — Information should have stable semantic identities, not exist only as anonymous search results.
3. **Explicit Organization Before Automation** — Users must be able to understand and control their information structures.
4. **Automation With Human Governance** — Agents and Detectors propose; users retain authority over consequential changes.
5. **Reusable Context Across Applications** — Information should not be trapped inside a single application or Agent Runtime.
6. **Independent Infrastructure** — GSC must remain independently implementable, useful, and evolvable.
7. **Progressive Complexity** — Simple information should be easy to add; advanced organization should be available when needed.
8. **Provenance and Permission** — Information origin, ownership, and access boundaries must remain visible and enforceable.

# 11. Long-Term Direction

GSC's long-term ambition is to become a persistent information layer shared by humans and their AI systems.

As users accumulate information through different applications, GSC can provide a common foundation for understanding and reusing that information.

A user should be able to:

- Add information once and reuse it across different environments.
- Build a persistent understanding of their own knowledge and working methods.
- Organize information around evolving projects and interests.
- Allow different Agents to access relevant information without rebuilding their understanding from scratch.
- Share selected information structures with collaborators.
- Retain control over how personal and shared information is accessed.

The ultimate goal is not to build another application that remembers conversations.

It is to establish an independent infrastructure through which information can accumulate, acquire meaning, become connected, and remain useful across time and applications.

**GSC — Give Information a Persistent Identity.**
