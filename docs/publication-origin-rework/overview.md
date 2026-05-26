# Publication Origin Rework Overview

## Objetivo consolidado
- Separar o sinal bruto coletado da publicação operacional já consolidada.
- Tornar a origem explícita em `Publicações`, `Triagem` e `CRM Jurídico` sem quebrar as listas existentes.
- Expor consulta auditável da evidência original, da timeline do pipeline e das ações derivadas.
- Preservar compatibilidade com o frontend atual enquanto o orquestrador liga a nova malha de correlação.

## Modelo operacional
- `captureRecord`: registro bruto da captura, com `sourceType`, `sourceReference`, texto bruto/normalizado e estado de consolidação.
- `publicationNormalizedRecord`: evento normalizado que pode ou não se tornar publicação operacional.
- `publicationConsolidationStatus`: visão resumida da correlação entre captura, evento e publicação.
- `publicationPipelineTimeline`: timeline ponta a ponta por `correlationId`.
- `derivedActionRecord`: saídas operacionais derivadas, como triagem, lead/oportunidade CRM, prazo e tarefa.

## Arquitetura por frente
- Backend de origem/correlação: precisa materializar captura, evento normalizado, timeline e ações derivadas por `correlationId`.
- Backend de compatibilidade: mantém `GET /publications`, `GET /triage`, `GET /crm/leads` e `GET /crm/opportunities` e adiciona expansão opcional de origem.
- Frontend Publicações: continua usando a lista atual, mas passa a exibir contexto explícito da origem e do estágio do pipeline quando a integração estiver ativa.
- Frontend Triagem: continua consumindo a lista atual, com expansão aditiva de `originReference` e `timeline`.
- Frontend CRM: continua consumindo leads e oportunidades atuais, com expansão aditiva de `originReference`.

## Ordem de integração
1. contratos
2. backend-origin-correlation
3. backend-derived-actions-and-api
4. frontend-crm-publications-triage
5. tests
6. docs

## Encaixe no baseline documental
- Em `docs-juridico/30-Mapeamento-Tela-API-P0.md`, este rework amplia o contrato real de `Publicações`, `Triagem`, `Clientes/CRM` com novas consultas dedicadas.
- Em `docs-juridico/07-Modelagem-Dados.md`, o rework introduz entidades de rastreabilidade de origem que não substituem `publication`, `deadline`, `task` ou `crm` já existentes.
- Em `docs-juridico/20-Guia-Desenvolvimento.md`, a entrega atual permanece aditiva: documentação e testes primeiro, sem forçar refactor estrutural fora do ownership.

## Lacunas ainda fora deste pacote
- Wiring do orquestrador para preencher `correlationId`, `originReference`, `timelineUrl`, `evidenceUrl` e `derivedActions`.
- Materialização consistente dos novos endpoints com dados persistidos do pipeline real.
- Exposição visual integral desses campos nas telas atuais, que depende da integração do backend principal.
