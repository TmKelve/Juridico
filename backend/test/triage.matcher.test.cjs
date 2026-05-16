const test = require('node:test');
const assert = require('node:assert/strict');

test('resolveTriageTarget matches process first, then cpf', async () => {
  const { resolveTriageTarget, inferQueueType, inferSuggestedAction } = require('../dist/triage.matcher.js');

  const processes = [
    { id: 7, processNumber: '10000011120265020001', client: 'Cliente Atlas', clientId: 3 },
  ];
  const clients = [
    { id: 3, cpfCnpj: '123.456.789-00', name: 'Cliente Atlas' },
  ];

  assert.deepEqual(
    resolveTriageTarget(
      { processNumber: '10000011120265020001', cpf: '12345678900', sourceType: 'cnj', normalizedText: 'Sentença publicada.' },
      processes,
      clients,
    ),
    { kind: 'process', processId: 7, clientId: 3 },
  );

  assert.deepEqual(
    resolveTriageTarget(
      { processNumber: '', cpf: '12345678900', sourceType: 'cpf', normalizedText: 'Publicação por CPF.' },
      processes,
      clients,
    ),
    { kind: 'client', processId: null, clientId: 3 },
  );

  assert.equal(inferQueueType('cnj', 'Sentença com prazo recursal'), 'critica');
  assert.equal(
    inferSuggestedAction({
      sourceType: 'cpf',
      queueType: 'normal',
      processId: null,
      clientId: 3,
      hasExistingClient: true,
      normalizedText: 'Publicação por CPF sem processo ativo.',
    }),
    'criar_oportunidade',
  );
});
