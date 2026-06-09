---
tipo: kb
status: current
projeto: lexora
fase: inventario-tecnico
area: testes-qa-evidencias
data: 2026-05-30
fonte: claude-code
baseado_em:
  - '[[00_START_HERE]]'
  - '[[KB_002_GOVERNANCA_DOCUMENTAL_OFICIAL_CURRENT_2026-05-29]]'
  - '[[KB_003A_ESTRUTURA_GERAL_E_CONFIGURACOES_CURRENT_2026-05-29]]'
  - '[[KB_003B_FRONTEND_ESTADO_ATUAL_CURRENT_2026-05-29]]'
  - '[[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]]'
  - '[[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]]'
  - '[[BACKLOG_GERAL_LEXORA_CURRENT]]'
escopo: testes-qa-evidencias
vault_oficial: 'C:\Users\tomke\app Juridico\!_lexora-memory-docs'
autoridade: inventario-tecnico
nota_localizacao: 'Criado em 11 - Testes e Evidencias (pasta oficial do vault) em vez de 08 - Testes QA Evidencias (numero conflita com 08 - UX UI existente)'
---

# KB-003E — Testes, QA e Evidências

> [!important] Fonte primária: leitura direta de arquivos
> Este documento foi produzido pela leitura direta de arquivos reais de testes, configurações, scripts e artefatos do projeto. Fatos confirmados e inferências são distinguidos ao longo de todo o texto. Nenhum código foi alterado, nenhum teste foi executado e nenhum artefato foi modificado.

> [!note] Localização do arquivo
> Este documento foi criado em `11 - Testes e Evidencias`, a pasta oficial do vault para evidências de testes (definida em [[00_START_HERE]]). O prompt solicitou `08 - Testes QA Evidencias`, mas o número 08 já está ocupado por `08 - UX UI` na estrutura do vault. A pasta `11 - Testes e Evidencias` é o local correto conforme a governança documental.

---

## 1. Resumo Executivo

O projeto Lexora possui uma estratégia de testes em duas camadas independentes:

**Backend**: ~80 testes unitários (em `backend/src/**/*.test.cjs`) + 16 testes de integração/contratos/docs (em `backend/tests/*.test.cjs`). Todos usam o runner nativo `node:test` do Node.js, sem framework externo. Os testes unitários usam repositórios in-memory, são isolados de banco de dados e requerem build anterior (`npm run build`). **A grande maioria desses testes não é executada no CI**.

**Frontend**: 11 arquivos Playwright para smoke tests e testes de interação. Nenhum teste unitário de componente React identificado. Sem `vitest`, `jest` ou Testing Library no `frontend/package.json`. Os arquivos de teste Playwright estão na **raiz do `frontend/`** (não em pasta dedicada `e2e/` ou `tests/`). **Não foi encontrado arquivo `playwright.config.ts`** — o Playwright roda com configurações implícitas ou defaults.

**CI (GitHub Actions)**: O workflow executa build, 2 testes de docs/seed do backend, Prisma migrations, smoke tests Playwright do frontend e upload de artefatos. A maioria dos ~80 testes unitários do backend **não está no pipeline de CI**.

**Artefatos**: `frontend/test-results/` com 7 falhas da última execução (login inválido — credenciais do smoke test divergem do seed), `frontend/test-screenshots/` com 9 screenshots de sessão anterior, `.playwright-mcp/` com 31 arquivos de 10 sessões (2026-05-14 a 2026-05-25), dezenas de arquivos `.log` dispersos na raiz, `backend/` e `frontend/`.

### Principais riscos

1. **Falha confirmada no último run** — `test-results/.last-run.json` mostra status `failed`, 7 testes falhando por credenciais inválidas.
2. **~80 testes unitários do backend fora do CI** — sem execução automática.
3. **Sem playwright.config.ts** — configurações implícitas, risco de comportamento inesperado em diferentes ambientes.
4. **Sem testes unitários para React** — zero cobertura de componentes no frontend.
5. **Testes smoke dependem de credenciais dev** (`advogado@juridico.com` / `123456`) que podem não existir no banco sem seed específico.
6. **Muitos logs dispersos** sem política de retenção — risco de dados sensíveis em logs.
7. **Sem cobertura** para auth multi-tenant, notificações, storage de documentos, multi-tenancy e validators.

---

## 2. Objetivo do Documento

Este documento serve como base para:

- Documentação oficial do estado atual de testes e evidências do Lexora.
- **Política de artefatos técnicos** (BL-013) — orientar o que preservar, o que arquivar e o que descartar.
- **Política de evidências visuais** (BL-014) — critérios para promover screenshots a evidências oficiais.
- **Limpeza segura de logs** (BL-018) — identificar quais logs têm valor e quais podem ser removidos.
- **Avaliação de `.playwright-mcp`** (BL-019) — classificar as sessões MCP e seu valor.
- **Organização de testes Playwright** (BL-034) — base para mover specs para pasta dedicada.
- **[[KB_003G_RISCOS_TECNICOS_E_DIVERGENCIAS]]** — lacunas de cobertura e riscos de QA.
- **KB-004 — Product Discovery** — gaps de cobertura por domínio funcional.
- **KB-005 — Inventário Funcional e UX/UI** — evidências visuais de telas.
- Futuros updates do backlog com candidatos a novos itens de QA.

---

## 3. Escopo e Fora do Escopo

### Analisado nesta etapa

- Estrutura de `frontend/*.smoke.test.ts`, `frontend/*.interactions.test.ts`
- Estrutura de `backend/src/**/*.test.cjs` (contagem e domínios)
- Estrutura de `backend/tests/*.test.cjs` (integração, docs, contract)
- `frontend/package.json` — scripts e dependências de teste
- `backend/package.json` — ausência de scripts de teste
- `package.json` raiz — scripts de teste delegados
- `.github/workflows/ci.yml` — pipeline completo
- `frontend/test-results/` — listagem e `.last-run.json`
- `frontend/test-screenshots/` — listagem de 9 screenshots
- `.playwright-mcp/` — listagem de 31 arquivos de 10 sessões
- Arquivos `.log` — listagem e localização
- Screenshots soltos na raiz e em `frontend/`
- Leitura parcial de: `adv.screens.smoke.test.ts`, `adv.screens.interactions.test.ts`, `auth-claims.test.cjs`, `finance-entry.service.test.cjs`, `foundation.company-tenant-auth.integration.test.cjs`, `epic-cde.docs.test.cjs`
- `frontend/test-results/*.../error-context.md` — análise de falha

### Fora do escopo desta etapa

- Execução de qualquer teste ou script
- Abertura de navegador ou captura de screenshots
- Leitura completa de todos os 80+ arquivos de teste
- Análise de conteúdo de logs (apenas existência e tipo)
- Geração de coverage
- Alteração de qualquer arquivo
- Atualização do backlog

---

## 4. Estrutura Geral de Testes e Artefatos

| Caminho | Tipo | Papel provável | Status aparente | Deve ser preservado? | Observações | Ponto a validar |
|---|---|---|---|---|---|---|
| `frontend/*.smoke.test.ts` (10 arquivos) | Playwright e2e/smoke | Testes de fumaça por epic/perfil | Ativo | **Sim** | Na raiz de `frontend/` — deve migrar para `frontend/e2e/` (BL-034) | Verificar quais estão passando em CI |
| `frontend/adv.screens.interactions.test.ts` | Playwright interactions | Teste de fluxos críticos do advogado | Ativo — com falhas | **Sim** | 7 falhas no último run | Investigar causa (credenciais?) |
| `backend/src/**/*.test.cjs` (~80 arquivos) | Node:test unitário | Testes unitários por domínio/serviço | Ativo — não executado no CI | **Sim** | Usam repos in-memory, sem banco | Adicionar ao CI |
| `backend/tests/*.test.cjs` (16 arquivos) | Node:test integração/docs/contract | Testes de integração, docs e contratos | Parcialmente no CI (2/16) | **Sim** | 14 testes de integração fora do CI | Adicionar ao CI |
| `frontend/test-results/` | Artefato Playwright | Resultados da última execução (7 falhas) | Desatualizado | Transitório | Gerado pelo último run de `adv.screens.interactions.test.ts` | Limpar após próxima execução bem-sucedida |
| `frontend/test-screenshots/` | Screenshots manuais/automáticas | 9 evidências visuais de telas | Histórico | **Candidatos a evidência** | 01 a 08, cobrem dashboard, notificações, menu, configurações, responsivo | Promover ao vault se validadas |
| `.playwright-mcp/` | Artefatos MCP | Console logs e page snapshots de sessões MCP | Histórico (2026-05-14 a 2026-05-25) | Transitório | 10 sessões, 17 logs + 7 page YAMLs | BL-019: avaliar e limpar |
| `github-actions-page.png` | Screenshot manual | Evidência de CI — GitHub Actions | Histórico | Evidência candidata | — | Mover para vault se útil |
| `vercel-login-before-test.png` | Screenshot manual | Evidência de validação Vercel | Histórico | Evidência candidata | Relacionado a BL-003, BL-004 | Referenciar no contexto de BL-003 |
| `atendimentos-baseline.png`, `atendimentos-staging-after-refine.png`, `atendimentos-list-focus.png` | Screenshots de baseline | Comparação visual de tela de atendimentos | Histórico | Evidência candidata | Baseline antes/depois de refatoração | Mover para vault em KB-005 |
| `frontend/dashboard-screenshot-desktop.png` | Screenshot manual | Dashboard ADV em desktop | Histórico | Evidência candidata | — | Mover para vault em KB-005 |
| Logs dispersos (raiz, `backend/`, `frontend/`) | Logs de execução | Diagnóstico histórico de dev/staging | Transitório | Não (na maioria) | Ver seção 12 | BL-018 |
| `backend/.postgres-local/*.log` | Logs de banco local | PostgreSQL local de desenvolvimento | Transitório | Não | Banco local apenas | — |

---

## 5. Scripts de Teste

| Local | Script | Comando | Tipo de teste | Executa o quê | Risco | Ponto a validar |
|---|---|---|---|---|---|---|
| Raiz | `frontend:test:smoke` | `npm --prefix frontend run test:smoke` | Smoke e2e | Delega ao script `test:smoke` do frontend | — | — |
| Raiz | `test` | `echo "Error: no test specified" && exit 1` | Nenhum | Script placeholder — falha intencionalmente | Pode confundir ferramentas que esperam `npm test` | — |
| `frontend` | `test:smoke` | `playwright test admin.users.smoke.test.ts adv.screens.smoke.test.ts clients.communication.smoke.test.ts financeiro.smoke.test.ts` | Smoke e2e | 4 dos 10 arquivos smoke + implicitamente usa Playwright defaults | Apenas 4 dos 10 arquivos smoke estão no script; outros 6 ficam de fora | Confirmar quais 4 são os prioritários e por quê os outros 6 não estão |
| `backend` | Nenhum script `test` | — | — | Sem script de teste no `backend/package.json` | 80+ testes existem mas não há script para executá-los em conjunto | Criar script `test` no backend/package.json |
| CI | `node --test epic-cde.docs.test.cjs epic-cde.seed.test.cjs` | Node runner nativo | Docs/seed | Valida existência de documentos Epic CDE e seed | Apenas 2 dos 16 testes da pasta `tests/` são executados | Adicionar demais testes ao CI |
| CI | `npm run test:smoke` | Playwright (4 arquivos) | Smoke | ADV screens, admin users, clients/communication, finance | Requer backend + frontend rodando em localhost | — |
| CI | `npx playwright test epic-cde.smoke.test.ts` | Playwright (1 arquivo) | Smoke | Epic CDE smoke separado | — | — |

---

## 6. Configurações de Teste

| Arquivo | Ferramenta | Papel | Observações | Risco | Ponto a validar |
|---|---|---|---|---|---|
| `playwright.config.ts` ou similar | Playwright | Configuração global (baseURL, browsers, timeouts, reporters) | **Não encontrado** — nem em `frontend/`, nem na raiz | **Risco alto**: Playwright roda com defaults; baseURL é definida inline nos testes (localhost:5173) | Verificar se Playwright usa config implícita ou se há arquivo fora do glob |
| `vitest.config.ts` | Vitest | Config de testes unitários | **Não encontrado** | — | Confirmar ausência definitiva |
| `jest.config.*` | Jest | Config Jest | **Não encontrado** | — | Confirmar ausência definitiva |
| `.github/workflows/ci.yml` | GitHub Actions | Pipeline CI | Ativo — roda em push/PR para main, develop, codex/** | Versão Node 22; build antes de testes | — |
| `backend/tsconfig.json` | TypeScript | Gera `dist/` usado pelos tests .cjs | Indireto — tests requerem `npm run build` | Tests falham se dist/ estiver desatualizado | — |

**Observação**: Os arquivos smoke test definem `baseURL` diretamente no código (`const baseURL = 'http://localhost:5173'`), dispensando `playwright.config.ts` para esse fim. Porém a ausência de config centralizada dificulta: definir reporters, timeouts globais, múltiplos browsers, configurações de CI vs local.

---

## 7. Testes Frontend

| Arquivo/Pasta | Tipo | Domínio/Tela | Ferramenta | O que valida | Status aparente | Ponto a validar |
|---|---|---|---|---|---|---|
| `frontend/adv.screens.smoke.test.ts` | smoke | ADV — telas operacionais | Playwright | Navegar por 8+ telas do advogado (dashboard, processos, prazos, documentos, atendimentos, agenda, publicações, modelos) | Ativo — incluso no `test:smoke` | Validar com backend real |
| `frontend/admin.users.smoke.test.ts` | smoke | Admin — usuários | Playwright | Gerenciamento de usuários | Ativo — incluso no `test:smoke` | — |
| `frontend/clients.communication.smoke.test.ts` | smoke | Clientes / Comunicação | Playwright | Fluxos de clientes e comunicação | Ativo — incluso no `test:smoke` | — |
| `frontend/financeiro.smoke.test.ts` | smoke | Finance | Playwright | Telas financeiras | Ativo — incluso no `test:smoke` | — |
| `frontend/epic-cde.smoke.test.ts` | smoke | Epic CDE | Playwright | Telas do Epic CDE (clientes, documentos, atendimentos) | Ativo — separado no CI | — |
| `frontend/epic-ij.smoke.test.ts` | smoke | Epic IJ (IA, BI, Timesheet) | Playwright | Telas de IA, BI e Timesheet | Ativo — fora do `test:smoke` | Por que não está no test:smoke? |
| `frontend/publication-origin-rework.smoke.test.ts` | smoke | Publicações (rework) | Playwright | Fluxo de publicações após rework | Ativo — fora do `test:smoke` | — |
| `frontend/admin.company-foundation.smoke.test.ts` | smoke | Admin / Company Foundation | Playwright | Setup de empresa/multi-tenant | Ativo — fora do `test:smoke` | — |
| `frontend/foundation.auth.company.smoke.test.ts` | smoke | Foundation Auth / Company | Playwright | Auth e company foundation | Ativo — fora do `test:smoke` | — |
| `frontend/platform-admin.smoke.test.ts` | smoke | Platform Admin | Playwright | Telas de administração da plataforma | Ativo — fora do `test:smoke` | — |
| `frontend/adv.screens.interactions.test.ts` | e2e interactions | ADV — fluxos críticos | Playwright | Fluxos detalhados: home→processos→detalhe→prazos→agenda, documentos, tarefas | **Falhou** — 7 falhas no último run | Investigar causa das falhas |
| Testes unitários React (`*.test.tsx`, `*.spec.tsx`) | unitário | — | — | — | **Não identificados** | Confirmar ausência total |

**Observação crítica**: O script `test:smoke` inclui apenas **4 dos 10 arquivos smoke**. Os arquivos `epic-ij.smoke.test.ts`, `publication-origin-rework.smoke.test.ts`, `admin.company-foundation.smoke.test.ts`, `foundation.auth.company.smoke.test.ts` e `platform-admin.smoke.test.ts` existem mas **não estão no script `test:smoke` nem no pipeline CI principal**.

---

## 8. Testes Backend

| Arquivo/Pasta | Tipo | Domínio/API | Ferramenta | O que valida | Status aparente | Ponto a validar |
|---|---|---|---|---|---|---|
| `backend/src/auth/auth-claims.test.cjs` | unitário | Auth / Claims | node:test | Sign + verify de tokens JWT com claims multi-tenant; rejeição de tokens malformados | Ativo — não no CI | Adicionar ao CI |
| `backend/src/authz/company-status/company-status-authz-enforcer.test.cjs` | unitário | Multi-tenancy / Auth | node:test | Enforcement de status da empresa | Ativo — não no CI | — |
| `backend/src/authz/policies/authz.check.test.cjs` | unitário | Multi-tenancy / Auth | node:test | Políticas de autorização | Ativo — não no CI | — |
| `backend/src/permissions/enforcement.test.cjs` e `matrix.test.cjs` | unitário | Permissões | node:test | Enforcement e matriz de permissões | Ativo — não no CI | — |
| `backend/src/session/session-access.test.cjs` | unitário | Auth / Sessão | node:test | Resolução de sessão e acesso | Ativo — não no CI | — |
| `backend/src/shared/company-scope/cross-tenant.guard.test.cjs` e `query-scope.test.cjs` | unitário | Multi-tenancy | node:test | Guard cross-tenant e query scope | Ativo — não no CI | Crítico — valida isolamento |
| `backend/src/shared/request-context/company-request-context.test.cjs` | unitário | Multi-tenancy | node:test | Context de request por empresa | Ativo — não no CI | — |
| `backend/src/company/company.service.test.cjs` | unitário | Company | node:test | Serviço de empresa | Ativo — não no CI | — |
| `backend/src/finance/ledger/finance-entry.service.test.cjs` | unitário | Finance | node:test | FinanceEntryService com audit e idempotência | Ativo — não no CI | — |
| `backend/src/finance/billing/billing.service.test.cjs` | unitário | Finance / Billing | node:test | Billing SaaS | Ativo — não no CI | — |
| `backend/src/finance/reconciliation/reconciliation.service.test.cjs` | unitário | Finance | node:test | Conciliação bancária | Ativo — não no CI | — |
| `backend/src/finance/collections/finance-collections.service.test.cjs` | unitário | Finance | node:test | Régua de cobrança | Ativo — não no CI | — |
| `backend/src/triage/core/triage-operational-state.test.cjs` | unitário | Triagem | node:test | Estado operacional de triagem | Ativo — não no CI | — |
| `backend/src/triage/queue/triage-prioritization.test.cjs` | unitário | Triagem | node:test | Priorização da fila | Ativo — não no CI | — |
| `backend/src/documents/upload/document-upload.service.test.cjs` | unitário | Documentos / Storage | node:test | Upload service | Ativo — não no CI | Valida storageAdapter? |
| `backend/src/ai/core/ai-provider.router.test.cjs` | unitário | IA | node:test | Roteamento de provider IA | Ativo — não no CI | — |
| `backend/src/bi/metrics/*.test.cjs` (2 arquivos) | unitário | BI | node:test | Métricas executivas | Ativo — não no CI | — |
| `backend/src/timesheet/*.test.cjs` | unitário | Timesheet | node:test | TimeEntry, approvals, reports | Ativo — não no CI | — |
| `backend/src/mobile/adapters/mobile-feed.adapter.test.cjs` | unitário | Mobile | node:test | Feed mobile | Ativo — não no CI | — |
| `backend/tests/epic-cde.docs.test.cjs` | docs | Epic CDE | node:test | Existência de arquivos de doc em `docs/epic-cde/` | **No CI** | — |
| `backend/tests/epic-cde.seed.test.cjs` | seed | Epic CDE | node:test | Seed do Epic CDE | **No CI** | — |
| `backend/tests/foundation.company-tenant-auth.integration.test.cjs` | integração | Auth / Multi-tenancy | node:test | Auth→session→companyScope integrado | Ativo — **não no CI** | Crítico — valida multi-tenancy end-to-end |
| `backend/tests/company-status-enforcement.integration.test.cjs` | integração | Multi-tenancy | node:test | Enforcement de status por empresa | Ativo — **não no CI** | — |
| `backend/tests/platform-audit.integration.test.cjs` | integração | Platform | node:test | Auditoria de plataforma | Ativo — **não no CI** | — |
| `backend/tests/platform-company-admin.integration.test.cjs` | integração | Platform / Admin | node:test | Admin de empresa | Ativo — **não no CI** | — |
| `backend/tests/platform-invitations.integration.test.cjs` | integração | Platform | node:test | Convites de plataforma | Ativo — **não no CI** | — |
| `backend/tests/platform-membership.integration.test.cjs` | integração | Platform | node:test | Membership de plataforma | Ativo — **não no CI** | — |
| `backend/tests/foundation.authz.contract.docs.test.cjs` | contrato/docs | Auth / Authz | node:test | Contratos de autorização | Ativo — **não no CI** | — |
| `backend/tests/*.docs.test.cjs` (4 arquivos: epic-ij, publication, etc.) | docs | Vários | node:test | Existência de artefatos de documentação | Ativo — **não no CI** | — |
| `backend/tests/subscription.company-status.unit.test.cjs` | unitário | Subscription | node:test | Status de assinatura | Ativo — **não no CI** | — |

**Contagem confirmada**: ~80 arquivos `backend/src/**/*.test.cjs` + 16 arquivos `backend/tests/*.test.cjs` = **~96 testes totais no backend**. Apenas 2 executados no CI (epic-cde.docs + epic-cde.seed).

---

## 9. Playwright e Testes E2E

| Item | Caminho | Papel | Navegador/ambiente | Saída gerada | Risco | Ponto a validar |
|---|---|---|---|---|---|---|
| Config | Não encontrado (`playwright.config.*`) | — | Default Playwright | Default (todos browsers ou Chromium) | **Alto** — sem config centralizada, comportamento pode divergir entre CI e local | Confirmar se Playwright usa config implícita |
| Specs smoke | `frontend/*.smoke.test.ts` (10 arquivos) | Smoke por perfil/epic | Chromium (CI instala Chromium explicitamente) | test-results/, playwright-report/ | 6 specs fora do pipeline principal | Verificar CI config para epics restantes |
| Spec interactions | `frontend/adv.screens.interactions.test.ts` | Fluxos críticos ADV | Chromium | test-results/ | **Último run falhou** — 7 erros de login | Credenciais `advogado@juridico.com/123456` não existem no banco |
| test-results | `frontend/test-results/` (7 subpastas) | Resultados da última execução | — | error-context.md por falha | Status: `failed`, 7 testes falhando | Reexecutar após corrigir credenciais |
| Last run | `frontend/test-results/.last-run.json` | Status da última execução | — | `{ "status": "failed", "failedTests": [7 IDs] }` | Falha em produção pode passar despercebida | — |
| Screenshots | `frontend/test-screenshots/` (9 arquivos) | Evidências visuais de telas | — | PNGs numerados 01-08 | Origem não confirmada (manual ou automático?) | Confirmar gerador (script? Playwright? Manual?) |
| Playwright MCP | `.playwright-mcp/` (31 arquivos) | Console logs + page YAMLs de sessões MCP | Chromium via MCP | `.log` e `.yml` por sessão | Pode conter dados sensíveis nos logs | BL-019 |
| playwright-report | `frontend/playwright-report/` | Report HTML do Playwright | — | **Não encontrado** | Report não gerado localmente | CI faz upload para GitHub Actions Artifacts |

**Nota sobre falhas**: O `error-context.md` mostra que o teste `adv.screens.interactions.test.ts` falhou por login inválido: o usuário `advogado@juridico.com` com senha `123456` recebe "Credenciais inválidas". Isso indica que o banco local não tem esse usuário, ou que o `seed.sql` não foi executado, ou que as credenciais divergem do seed. O `seed.sql` usa `carlos.mendes@lexora.dev` / `senha123` e `devMockNotifications` em `main.ts` usa `advogado@juridico.com` — é possível que o teste dependa do dev mock, que por sua vez depende de `NODE_ENV !== production`.

---

## 10. Artefatos Técnicos

| Artefato | Local | Tipo | Classificação recomendada | Motivo | Próximo passo |
|---|---|---|---|---|---|
| `frontend/test-results/` (7 subpastas) | `frontend/test-results/` | Resultado Playwright (falhas) | **Transitório** | Gerado automaticamente, status de execução específica | Limpar após próxima execução bem-sucedida; ou manter até diagnóstico |
| `frontend/test-results/.last-run.json` | `frontend/test-results/` | Status do último run | **Transitório** | Arquivo automático do Playwright | Atualizado a cada run |
| `frontend/test-screenshots/` (9 PNGs) | `frontend/test-screenshots/` | Screenshots de telas | **Evidência candidata** | Imagens nomeadas sequencialmente, cobrem 8 telas/estados | Promover ao vault `11 - Testes e Evidencias` após validação (KB-005) |
| `.playwright-mcp/*.log` (17 arquivos) | `.playwright-mcp/` | Console logs do Playwright MCP | **Transitório** | Logs de sessões de desenvolvimento (2026-05-14 a 2026-05-25) | Avaliar conteúdo antes de limpar (BL-019); verificar dados sensíveis |
| `.playwright-mcp/*.yml` (7 arquivos) | `.playwright-mcp/` | Page snapshots YAML (Playwright MCP) | **Transitório** | Snapshots de páginas durante sessões de desenvolvimento | Idem — avaliar e limpar |
| `github-actions-page.png` | Raiz | Screenshot de CI | **Evidência candidata** | Evidência de execução de CI | Mover para `11 - Testes e Evidencias` com descrição |
| `vercel-login-before-test.png` | Raiz | Screenshot de Vercel | **Evidência candidata** | Evidência relacionada a BL-003/BL-004 | Referenciar em KB relacionado ao deploy |
| `atendimentos-baseline.png` | Raiz | Screenshot de baseline visual | **Evidência candidata** | Comparação visual antes/depois de refatoração | Mover para `11 - Testes e Evidencias` ou KB-005 |
| `atendimentos-staging-after-refine.png` | Raiz | Screenshot de staging | **Evidência candidata** | Comparação visual de staging | Idem |
| `atendimentos-list-focus.png` | Raiz | Screenshot de detalhe | **Evidência candidata** | Foco em lista de atendimentos | Idem |
| `frontend/dashboard-screenshot-desktop.png` | `frontend/` | Screenshot do dashboard | **Evidência candidata** | Vista do dashboard ADV em desktop | Mover para `11 - Testes e Evidencias` ou KB-005 |
| Logs dispersos (raiz + backend/ + frontend/) | Vários | Logs de execução dev | **Transitório** | Gerados em sessões de desenvolvimento local | BL-018: avaliar e limpar com política |
| `backend/.postgres-local/*.log` | `backend/.postgres-local/` | Logs do PostgreSQL local | **Descartável** (local dev) | Banco local de desenvolvimento; não tem valor documental | Adicionar ao `.gitignore` local |

---

## 11. Evidências Visuais

| Evidência | Local | Origem provável | Valor documental | Classificação recomendada | Próximo passo |
|---|---|---|---|---|---|
| `01-dashboard.png` | `frontend/test-screenshots/` | Sessão de teste/demo — tela do dashboard ADV | **Médio** — mostra estado real da UI | Evidência candidata | Referenciar em KB-005 (Inventário Funcional) |
| `02-notificacoes.png` | `frontend/test-screenshots/` | Painel de notificações | **Médio** — documenta estado atual (provavelmente com mock) | Evidência candidata | Útil para BL-046 (notificações mock) |
| `02b-notif-all-read.png` | `frontend/test-screenshots/` | Todas as notificações lidas | **Baixo** — estado derivado | Transitório | — |
| `03-atalhos.png` | `frontend/test-screenshots/` | Painel de atalhos | **Médio** | Evidência candidata | Referenciar em KB-005 |
| `04-user-menu.png` | `frontend/test-screenshots/` | Menu de usuário | **Médio** | Evidência candidata | Referenciar em KB-005 |
| `05-profile-panel.png` | `frontend/test-screenshots/` | Painel de perfil | **Médio** | Evidência candidata | Referenciar em KB-005 |
| `06-settings-whatsapp.png` | `frontend/test-screenshots/` | Configurações WhatsApp | **Médio** — documenta feature de comunicação | Evidência candidata | Referenciar em KB-005 |
| `07-tablet-768.png` | `frontend/test-screenshots/` | Vista tablet 768px | **Alto** — evidência de responsividade | Evidência oficial candidata | Promover ao vault com data e contexto |
| `08-mobile-640.png` | `frontend/test-screenshots/` | Vista mobile 640px | **Alto** — evidência de responsividade | Evidência oficial candidata | Promover ao vault com data e contexto |
| `dashboard-screenshot-desktop.png` | `frontend/` | Dashboard ADV em desktop | **Alto** | Evidência oficial candidata | Mover para vault |
| `github-actions-page.png` | Raiz | Run de CI no GitHub Actions | **Alto** — evidência de CI | Evidência candidata | Mover para vault com contexto |
| `vercel-login-before-test.png` | Raiz | Validação Vercel antes de teste | **Alto** — relacionado a BL-003 | Evidência candidata | Referenciar em documentação de deploy |
| `atendimentos-baseline.png` | Raiz | Baseline visual de atendimentos | **Médio** — comparação antes/depois | Evidência candidata | Mover para vault — útil para KB-005 |
| `atendimentos-staging-after-refine.png` | Raiz | Staging após refinamento | **Médio** | Evidência candidata | Mover para vault — par com baseline |
| `atendimentos-list-focus.png` | Raiz | Lista de atendimentos (foco) | **Médio** | Evidência candidata | Mover para vault — útil para KB-005 |
| `.playwright-mcp/*.yml` page snapshots | `.playwright-mcp/` | Snapshots de página em formato YAML | **Baixo** — dado técnico bruto | Transitório | Avaliar antes de limpar (BL-019) |

> [!note] Referência ao KB-005
> As screenshots de telas operacionais (`01-dashboard.png`, `03-atalhos.png`, `04-user-menu.png`, `05-profile-panel.png`, `07-tablet-768.png`, `08-mobile-640.png`, `dashboard-screenshot-desktop.png`, screenshots de atendimentos) devem ser referenciadas no **KB-005 — Inventário Funcional e UX/UI** como evidências visuais das telas existentes.

---

## 12. Logs e Reports

| Arquivo/Pasta | Tipo | Origem provável | Valor técnico | Risco de manter | Próximo passo |
|---|---|---|---|---|---|
| `frontend-dev.log`, `frontend-dev.err.log` | Log de dev server | Frontend Vite em sessão de desenvolvimento | Baixo | Baixo (não sensível) | Adicionar ao `.gitignore`; BL-018 |
| `frontend-dev-localhost.log`, `frontend-dev-localhost.err.log` | Log de dev server localhost | Sessão local frontend | Baixo | Baixo | Idem |
| `backend.log` (raiz) | Log de backend | Execução de `node dist/main.js` | Médio — pode conter stack traces | **Médio** — pode conter detalhes de rotas e erros | Verificar conteúdo antes de limpar; adicionar ao `.gitignore` |
| `backend/backend-run.out.log`, `backend/backend-run.err.log` | Log de execução backend | Sessão de desenvolvimento/debug | Baixo-médio | Médio — idem | Adicionar ao `.gitignore`; BL-018 |
| `backend/smoke-backend.log`, `backend/smoke-backend.err.log` | Log de smoke test backend | Execução de smoke tests locais | Médio — evidência histórica | Médio | Avaliar se há evidência relevante antes de limpar |
| `backend/smoke-backend-dist.log`, `backend/smoke-backend-dist.err.log` | Log de smoke test dist | Smoke com versão compilada | Médio | Médio | Idem |
| `backend/merge-backend.log`, `backend/merge-backend.err.log` | Log de merge/integração | Sessão de merge ou integração de branches | Baixo | Baixo | Limpar após BL-018 |
| `backend/tmp-runtime/*.log` | Logs de runtime temporários | Execução temporária do backend | Baixo | Baixo | Limpar |
| `backend/backend.log` | Log de backend | Execução do backend | Médio | Médio | Verificar conteúdo |
| `backend/backend-dev.out.log` | Log de dev backend | Dev server backend | Baixo | Baixo | Limpar |
| `backend/.postgres-local/*.log` | Logs PostgreSQL local | Banco de dados local de desenvolvimento | Baixo | **Alto** (potencial de dados sensíveis) | Adicionar ao `.gitignore`; nunca commitar |
| `backend/.finance-dev.err.log`, `backend/.finance-dev.out.log` | Logs de sessão finance | Testes/dev de funcionalidades finance | Baixo-médio | Médio | Avaliar e limpar |
| `backend/.finance-inline.log` | Log inline finance | Sessão específica de finance | Baixo | Baixo | Limpar |
| `frontend/debug.log` | Log de debug frontend | Debug de build ou dev | Baixo | Baixo | Limpar |
| `frontend/vite.log` | Log do Vite | Dev server frontend | Baixo | Baixo | Limpar |
| `frontend/.finance-dev.err.log`, `frontend/.finance-dev.out.log` | Logs finance frontend | Sessão de finance no frontend | Baixo | Baixo | Limpar |
| `frontend/.finance-preview.err.log`, `frontend/.finance-preview.out.log` | Logs preview finance | Preview de finance | Baixo | Baixo | Limpar |
| `.playwright-mcp/console-*.log` (17 arquivos) | Console logs Playwright | Sessões MCP (2026-05-14 a 2026-05-25) | Histórico | **Médio** — pode conter outputs de requests ou dados da app | Verificar antes de limpar (BL-019) |
| `frontend/playwright-report/` | Report HTML Playwright | — | **Não encontrado localmente** | — | Disponível nos GitHub Actions Artifacts |

> [!warning] Atenção sobre dados sensíveis em logs
> Os logs do PostgreSQL local (`backend/.postgres-local/*.log`) podem conter queries SQL com dados pessoais (CPF, nomes, valores financeiros). Os logs do backend podem conter payloads de requisições. **Não devem ser commitados** — verificar `.gitignore` e adicionar entradas se necessário.

---

## 13. Cobertura por Domínio

| Domínio | Frontend testado? | Backend testado? | E2E testado? | Evidência | Gap |
|---|---|---|---|---|---|
| Auth (login/logout) | Não (unitário) | **Sim** — `auth-claims.test.cjs` | **Sim** (helper nos smoke) | auth-claims.test.cjs; smoke helper | Sem teste de falha de auth no e2e; sem teste de JWT expirado |
| Login (tela) | Não (unitário) | — | Sim (parte dos smokes) | Smoke: `loginAsAdvogado()` | Credenciais do smoke divergem do seed; falha no último run |
| Dashboard/Home | Não (unitário) | Não | **Sim** — `adv.screens.smoke.test.ts` | Smoke verifica `.dashboard-page` | Sem teste de KPIs, contador de notificações real |
| Clients | Não (unitário) | Não explícito | **Sim** — `clients.communication.smoke.test.ts` | Smoke | Sem teste unitário de client service |
| Processes | Não (unitário) | Não | **Sim** — `adv.screens.smoke.test.ts` | Smoke com mocks de processos | Sem teste de process service; smoke usa route mock |
| Attendances | Não (unitário) | **Sim** — `attendance*.test.cjs` | Não explícito | `attendances/core/attendance.create.test.cjs` | Sem e2e para atendimentos |
| Deadlines | Não (unitário) | **Sim** — `deadline*.test.cjs` | **Sim** — `adv.screens.smoke.test.ts` | deadline-risk, deadline-bulk-action | Limitado |
| Documents | Não (unitário) | **Sim** — vários `document-*.test.cjs` | Não | document-upload, versioning, approval, links, artifacts | Sem e2e; storageAdapter não testado (mock?) |
| CRM | Não (unitário) | **Sim** — vários `crm-*.test.cjs` | Não explícito | crm-audit, contact-history, documents, conversion | Sem e2e para CRM |
| Publications | Não (unitário) | **Sim** — vários `publication-*.test.cjs` | **Sim** — `publication-origin-rework.smoke.test.ts` | publicação e pipeline | Smoke fora do test:smoke principal |
| Triage | Não (unitário) | **Sim** — vários `triage-*.test.cjs` | Não | triage-prioritization, sla, decision-engine | Sem e2e para triagem |
| Templates | Não (unitário) | Não identificado | **Sim** — `adv.screens.smoke.test.ts` | Smoke navega para modelos | Sem test de template service |
| Tasks | Não (unitário) | **Sim** — `task-workflow.test.cjs`, `task-followup.test.cjs` | **Sim** — `adv.screens.smoke.test.ts` | — | Limitado |
| Agenda | Não (unitário) | Não identificado | **Sim** — `adv.screens.smoke.test.ts` | Smoke navega para agenda | Sem teste de agenda service |
| Finance | Não (unitário) | **Sim** — vários `finance-*.test.cjs` | **Sim** — `financeiro.smoke.test.ts` | finance-entry, billing, reconciliation, collections | Smoke no CI; provider mock não testado em produção |
| BI | Não (unitário) | **Sim** — `bi-*.test.cjs` | Não | bi-metrics, bi-snapshot, bi-export, bi-authorizer | Sem e2e |
| Platform/Admin | Não (unitário) | **Sim** — `platform-*.integration.test.cjs` | **Sim** — `platform-admin.smoke.test.ts` | Integração: audit, admin, membership, invitations | Smoke fora do test:smoke principal |
| Timesheet | Não (unitário) | **Sim** — `timesheet-*.test.cjs`, `time-entry-*.test.cjs` | Não | approval, reports, core | Sem e2e |
| Notifications | Não (unitário) | **Não** | Não | Sem teste de `devMockNotifications` vs banco | **Gap crítico** — BL-046 |
| Multi-tenancy | Não (unitário) | **Sim** — `cross-tenant.guard.test.cjs`, `company-status-enforcement.integration.test.cjs`, `foundation.company-tenant-auth.integration.test.cjs` | Parcial — `foundation.auth.company.smoke.test.ts` | Integração + smoke fora do CI principal | Testes de integração fora do CI |
| Auth claims | — | **Sim** — `auth-claims.test.cjs` | Não | Roundtrip JWT com claims multi-tenant | Fora do CI |
| Storage (documentos) | — | Indiretamente — `document-upload.service.test.cjs` | Não | Upload service com mock adapter (provável) | storageAdapter concreto não testado |
| Validators | Não | Indireto — testado via services | Não | Validação é testada indiretamente nos service tests | Sem teste dedicado de validators |
| Prisma/migrations | — | **Sim** — CI aplica `prisma:migrate:deploy` | — | CI aplica migrations em PostgreSQL real | Migrations testadas em CI; seed não está no CI principal |

---

## 14. Gaps de QA

### Alta Prioridade

**GAP-001 — Maioria dos testes backend fora do CI**
- Descrição: ~94 dos ~96 testes backend (unitários e integração) não são executados no pipeline CI.
- Evidência: `ci.yml` executa apenas `epic-cde.docs.test.cjs` e `epic-cde.seed.test.cjs`.
- Impacto: Regressões em auth, finance, multi-tenancy, triage, documents, BI, timesheet podem passar despercebidas.
- Recomendação: Criar script `test` no `backend/package.json` e adicionar step no CI para executar todos os testes.
- Próximo passo: Novo candidato a backlog.

**GAP-002 — Falha confirmada no último run de interactions**
- Descrição: `test-results/.last-run.json` mostra 7 falhas em `adv.screens.interactions.test.ts`.
- Evidência: Login falha com "Credenciais inválidas" para `advogado@juridico.com` / `123456`.
- Impacto: Testes de fluxo crítico do advogado estão quebrando — possível que credenciais do dev mock não existam no banco sem o mock ativo.
- Recomendação: Investigar se o banco local tem o usuário seeded, ou se o teste depende do `devMockNotifications` / dev mock em `main.ts`.
- Próximo passo: Corrigir credenciais no seed ou no smoke test.

**GAP-003 — Sem testes unitários de componentes React**
- Descrição: Nenhum arquivo `*.test.tsx` ou `*.spec.tsx` encontrado em `frontend/src/`.
- Evidência: Glob de `frontend/**/*.test.*` fora de node_modules retornou zero resultados.
- Impacto: Qualquer regressão em componentes só é detectada pelos smoke tests e2e.
- Recomendação: Adotar Vitest + Testing Library para testes de componente.
- Próximo passo: Novo candidato a backlog.

**GAP-004 — Ausência de playwright.config.ts**
- Descrição: Nenhum arquivo `playwright.config.*` encontrado em `frontend/` ou na raiz.
- Evidência: Glob retornou zero resultados.
- Impacto: Playwright usa defaults — sem controle de browsers, timeouts, retries, reporters, baseURL centralizada.
- Recomendação: Criar `frontend/playwright.config.ts` com configuração explícita para CI e local.
- Próximo passo: Novo candidato a backlog.

**GAP-005 — 6 smoke tests fora do script test:smoke e do CI**
- Descrição: `epic-ij.smoke.test.ts`, `publication-origin-rework.smoke.test.ts`, `admin.company-foundation.smoke.test.ts`, `foundation.auth.company.smoke.test.ts`, `platform-admin.smoke.test.ts` não estão no `test:smoke` principal.
- Evidência: `frontend/package.json` lista apenas 4 arquivos no `test:smoke`.
- Impacto: Epics IJ, platform admin, publication rework e foundation não têm smoke automático no CI principal.
- Recomendação: Atualizar `test:smoke` ou criar steps adicionais no CI.
- Próximo passo: Novo candidato a backlog.

### Média Prioridade

**GAP-006 — Sem testes para notificações**
- Descrição: Nenhum teste unitário ou e2e para o endpoint `/notifications` ou para o modelo `Notification`.
- Evidência: Nenhum `notification*.test.cjs` encontrado; endpoints usam `devMockNotifications`.
- Impacto: Integração com banco não validada; mock em memória pode funcionar enquanto banco falha silenciosamente.
- Recomendação: Criar teste unitário para o endpoint de notificações após integração com banco (BL-046).
- Próximo passo: Dependente de BL-046.

**GAP-007 — storageAdapter de documentos não testado em produção**
- Descrição: `document-upload.service.test.cjs` existe, mas provável uso de adapter mock (in-memory).
- Evidência: Padrão dos testes backend usa repositórios in-memory; implementação real do adapter não identificada.
- Impacto: Upload real de documentos pode falhar em produção sem cobertura adequada.
- Recomendação: Criar teste de integração com o adapter real (BL-045, BL-058).
- Próximo passo: Dependente de BL-058.

**GAP-008 — Testes de integração de multi-tenancy fora do CI**
- Descrição: `foundation.company-tenant-auth.integration.test.cjs` e `company-status-enforcement.integration.test.cjs` não estão no CI.
- Evidência: `ci.yml` não lista esses arquivos nos steps de teste.
- Impacto: Cross-tenant isolation não validado automaticamente — risco crítico de vazamento de dados.
- Recomendação: Priorizar adição ao CI.
- Próximo passo: Parte do GAP-001, mas com prioridade extra.

### Baixa Prioridade

**GAP-009 — Sem teste de acessibilidade automatizado**
- Descrição: Nenhum arquivo de teste de acessibilidade identificado (axe-core, playwright accessibility, etc.).
- Evidência: Sem libs de acessibilidade no `frontend/package.json`.
- Impacto: Conformidade com WCAG não verificada automaticamente.
- Recomendação: Avaliar adoção de `@axe-core/playwright` nos smoke tests.
- Próximo passo: Baixa urgência — candidato a backlog futuro.

**GAP-010 — Sem cobertura de código**
- Descrição: Nenhum relatório de cobertura identificado (`coverage/` inexistente).
- Evidência: Glob de `coverage/` retornou zero resultados.
- Impacto: Não há visibilidade sobre percentual de código coberto.
- Recomendação: Adicionar coverage ao CI para backend (c8 ou similar com node:test).
- Próximo passo: Candidato a backlog futuro.

---

## 15. Riscos Técnicos de Testes e Evidências

| Risco | Evidência | Impacto | Recomendação | Prioridade | Deve virar backlog? |
|---|---|---|---|---|---|
| 94 dos 96 testes backend fora do CI | `ci.yml` só roda 2 testes | Regressões passam despercebidas em auth, finance, multi-tenancy | Criar script test e step no CI | **Alta** | **Sim** |
| Smoke tests falham por credenciais inválidas | `.last-run.json`: 7 falhas; error-context.md: "Credenciais inválidas" | Pipeline de testes e2e inoperante | Corrigir credenciais ou seed | **Alta** | **Sim** |
| Sem playwright.config.ts | Glob retornou zero | Comportamento imprevisível entre CI e local | Criar config centralizada | **Alta** | **Sim** |
| 6 smoke specs fora do test:smoke | package.json lista só 4 | Epics IJ, platform, foundation sem cobertura automática | Atualizar test:smoke | **Alta** | **Sim** |
| Logs com potencial de dados sensíveis | backend/.postgres-local/*.log, backend.log | Vazamento de dados pessoais ou queries sensíveis | Adicionar ao .gitignore; revisar conteúdo | **Alta** | **Sim** |
| Testes backend dependem de dist/ compilado | Tests usam `require('../dist/')` | Tests falham silenciosamente se dist/ estiver desatualizado | Documentar dependência; script pre-test com build | **Média** | **Sim** |
| Sem testes unitários React | Zero *.test.tsx em frontend/src/ | Regressões de UI só detectadas em e2e | Adotar Vitest + Testing Library | **Média** | **Sim** |
| Artefatos Playwright no repositório | test-results/, .playwright-mcp/ | Poluição do repositório; tamanho crescente | Adicionar ao .gitignore; usar CI artifacts | **Média** | Sim (BL-019, BL-034) |
| Screenshots soltas na raiz | 5 PNGs na raiz | Poluição do repositório; sem contexto documental | Mover para vault com contexto (BL-014, BL-015) | **Média** | Sim (BL-015) |
| Testes de multi-tenancy fora do CI | foundation.company-tenant-auth.integration.test.cjs não no CI | Cross-tenant isolation não validado automaticamente | Adicionar ao CI | **Alta** | **Sim** (parte do GAP-001) |
| Ausência de cobertura de código | Sem diretório coverage/ | Sem visibilidade de cobertura | Adicionar c8 ou v8 ao CI | **Baixa** | Candidato futuro |
| Sem teste para notificações | Nenhum notification*.test.cjs | Integração banco-notificações sem validação | Criar teste após BL-046 | **Média** | Dependente de BL-046 |

---

## 16. Política Recomendada de Artefatos Técnicos

| Tipo de artefato | Manter no Git? | Manter no vault? | Manter local? | Regra recomendada | Observação |
|---|---|---|---|---|---|
| `frontend/test-results/` | **Não** | **Não** | Sim (temporário) | Adicionar ao `.gitignore`; usar CI artifacts | CI já faz upload via `actions/upload-artifact` |
| `frontend/playwright-report/` | **Não** | **Não** | Sim (temporário) | Idem | Disponível nos GitHub Actions artifacts |
| Traces Playwright | **Não** | **Não** | Sim (temporário) | Gerados apenas em falha; útil para debug local | — |
| Videos Playwright | **Não** | **Não** | Sim (temporário) | Opcionais no CI; não commitar | — |
| Screenshots automáticas (falhas) | **Não** (automáticas) | Não | Sim (debug) | Não commitar screenshots de CI; usar CI artifacts | — |
| `frontend/test-screenshots/` (curadas) | **Não** (no Git) | **Sim** (se promovidas) | Sim | Promover ao vault `11 - Testes e Evidencias` com descrição e data; remover da raiz do frontend | — |
| `.playwright-mcp/` | **Não** | **Não** | Sim (temporário) | Adicionar ao `.gitignore`; limpar periodicamente (BL-019) | Verificar dados sensíveis antes |
| Logs dispersos (`.log`) | **Não** | **Não** | Sim (debug local) | Adicionar extensões `*.log` ao `.gitignore` se ausente | Revisar `.gitignore` atual |
| `backend/.postgres-local/` | **Não** | **Não** | Sim (dev local) | Adicionar ao `.gitignore`; banco local de dev | — |
| `coverage/` | **Não** | **Não** (dados brutos) | Sim (local) | Coverage summary pode entrar no vault como evidência; dados brutos não | — |
| Snapshots de componente | **Sim** (controlados) | **Não** | Sim | Snapshots gerenciados são versionados junto ao código | Não se aplica agora (sem Vitest) |
| Screenshots manuais curadas | **Não** (repositório) | **Sim** | Sim | Mover para `11 - Testes e Evidencias` com nome, data e contexto | — |
| Reports de CI | **Não** | **Sim** (seletivo) | Sim | Referenciar no vault apenas evidências relevantes de marco | — |

---

## 17. Política Recomendada de Evidências Visuais

| Critério | Regra recomendada | Exemplo |
|---|---|---|
| Quando preservar | Quando documenta estado real de uma tela em um momento específico (lançamento de feature, baseline pré-refactor, bug confirmado) | `07-tablet-768.png` — responsividade confirmada |
| Onde preservar | Pasta `11 - Testes e Evidencias` do vault ou subpasta `11 - Testes e Evidencias/screenshots/` | `!_lexora-memory-docs/11 - Testes e Evidencias/screenshots/` |
| Como nomear | `YYYY-MM-DD_dominio_contexto_descricao.png` | `2026-05-30_dashboard_adv_desktop.png` |
| Como referenciar em KBs | Link relativo do vault com legenda explicativa: `![[2026-05-30_dashboard_adv_desktop.png]]` + texto | Ver KB-005 para uso |
| Quando descartar | Screenshots automáticas sem contexto, estados transitórios, screenshots de falha sem valor diagnóstico | Screenshots duplicadas de bug já corrigido |
| Como evitar poluição do vault | Política de "curadoria antes de mover": nunca mover arquivo sem nome, data e descrição; nunca mover mais de 3 screenshots iguais | Sempre descrever o propósito no frontmatter ou parágrafo adjacente |
| Relação com KB-005 | KB-005 é o local principal para referenciar evidências visuais de telas operacionais; KB-003E registra a política | KB-005 deve incluir seção de evidências por domínio |

---

## 18. Itens do Backlog Impactados

| Item backlog | Status após KB-003E | Evidência | Recomendação |
|---|---|---|---|
| BL-013 — Criar política de artefatos técnicos | **Parcialmente desbloqueado** — política proposta na seção 16 | Seção 16 deste documento | Formalizar política em documento dedicado; requer decisão do usuário |
| BL-014 — Criar política de evidências visuais | **Parcialmente desbloqueado** — política proposta na seção 17 | Seção 17 deste documento | Formalizar política em documento dedicado; requer decisão do usuário |
| BL-018 — Organizar ou limpar logs soltos da raiz | **Parcialmente desbloqueado** — logs mapeados na seção 12 | Seção 12 — 40+ arquivos .log identificados | Requer decisão do usuário sobre política; verificar .gitignore |
| BL-019 — Avaliar limpeza de `.playwright-mcp` | **Parcialmente desbloqueado** — conteúdo mapeado | Seção 10 — 31 arquivos de 10 sessões | Verificar dados sensíveis antes de limpar; adicionar ao .gitignore |
| BL-034 — Mover Playwright para pasta e2e/ | **Parcialmente desbloqueado** — estrutura atual mapeada | 11 specs em `frontend/*.test.ts` na raiz | Mover para `frontend/e2e/` com playwright.config.ts |
| BL-017 — Criar índice de documentação técnica | **Continua bloqueado** | Ainda falta KB-003F, KB-003G | Aguardar demais KBs |
| BL-023 — Confirmar compatibilidade da stack | **Parcialmente desbloqueado** | Playwright 1.59.1 + React 19.2.4 coexistem; sem Vitest | Verificar compatibilidade Radix com React 19 |
| BL-053 — Avaliar validators e testes | **Parcialmente desbloqueado** | Validators testados indiretamente via service tests | Sem teste dedicado de validators; avaliar cobertura |
| BL-059 — Auditar companyScope | **Continua bloqueado** | cross-tenant.guard.test.cjs existe mas fora do CI | Adicionar ao CI como parte do GAP-001 |
| BL-062 — Contratos sem cobertura por testes | **Parcialmente desbloqueado** | Contratos backend (`*.contract.ts`) não têm testes dedicados | Criar testes de contrato ou adicionar ao CI |

---

## 19. Recomendações Iniciais

### Testes Frontend

- Adotar **Vitest + React Testing Library** para testes unitários de componentes — há zero cobertura de componentes hoje.
- Criar `frontend/e2e/` e mover todos os `*.smoke.test.ts` e `*.interactions.test.ts` para lá (BL-034).
- Criar `frontend/playwright.config.ts` com baseURL, timeout global, browser (Chromium), reporters e diretório de output.
- Adicionar todos os 10 smoke tests ao script `test:smoke` (ou criar múltiplos scripts por prioridade).

### Testes Backend

- Criar script `test` em `backend/package.json`: `node --test src/**/*.test.cjs tests/*.test.cjs` (ou similar).
- Adicionar step no CI para executar todos os testes backend — especialmente os de auth e multi-tenancy.
- Documentar dependência de `npm run build` antes de `npm test` no backend.
- Priorizar adição ao CI dos testes de integração de multi-tenancy (`foundation.company-tenant-auth.integration.test.cjs`, `company-status-enforcement.integration.test.cjs`).

### Playwright/E2E

- Investigar e corrigir falha de credenciais nos `adv.screens.interactions.test.ts` — verificar se o dev mock está ativo ou se o seed precisa ser executado antes.
- Criar `playwright.config.ts` centralizado antes de adicionar novos testes.
- Avaliar se as 6 specs fora do `test:smoke` devem ser integradas ao pipeline principal ou a um pipeline separado por epic.

### Artefatos Técnicos

- Adicionar ao `.gitignore` da raiz: `*.log`, `test-results/`, `playwright-report/`, `.playwright-mcp/`.
- Verificar se `backend/.postgres-local/` já está no `.gitignore`.
- Não commitar screenshots automáticas de CI — usar `upload-artifact` (CI já faz isso).

### Evidências Visuais

- Mover as 5 screenshots da raiz (`github-actions-page.png`, `vercel-login-before-test.png`, `atendimentos-*.png`) para `11 - Testes e Evidencias` com nome padronizado.
- Mover `frontend/dashboard-screenshot-desktop.png` para o vault.
- Promover `07-tablet-768.png` e `08-mobile-640.png` de `frontend/test-screenshots/` como evidências oficiais de responsividade.
- Implementar política de nomenclatura: `YYYY-MM-DD_dominio_contexto.png`.

### Logs

- Criar ou atualizar `.gitignore` para incluir padrões de log: `*.log`, `*.err.log`, `*.out.log`.
- Antes de limpar qualquer log: verificar se contém dados sensíveis (BL-018).
- Logs de CI (`backend.log`, `frontend.log`) gerados durante smoke tests devem ser tratados como transitórios — CI já os arquiva nos Artifacts.

### CI/CD e Smoke Tests

- O CI atual é **funcional mas incompleto**: cobre build + migrations + 2 docs tests + 4 smokes.
- Adicionar os ~94 testes backend ao CI (criando script `test` no backend).
- Adicionar health check mais robusto pós-deploy ao Render (BL-050).
- Adicionar step de smoke test pós-deploy no Render (quando o deploy de staging ocorrer).

### Backlog

Novos candidatos a backlog identificados nesta etapa:

| Candidato a backlog | Prioridade sugerida | Tipo | Área | Dependência | Observação |
|---|---|---|---|---|---|
| Adicionar todos os testes backend ao CI (criar script test + step no CI) | P1 | Correção técnica | Backend / CI | Nenhuma | GAP-001: ~94 testes fora do CI |
| Corrigir falha de credenciais nos smoke tests de interactions | P1 | Correção técnica | Frontend / Testes | Investigação das credenciais | GAP-002: 7 falhas confirmadas |
| Criar `frontend/playwright.config.ts` centralizado | P1 | Correção técnica | Frontend / Testes | Nenhuma | GAP-004: sem config Playwright |
| Adicionar todos os smoke tests ao script test:smoke e ao CI | P2 | Correção técnica | Frontend / CI | playwright.config.ts | GAP-005: 6 specs fora do CI |
| Adotar Vitest + Testing Library para testes de componente React | P2 | Implementação | Frontend / Testes | KB-005 (inventário de componentes) | GAP-003: zero testes unitários frontend |
| Adicionar `.gitignore` para logs, test-results, playwright-report, .playwright-mcp | P2 | Limpeza | CI / Repositório | Nenhuma | Muitos artefatos commitados |
| Priorizar testes de integração multi-tenancy no CI | P1 | Correção técnica | Backend / CI / Segurança | Script test backend | GAP-008: cross-tenant isolation não validado automaticamente |

---

## 20. Relação com Próximas Fases

- **KB-003F — IA, Agentes e Automações**: Os testes `ai-*.test.cjs` (AI provider, summarization, recommendation, audit, drafting, checklist) fornecem base para entender cobertura de IA. O `document-drafting.service.test.cjs` é relevante para entender se drafting de documentos via IA tem cobertura.
- **KB-003G — Riscos Técnicos e Divergências**: Os GAPs de QA identificados aqui (testes fora do CI, credenciais inválidas, sem cobertura de multi-tenancy no CI) devem ser consolidados como riscos técnicos em KB-003G. Os candidatos a backlog desta seção devem ser avaliados ali.
- **KB-004 — Product Discovery**: A tabela de cobertura por domínio (seção 13) mostra quais domínios têm e2e e quais não têm, auxiliando no mapeamento de funcionalidades implementadas.
- **KB-005 — Inventário Funcional e UX/UI**: As evidências visuais (`test-screenshots/`, screenshots soltas) devem ser referenciadas em KB-005 para documentar estado visual das telas. `07-tablet-768.png` e `08-mobile-640.png` são especialmente relevantes para responsividade.
- **KB-006 — Design System e Constituição Visual**: Sem relação direta com testes, mas as evidências visuais de componentes podem ser relevantes.
- **Próximos updates do backlog**: Os 7 candidatos listados na seção 19 devem ser adicionados ao `BACKLOG_GERAL_LEXORA_CURRENT.md` no UPDATE-BACKLOG-005 (após KB-003F ou conforme decisão do usuário).
- **Possíveis ADRs**: ADR sobre política de cobertura mínima de testes; ADR sobre estratégia de testes de componente (Vitest vs outros); ADR sobre organização de testes Playwright.

---

## 21. Limitações desta Etapa

> [!warning] Limitações desta análise
>
> - **Não executa testes** — nenhum teste foi rodado, nenhum resultado foi gerado.
> - **Não valida runtime** — o estado real dos testes em CI não foi verificado; apenas o último resultado local foi lido.
> - **Não gera coverage** — sem dados de cobertura reais.
> - **Não abre browser** — nenhuma sessão Playwright foi iniciada.
> - **Não captura screenshots** — nenhuma nova evidência visual foi gerada.
> - **Não altera artefatos** — logs, screenshots, test-results e configs permanecem inalterados.
> - **Não apaga logs** — classificação apenas; limpeza requer BL-018 e decisão do usuário.
> - **Não move arquivos** — reorganização requer BL-034 e decisão do usuário.
> - **Não atualiza backlog** — candidatos listados para adição posterior.
> - **Não substitui CI** — análise estática não detecta falhas de execução.
> - **Não substitui auditoria de QA completa** — não foi feito pen test, teste de carga ou teste de acessibilidade completo.
> - **Leitura parcial dos testes** — foram lidos apenas ~5 dos ~96 arquivos de teste do backend e 2 dos 11 do frontend.

---

## 22. Validação Final

| Item validado | Resultado |
|---|---|
| Vault oficial existe | **Sim** |
| `00_START_HERE.md` encontrado | **Sim** |
| `KB_002` encontrado | **Sim** |
| `KB_003A` encontrado | **Sim** |
| `KB_003B` encontrado | **Sim** |
| `KB_003C` encontrado | **Sim** |
| `KB_003D` encontrado | **Sim** |
| `BACKLOG_GERAL_LEXORA_CURRENT.md` encontrado | **Sim** |
| KB-003E criado no caminho correto (`11 - Testes e Evidencias`) | **Sim** |
| Apenas o KB-003E foi criado | **Sim** |
| Algum arquivo existente foi sobrescrito | **Não** |
| Algum código foi alterado | **Não** |
| Algum teste foi alterado | **Não** |
| Algum snapshot foi alterado | **Não** |
| Algum screenshot foi alterado | **Não** |
| Algum log foi alterado | **Não** |
| Algum report foi alterado | **Não** |
| Algum package file foi alterado | **Não** |
| Alguma configuração foi alterada | **Não** |
| Algum script foi executado | **Não** |
| Algum teste foi executado | **Não** |
| Algum Playwright foi executado | **Não** |
| Algum pacote foi instalado | **Não** |
| Algum deploy foi executado | **Não** |
| Alguma pasta `.obsidian` foi alterada | **Não** |
| Backlog permaneceu inalterado | **Sim** |

---

---

## Atualização — 2026-06-01 (BL-065, BL-066, BL-067, BL-068)

As seguintes divergências identificadas neste KB foram resolvidas:

| Item anterior | Resolução | BL | Commit |
|---|---|---|---|
| **Sem `playwright.config.ts`** — Playwright rodava com defaults; risco de comportamento inesperado | `frontend/playwright.config.ts` criado: baseURL, timeout 30s, retries 1 em CI, reporters github+html, chromium | BL-067 | `1816891` |
| **7 falhas em `adv.screens.interactions.test.ts`** — credenciais inválidas para `advogado@juridico.com` / `123456` | Causa raiz confirmada: race condition — `devMock` só ativa quando Prisma inacessível; em CI o BD existe mas `seedData()` roda async e pode não completar antes dos testes iniciarem. Fix: step "Wait for seed to complete" adicionado ao `ci.yml` — polling em `POST /auth/login` até retornar 200 | BL-066 | `7616933` |
| **Maioria dos ~96 testes backend fora do CI** — apenas `epic-cde.docs` e `epic-cde.seed` eram executados | Script `"test": "node --test tests/*.test.cjs"` adicionado ao `backend/package.json`. Step "Run backend tests" adicionado ao `ci.yml` — cobre todos os 16 arquivos `tests/*.test.cjs` incluindo os multi-tenancy | BL-065 / BL-068 | `388969d` |

**Estado atual do CI (`ci.yml`):**
```
Checkout → Setup Node 22 → Install deps → Build backend/frontend
→ Validate Epic CDE docs/seed → Prisma migrate
→ Run backend tests (node --test tests/*.test.cjs — 16 arquivos)
→ Install Playwright → Start backend + frontend
→ Wait for backend (GET /)
→ Wait for seed to complete (POST /auth/login até 200)
→ Run smoke tests → Run Epic CDE smoke tests
→ Upload Playwright artifacts
```

---

*Criado em: 2026-05-30 | Status: current | Vault: !_lexora-memory-docs | Autor: claude-code*
*Baseado em: [[KB_003C_BACKEND_E_APIS_ESTADO_ATUAL_CURRENT_2026-05-30]] | [[KB_003D_DADOS_PRISMA_E_CONTRATOS_CURRENT_2026-05-30]]*
*Nota: Arquivo criado em `11 - Testes e Evidencias` (pasta oficial do vault) em vez de `08 - Testes QA Evidencias` (número conflita com `08 - UX UI` existente na estrutura do vault definida em `00_START_HERE.md`).*
