/* llm:check — one real round-trip against the configured LLM provider.
   Usage: node scripts/llm-check.mjs   (reads .env.local like the API server) */
const [, , ] = process.argv;

try {
  const { readConfig } = await import('../server/config.ts');
  const { chatComplete } = await import('../server/agent/llm.ts');
  const config = readConfig(process.env);

  console.log(`[llm-check] base:  ${config.llmBaseUrl}`);
  console.log(`[llm-check] model: ${config.llmModel}`);
  console.log(`[llm-check] key:   ${config.llmApiKey ? `configured (${config.llmApiKey.slice(0, 4)}…${config.llmApiKey.slice(-4)})` : 'NOT SET'}`);
  if (!config.llmApiKey && !/localhost|127\.0\.0\.1/.test(config.llmBaseUrl)) {
    console.error('[llm-check] FAIL: GSC_LLM_API_KEY is empty — fill it in .env.local');
    process.exit(1);
  }

  const t0 = Date.now();
  const result = await chatComplete(config, [
    { role: 'system', content: 'You are a connectivity probe. Reply with exactly: OK' },
    { role: 'user', content: 'ping' },
  ]);
  const ms = Date.now() - t0;
  const out = (result.content || '').trim().slice(0, 60);
  console.log(`[llm-check] reply: "${out}"  (model=${result.model}, ${ms}ms)`);
  if (!result.content) {
    console.error('[llm-check] FAIL: empty reply');
    process.exit(1);
  }
  console.log('[llm-check] PASS — LLM connectivity OK');
} catch (e) {
  console.error(`[llm-check] FAIL: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
