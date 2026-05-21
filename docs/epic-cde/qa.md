# QA do Epic CDE

## Escopo validado
- Conversao CRM com confirmacao e idempotencia.
- Criacao de prazo a partir de publicacao.
- Reutilizacao de resposta em chamadas repetidas.
- Exposicao visual das telas de CRM, Publicacoes e Prazos.
- Gate de qualidade com docs, seed e smoke.

## Riscos principais
- Drift entre docs e implementacao real do fluxo de conversao.
- Publicacao seedada pode deixar de ser elegivel para criacao de prazo.
- Texto/label da interface pode mudar e invalidar o smoke sem regressao funcional real.
- Replay idempotente pode ser quebrado por alteracao de chave ou persistencia.
- Ajustes de orquestracao podem ficar fora do CI se o workflow nao for atualizado junto.

## Testes recomendados ou executados
- `npm --prefix backend run build`
- `node --test backend/tests/epic-cde.docs.test.cjs backend/tests/epic-cde.seed.test.cjs`
- `npm --prefix frontend run build`
- `npx playwright test frontend/admin.users.smoke.test.ts frontend/adv.screens.smoke.test.ts frontend/epic-cde.smoke.test.ts`

## Testes funcionais
- Login ADM continua abrindo a tela de usuarios.
- Login ADV continua navegando pelas telas principais.
- CRM continua exibindo conversao operacional.
- Publicacoes continuam oferecendo criacao de prazo.
- Prazos continuam exibindo contrato visual de operacao.

## Testes visuais
- Header, drawer e alertas de CRM precisam manter densidade e contraste suficientes para leitura.
- Lista de Publicacoes precisa manter o botao de acao e o drawer de detalhe.
- Tela de Prazos precisa manter blocos de foco, KPI e contrato da sincronizacao.

## Lacunas de cobertura
- Nao ha seed executor real neste pacote; apenas manifest de QA.
- O replay idempotente ainda depende de persistencia e integracao do backend principal.
- O smoke valida caminhos visiveis, mas nao substitui teste de integracao da API.
- A trilha de agenda em prazo depende de backend/orquestracao para ficar totalmente persistida.

## Evidencias minimas para sign-off
- Build backend sem erro.
- Build frontend sem erro.
- Testes de docs/seed passando.
- Smoke de login, CRM e prazos passando.
- Manifest de seed revisado e alinhado ao contrato.

## Parecer de QA
- Evidencia insuficiente ate que build, docs/seed e smoke sejam executados juntos no ambiente alvo.
- Com os testes acima verdes, o epic pode seguir para integracao sem bloquear o caminho feliz principal.

