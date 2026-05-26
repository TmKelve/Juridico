const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const providerModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'core', 'ai-provider.port.js');
const serviceModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'recommendation', 'triage-recommendation.service.js');

test('TriageRecommendationService prioritizes deadline creation for critical risk', async () => {
  const { DeterministicAiProvider } = require(providerModulePath);
  const { TriageRecommendationService } = require(serviceModulePath);

  const service = new TriageRecommendationService(new DeterministicAiProvider());
  const result = await service.recommend({
    commandKey: 'ai.recommendation.generate',
    promptVersion: 'k-v1',
    modelVersion: 'fallback-v1',
    correlationId: 'triage-1',
    targetType: 'triage_item',
    targetId: 15,
    policyProfile: 'deadline_sensitive',
    facts: {
      processId: 44,
      riskLevel: 'critico',
      requiresAction: true,
    },
  });

  assert.equal(result.mode, 'created');
  assert.equal(result.data.action, 'criar_prazo');
  assert.equal(result.data.confidenceBand, 'alta');
  assert.equal(result.data.requiresHumanApproval, true);
});

test('TriageRecommendationService rejects missing facts object', async () => {
  const { DeterministicAiProvider } = require(providerModulePath);
  const { TriageRecommendationService } = require(serviceModulePath);

  const service = new TriageRecommendationService(new DeterministicAiProvider());

  await assert.rejects(
    () => service.recommend({
      commandKey: 'ai.recommendation.generate',
      promptVersion: 'k-v1',
      modelVersion: 'fallback-v1',
      targetType: 'triage_item',
      targetId: 15,
      policyProfile: 'default',
      facts: null,
    }),
    /AI_INPUT_INVALID/,
  );
});
