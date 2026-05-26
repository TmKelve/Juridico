const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'ai', 'checklist', 'checklist-suggestion.service.js');

test('ChecklistSuggestionService preserves required checklist and adds contextual suggestions', async () => {
  const { ChecklistSuggestionService } = require(modulePath);

  const service = new ChecklistSuggestionService();
  const result = service.suggest({
    proceduralType: 'trabalhista',
    providedDocumentTypes: ['peticao_inicial'],
    documentCategory: 'audiencia',
    facts: { hasTestemunha: true, observacao: 'Testemunha principal confirmada' },
  });

  assert.equal(result.proceduralType, 'trabalhista');
  assert.equal(result.complete, false);
  assert.ok(result.suggestedItems.some((item) => item.documentType === 'roteiro_audiencia'));
  assert.ok(result.suggestedItems.some((item) => item.documentType === 'rol_testemunhas'));
});
