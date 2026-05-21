# Epic CDE

Epic CDE agrupa a frente de CRM, automacao de prazo e gate de qualidade que sustenta o fluxo comercial-operacional do produto.

## Escopo validado
- Conversao de oportunidade CRM em processo operacional.
- Criacao automatica de prazo a partir de publicacao.
- Idempotencia em conversao, automacao e acoes em lote.
- Ambiente previsivel com seed controlado para QA.
- Smoke e validacao de contrato antes de integrar qualquer entrega.

## Artefatos obrigatorios
- [overview.md](overview.md)
- [contracts.md](contracts.md)
- [qa.md](qa.md)
- [runbook.md](runbook.md)
- [changelog.md](changelog.md)
- [../../scripts/test-seed/epic-cde.seed.json](../../scripts/test-seed/epic-cde.seed.json)

## Fonte de verdade
- Backend: contratos e servicos de conversao, prazo e acoes em lote.
- Frontend: telas de CRM, Publicacoes e Prazos.
- Testes: smoke Playwright e testes de contrato/documentacao deste epic.
