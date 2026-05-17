# Triagem de Publicações Automáticas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** construir o MVP de triagem automática de publicações com captura persistida, timeline cronológica, filas `Crítica/Normal/Tratados` e confirmação humana para criação de prazo, tarefa e oportunidade CRM.

**Architecture:** o backend passa a separar captura bruta, evento cronológico, item de triagem e decisão humana. O frontend ganha um módulo próprio de `Triagem`, com KPIs, abas, fila operacional e drawer de decisão. O primeiro corte usa matching determinístico por processo e CPF, com coleta externa conectável e IA deixada para o segundo release.

**Tech Stack:** React + TypeScript, CSS local, Express, Prisma/Postgres, cron agendado no backend, date-fns para datas, lucide-react para ícones.

---

## File Structure

**Backend**
- Create: `backend/src/triage.contract.ts`
- Create: `backend/src/source-jobs.contract.ts`
- Create: `backend/src/publication-capture.provider.ts`
- Create: `backend/src/triage.matcher.ts`
- Create: `backend/src/triage.actions.ts`
- Create: `backend/test/triage.contract.test.cjs`
- Create: `backend/test/triage.matcher.test.cjs`
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_triage_domain/migration.sql`
- Modify: `backend/src/main.ts`

**Frontend**
- Create: `frontend/src/Triagem.tsx`
- Create: `frontend/src/Triagem.css`
- Modify: `frontend/src/api.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/sidebar/SidebarNav.tsx`

**Docs**
- Modify: `docs-juridico/30-Mapeamento-Tela-API-P0.md`
- Modify: `docs-juridico/29-Plano-Producao-Full-Lifecycle.md`

---

### Task 1: Modelar domínio de triagem no Prisma

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<timestamp>_add_triage_domain/migration.sql`
- Test: `backend/test/triage.contract.test.cjs`

- [ ] **Step 1: Escrever o teste de contrato para os payloads base**

Criar `backend/test/triage.contract.test.cjs` cobrindo:
- `PublicationCapture`
- `PublicationEvent`
- `TriageItem`
- `TriageDecision`
- `PublicationSourceJob`

- [ ] **Step 2: Rodar o teste para falhar**

Run: `node --test backend/test/triage.contract.test.cjs`
Expected: FAIL com módulo/exports inexistentes.

- [ ] **Step 3: Expandir `schema.prisma`**

Adicionar modelos:
- `PublicationCapture`
- `PublicationEvent`
- `TriageItem`
- `TriageDecision`
- `PublicationSourceJob`

Relacionamentos mínimos:
- `PublicationCapture -> PublicationEvent[]`
- `PublicationCapture -> TriageItem[]`
- `PublicationEvent -> Process?`
- `PublicationEvent -> Client?`
- `TriageItem -> Process?`
- `TriageItem -> Client?`
- `TriageDecision -> TriageItem`

- [ ] **Step 4: Criar migration**

Run: `npm run prisma:migrate:dev -- --create-only`
Expected: migration criada sem alterar modelos já existentes fora do escopo.

- [ ] **Step 5: Gerar client e build**

Run:
- `npm run prisma:generate`
- `npm run build`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations backend/test/triage.contract.test.cjs
git commit -m "feat: add triage domain models"
```

### Task 2: Criar contratos de saída da triagem

**Files:**
- Create: `backend/src/triage.contract.ts`
- Create: `backend/src/source-jobs.contract.ts`
- Test: `backend/test/triage.contract.test.cjs`

- [ ] **Step 1: Implementar builders mínimos**

Criar:
- `buildTriageItemPayload`
- `buildTriageDecisionPayload`
- `buildPublicationCapturePayload`
- `buildPublicationEventPayload`
- `buildSourceJobPayload`

- [ ] **Step 2: Cobrir campos necessários**

Garantir no payload:
- `queueType`
- `status`
- `suggestedAction`
- `aiConfidenceBand`
- `suggestedReason`
- `postponeUntil`
- `handledBy`
- `handledAt`

- [ ] **Step 3: Rodar teste**

Run: `node --test backend/test/triage.contract.test.cjs`
Expected: PASS.

- [ ] **Step 4: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/triage.contract.ts backend/src/source-jobs.contract.ts backend/test/triage.contract.test.cjs
git commit -m "feat: add triage payload contracts"
```

### Task 3: Implementar matching determinístico por processo e CPF

**Files:**
- Create: `backend/src/triage.matcher.ts`
- Test: `backend/test/triage.matcher.test.cjs`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Escrever teste do matcher**

Cobrir cenários:
- match por `processNumber`
- match por `cpf`
- sem match
- conflito de match

- [ ] **Step 2: Rodar teste para falhar**

Run: `node --test backend/test/triage.matcher.test.cjs`
Expected: FAIL.

- [ ] **Step 3: Implementar matcher**

Funções mínimas:
- `matchCaptureToProcess`
- `matchCaptureToClientByCpf`
- `resolveCaptureTarget`

Regras:
- processo primeiro
- CPF depois
- conflitos -> `manual_review`

- [ ] **Step 4: Rodar testes**

Run: `node --test backend/test/triage.matcher.test.cjs`
Expected: PASS.

- [ ] **Step 5: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/triage.matcher.ts backend/test/triage.matcher.test.cjs backend/src/main.ts
git commit -m "feat: add triage matching for process and cpf"
```

### Task 4: Implementar persistência de captura, evento e item de triagem

**Files:**
- Create: `backend/src/publication-capture.provider.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Criar serviço de ingestão**

Funções mínimas:
- `storeCapture`
- `storePublicationEvent`
- `createOrUpdateTriageItem`
- `registerSourceJobRun`

- [ ] **Step 2: Implementar deduplicação inicial**

Usar fingerprint com:
- `sourceType`
- `sourceReference`
- `occurredAt`
- hash textual simples

Se item pendente equivalente existir:
- atualizar
- não duplicar fila

- [ ] **Step 3: Expor rotas de backend**

Adicionar:
- `GET /triage`
- `GET /triage/:id`
- `POST /triage/ingest`
- `PUT /triage/:id`
- `POST /triage/:id/decision`

- [ ] **Step 4: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/publication-capture.provider.ts backend/src/main.ts
git commit -m "feat: persist publication captures and triage items"
```

### Task 5: Executar ações confirmadas da triagem

**Files:**
- Create: `backend/src/triage.actions.ts`
- Modify: `backend/src/main.ts`

- [ ] **Step 1: Implementar executor de decisão**

Casos:
- `criar_prazo`
- `criar_tarefa`
- `criar_oportunidade`
- `criar_lead`
- `registrar_publicacao`

- [ ] **Step 2: Reusar módulos existentes**

Não duplicar lógica. Reusar:
- criação de `Prazo`
- criação de `Task`
- persistência de `Publication`

Para CRM no MVP:
- criar registro simples em entidade local nova ou placeholder controlado se CRM ainda não existir

- [ ] **Step 3: Persistir `TriageDecision`**

Ao confirmar ou descartar:
- gravar tipo
- motivo
- usuário
- timestamp
- ids gerados

- [ ] **Step 4: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/triage.actions.ts backend/src/main.ts
git commit -m "feat: execute triage decisions into operational entities"
```

### Task 6: Expor API frontend da triagem

**Files:**
- Modify: `frontend/src/api.ts`

- [ ] **Step 1: Adicionar tipos**

Criar interfaces:
- `ApiTriageItem`
- `ApiTriageDecision`
- `ApiPublicationCapture`
- `ApiPublicationEvent`
- `ApiSourceJob`

- [ ] **Step 2: Adicionar métodos**

Criar:
- `getTriage`
- `getTriageItem`
- `updateTriageItem`
- `decideTriageItem`
- `ingestPublicationCapture`

- [ ] **Step 3: Rodar build do frontend**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/api.ts
git commit -m "feat: add triage api client"
```

### Task 7: Criar tela de Triagem

**Files:**
- Create: `frontend/src/Triagem.tsx`
- Create: `frontend/src/Triagem.css`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/sidebar/SidebarNav.tsx`

- [ ] **Step 1: Criar rota e item de navegação**

Adicionar rota `/triagem` e entrada na sidebar para `ADM`, `ADV`, `ATD`.

- [ ] **Step 2: Implementar layout base**

Topo:
- título `Triagem`
- resumo curto
- ação `Atualizar`

KPIs:
- críticos pendentes
- normais pendentes
- em revisão manual
- tratados hoje
- CRM gerado

Abas:
- `Crítica`
- `Normal`
- `Tratados`

- [ ] **Step 3: Implementar lista operacional**

Cada item mostra:
- fonte
- processo/cliente
- horário
- criticidade
- confiança
- ação sugerida
- justificativa curta

- [ ] **Step 4: Implementar drawer**

Seções:
- contexto
- texto da publicação
- leitura da IA/regra
- timeline
- rodapé com ações

- [ ] **Step 5: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/Triagem.tsx frontend/src/Triagem.css frontend/src/App.tsx frontend/src/sidebar/SidebarNav.tsx
git commit -m "feat: add triage workspace ui"
```

### Task 8: Implementar ações da UI da triagem

**Files:**
- Modify: `frontend/src/Triagem.tsx`

- [ ] **Step 1: Confirmar ação**

Fluxos:
- confirmar prazo
- confirmar tarefa
- confirmar oportunidade/lead

- [ ] **Step 2: Descartar com motivo obrigatório**

Motivos:
- duplicada
- irrelevante
- sem relação
- falso positivo da IA
- já tratada fora
- outro

- [ ] **Step 3: Adiar e revisão manual**

Implementar:
- sugestão automática de adiamento
- edição manual do horário
- mudança de estado para revisão manual

- [ ] **Step 4: Rodar build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/Triagem.tsx
git commit -m "feat: add triage decision flows"
```

### Task 9: Documentação e reconciliação

**Files:**
- Modify: `docs-juridico/30-Mapeamento-Tela-API-P0.md`
- Modify: `docs-juridico/29-Plano-Producao-Full-Lifecycle.md`

- [ ] **Step 1: Atualizar mapa tela x API**

Adicionar:
- módulo `Triagem`
- novas rotas
- novas entidades

- [ ] **Step 2: Atualizar plano de produção**

Registrar:
- módulo `Triagem`
- captura de publicações automatizadas
- vínculo com CRM

- [ ] **Step 3: Commit**

```bash
git add docs-juridico/30-Mapeamento-Tela-API-P0.md docs-juridico/29-Plano-Producao-Full-Lifecycle.md
git commit -m "docs: reconcile triage automation plan"
```

### Task 10: Verificação final do MVP

**Files:**
- Test: backend + frontend + fluxo manual

- [ ] **Step 1: Rodar backend build**

Run: `npm run build`
Workdir: `backend`
Expected: PASS

- [ ] **Step 2: Rodar frontend build**

Run: `npm run build`
Workdir: `frontend`
Expected: PASS

- [ ] **Step 3: Rodar testes de contrato**

Run: `node --test backend/test/triage.contract.test.cjs backend/test/triage.matcher.test.cjs`
Expected: PASS

- [ ] **Step 4: Validar fluxo manual no staging/local**

Checklist:
- abrir `/triagem`
- ver abas `Crítica`, `Normal`, `Tratados`
- confirmar item gerando prazo
- confirmar item gerando tarefa
- descartar item com motivo obrigatório
- verificar histórico em `Tratados`

- [ ] **Step 5: Commit final**

```bash
git status
git add .
git commit -m "feat: deliver triage automation mvp"
```

## Notes

- O MVP não depende de IA sofisticada. A classificação inicial pode ser determinística.
- A camada de IA entra depois, sobre `TriageItem`, sem redesenhar o domínio.
- Se não existir entidade real de CRM ainda, o plano precisa decidir entre criar `Lead/Opportunity` locais ou introduzir esse domínio antes da Fase 5.
