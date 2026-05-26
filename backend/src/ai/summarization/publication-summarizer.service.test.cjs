const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const providerModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'core', 'ai-provider.port.js');
const serviceModulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'summarization', 'publication-summarizer.service.js');

test('PublicationSummarizerService returns created summary and replays same correlationId', async () => {
  const { DeterministicAiProvider } = require(providerModulePath);
  const { PublicationSummarizerService } = require(serviceModulePath);

  const service = new PublicationSummarizerService(new DeterministicAiProvider());
  const baseInput = {
    commandKey: 'ai.summary.generate',
    promptVersion: 'k-v1',
    modelVersion: 'fallback-v1',
    correlationId: 'corr-1',
    targetType: 'publication',
    targetId: 77,
    processLabel: 'Proc 77',
    sourceText: 'Intimacao recebida. Manifestar em 48 horas. Validar anexo e confirmar estrategia.',
  };

  const first = await service.summarize(baseInput);
  const second = await service.summarize(baseInput);

  assert.equal(first.mode, 'created');
  assert.equal(second.mode, 'replayed');
  assert.equal(first.data.meta.provider, 'deterministic-fallback');
  assert.equal(second.data.summary, first.data.summary);
});

test('PublicationSummarizerService rejects empty source text', async () => {
  const { DeterministicAiProvider } = require(providerModulePath);
  const { PublicationSummarizerService } = require(serviceModulePath);

  const service = new PublicationSummarizerService(new DeterministicAiProvider());

  await assert.rejects(
    () => service.summarize({
      commandKey: 'ai.summary.generate',
      promptVersion: 'k-v1',
      modelVersion: 'fallback-v1',
      targetType: 'publication',
      targetId: 88,
      sourceText: '   ',
    }),
    /AI_INPUT_INVALID/,
  );
});
