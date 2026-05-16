const test = require('node:test');
const assert = require('node:assert/strict');

test('normalizeExternalProcessPayload maps external payload into process lookup contract', async () => {
  const { normalizeExternalProcessPayload } = require('../dist/process-lookup.provider.js');

  const payload = normalizeExternalProcessPayload({
    process: {
      nomeProcesso: 'Execução Fiscal Grupo Solaris',
      poloAtivo: 'Grupo Solaris',
      fase: 'Contestação',
      situacao: 'ativo',
    },
  }, '50011234520263010022');

  assert.deepEqual(payload, {
    processNumber: '50011234520263010022',
    title: 'Execução Fiscal Grupo Solaris',
    client: 'Grupo Solaris',
    phase: 'Contestação',
    status: 'ativo',
  });
});
