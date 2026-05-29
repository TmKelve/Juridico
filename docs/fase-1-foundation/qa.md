# QA - Fase 1

## Cenarios obrigatorios

### Unit
- transicao de status da company
- resolucao de membership
- matriz de permissao tenant/platform
- avaliacao de `read_only` e `suspended`

### Integration
- login com company correta
- bloqueio quando `companyId` diverge
- acesso negado entre empresas diferentes
- separacao de enforcement plataforma vs tenant
- deny-by-default para permissao sensivel sem grant explicito

### Smoke/E2E
- login normal tenant
- company suspensa
- company read-only
- leitura de recurso com filtro por company

## Evidencias
- contratos: `contracts/foundation-multitenant.contract.json`
- docs: `docs/fase-1-foundation/*`
- testes: a consolidar com os artefatos dos agentes 1-7

## Riscos residuais iniciais
- coexistencia temporaria com RBAC legado (`ADM/ADV/FIN/ATD`)
- necessidade de rollout progressivo para evitar quebra em rotas historicas
