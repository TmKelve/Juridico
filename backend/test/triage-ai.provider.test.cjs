const test = require('node:test');
const assert = require('node:assert/strict');

const originalAiUrl = process.env.TRIAGE_AI_URL;
const originalAiToken = process.env.TRIAGE_AI_TOKEN;
const originalAiAuthHeader = process.env.TRIAGE_AI_AUTH_HEADER;

test.after(() => {
  process.env.TRIAGE_AI_URL = originalAiUrl;
  process.env.TRIAGE_AI_TOKEN = originalAiToken;
  process.env.TRIAGE_AI_AUTH_HEADER = originalAiAuthHeader;
});

test('classifyTriageItem classifies critical process publication with heuristic fallback', async () => {
  delete process.env.TRIAGE_AI_URL;
  delete process.env.TRIAGE_AI_TOKEN;
  delete process.env.TRIAGE_AI_AUTH_HEADER;
  const { classifyTriageItem } = require('../dist/triage-ai.provider.js');

  const result = await classifyTriageItem({
    sourceType: 'cnj',
    normalizedText: 'Sentença publicada com prazo recursal e necessidade de manifestação.',
    processTitle: 'Reclamatória Trabalhista Cliente Atlas',
    clientName: 'Cliente Atlas',
    historicalEvents: [{ title: 'Movimentação anterior', summary: 'Histórico crítico.', riskLevel: 'critico' }],
    processId: 1,
    clientId: 1,
    hasExistingClient: true,
  });

  assert.equal(result.queueType, 'critica');
  assert.equal(result.suggestedAction, 'criar_prazo');
  assert.equal(result.aiConfidenceBand, 'alta');
  assert.ok(result.suggestedReason.length > 10);
});

test('classifyTriageItem classifies orphan cpf publication as commercial lead/opportunity', async () => {
  delete process.env.TRIAGE_AI_URL;
  delete process.env.TRIAGE_AI_TOKEN;
  delete process.env.TRIAGE_AI_AUTH_HEADER;
  const { classifyTriageItem } = require('../dist/triage-ai.provider.js');

  const result = await classifyTriageItem({
    sourceType: 'cpf',
    normalizedText: 'Publicação identificada por CPF sem processo ativo.',
    processTitle: null,
    clientName: 'Contato Prospectado',
    historicalEvents: [],
    processId: null,
    clientId: null,
    hasExistingClient: false,
  });

  assert.equal(result.queueType, 'normal');
  assert.equal(result.suggestedAction, 'criar_lead');
});
