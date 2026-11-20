/**
 * Source adapter contract (Web Intelligence §2): deterministic acquisition.
 * Each SourceKind registers one adapter that turns a configured source into
 * normalized FetchedDocs. Adapters never call the LLM — extraction is
 * reproducible; interpretation happens later in the Light Up pipeline.
 */
import type { SourceKind } from '../../../src/lib/sources.ts';

export type SourceConfig = { label: string; scope: string; token?: string };

export type FetchedDoc = {
  externalId: string; // stable id within the source (URL / issue# / file path)
  url: string; // normalized URL or locator
  title: string;
  contentText: string; // normalized main text
  author?: string;
  publishedAt?: string;
  siteName?: string;
  description?: string;
  metadata?: Record<string, string>;
  rawHash: string; // hash of normalized text (dedupe / change detection)
};

export type ProbeResult = { ok: boolean; message: string };

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface SourceAdapter {
  kind: SourceKind;
  probe(cfg: SourceConfig): Promise<ProbeResult>;
  fetch(cfg: SourceConfig, opts?: { since?: string }, fetchImpl?: FetchLike): Promise<FetchedDoc[]>;
}
