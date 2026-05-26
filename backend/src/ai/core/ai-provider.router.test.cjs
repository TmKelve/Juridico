const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'core', 'ai-provider.router.js');

test('createAiProviderFromEnv falls back to deterministic provider when remote config is absent', async () => {
  delete process.env.AI_PROVIDER_URL;
  const { createAiProviderFromEnv } = require(modulePath);

  const provider = createAiProviderFromEnv();
  const result = await provider.summarize({
    commandKey: 'ai.summary.generate',
    promptVersion: 'k-v1',
    modelVersion: 'fallback-v1',
    targetType: 'publication',
    targetId: 1,
    sourceText: 'Intimacao para manifestacao em 5 dias. Cliente precisa juntar comprovante.',
  });

  assert.equal(result.meta.mode, 'fallback');
  assert.equal(result.meta.provider, 'deterministic-fallback');
  assert.ok(result.highlights.length >= 1);
});

test('createAiProviderFromEnv uses remote provider when payload is valid', async () => {
  process.env.AI_PROVIDER_URL = 'https://ai.lexora.test';
  global.fetch = async (url) => ({
    ok: true,
    status: 200,
    json: async () => ({
      title: 'Resumo remoto',
      summary: `remote:${url}`,
      highlights: ['item 1'],
      requiresReview: false,
      meta: {
        provider: 'remote-provider',
        modelVersion: 'remote-v1',
        promptVersion: 'k-v1',
        mode: 'live',
        latencyMs: 12,
        tokenUsageInput: 10,
        tokenUsageOutput: 5,
        estimatedCostUsd: 0.00003,
      },
    }),
  });

  const { createAiProviderFromEnv } = require(modulePath);
  const provider = createAiProviderFromEnv();
  const result = await provider.summarize({
    commandKey: 'ai.summary.generate',
    promptVersion: 'k-v1',
    modelVersion: 'remote-v1',
    targetType: 'publication',
    targetId: 1,
    sourceText: 'Texto de teste.',
  });

  assert.equal(result.meta.mode, 'live');
  assert.equal(result.meta.provider, 'remote-provider');
  assert.match(result.summary, /remote:/);

  delete process.env.AI_PROVIDER_URL;
  delete global.fetch;
});
