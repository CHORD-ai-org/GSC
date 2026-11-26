/**
 * FORAGENTS_PLAN F1：Agent 接入教程——单一内容源=docs/agents/foragents.md（真 .md 文件）。
 * 双形态：GET /api/foragents.md（agent fetch 一等公民）+ 前端 /foragents 视图渲染。
 * 用文件而非 TS 模板字面量：MD 里的反引号不再需要转义（曾因 esbuild/node 对 \` 行为差异翻车）。
 */
import { readFileSync } from 'node:fs';

export const AGENTS_TUTORIAL_MD = readFileSync(
  new URL('../docs/agents/foragents.md', import.meta.url),
  'utf-8',
);
