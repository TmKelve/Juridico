# QA do Publication Origin Rework

## Escopo validado
- Presença da documentação obrigatória do pacote.
- Alinhamento entre contrato soberano, endpoints novos e compatibilidade exigida.
- Smoke mínimo das superfícies afetadas: `Publicações`, `Triagem`, `Clientes` e `CRM Jurídico`.
- Registro explícito dos gaps que dependem do orquestrador.

## Riscos principais
- Drift entre o contrato soberano e a resposta real das rotas existentes após o wiring do backend principal.
- O frontend atual pode navegar normalmente mesmo sem exibir todos os campos de origem, mascarando lacunas de integração.
- O smoke com mocks não substitui a validação ponta a ponta de `GET /publication-captures*` e `GET /publication-pipeline*`.
- Links de evidência e timeline podem existir no contrato antes de existirem no runtime final.

## Testes recomendados ou executados
- `node --test backend/test/publication-origin-rework.contract.test.cjs backend/tests/publication-origin-rework.docs.test.cjs`
- `npm --prefix frontend exec playwright test frontend/publication-origin-rework.smoke.test.ts`
- `npm --prefix backend run build`
- `npm --prefix frontend run build`

## Lacunas de cobertura
- Sem wiring real do orquestrador, o smoke valida encaixe de UX e contrato, não o percurso persistido de captura -> consolidação -> ação derivada.
- Não há execução HTTP real dos endpoints `GET /publication-captures*` e `GET /publication-pipeline*` nesta entrega.
- O pacote não confirma autorização real por perfil para evidência/timeline porque isso depende das rotas finais do backend.

## Evidencias minimas para sign-off
- Pasta `docs/publication-origin-rework` completa.
- Testes de documentação/contrato passando.
- Smoke Playwright reconhecendo as quatro superfícies alvo.
- Lacunas do orquestrador explicitadas no relatório final e nesta pasta.

## Parecer de QA
- Este pacote é apto como baseline documental e de testes aditivos para o rework.
- O sign-off funcional completo ainda depende da integração do orquestrador com dados persistidos e rotas reais.
