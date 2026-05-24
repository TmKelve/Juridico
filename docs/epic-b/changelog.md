# Changelog do Epic B

## 2026-05-21

### Adicionado
- Contrato soberano `contracts/epic-b-finance.contract.json`.
- Schema Prisma financeiro e migration `20260521120000_add_finance_epic_b`.
- Core de lançamentos financeiros com idempotência e auditoria.
- Cobrança mock para Pix/boleto/link.
- Webhook financeiro com baixa automática.
- Conciliação bancária, aging, inadimplência e relatórios.
- Parcelamento financeiro com geração automática de parcelas.
- Visão operacional de inadimplência por cliente/processo/contato.
- Régua de cobrança, job de dispatch e scheduler isolado.
- Adapter HTTP em `backend/src/finance/http/register-finance-routes.ts`.
- Tela operacional `frontend/src/Financeiro.tsx`.

### Alterado
- `backend/src/main.ts` agora registra o módulo financeiro e expõe permissões financeiras granulares.
- `backend/src/main.ts` agora também bootstrapa o scheduler financeiro via flag `FINANCE_SCHEDULER_ENABLED`.
- `frontend/src/App.tsx` e `frontend/src/sidebar/SidebarNav.tsx` agora expõem a navegação do financeiro.
- `frontend/src/api.ts` passou a consumir os endpoints do Epic B.
- `frontend/package.json` inclui o smoke financeiro em `test:smoke`.

### Impacto
- Novo módulo transversal com persistência, auditoria e UI.
- Nenhuma rota antiga foi removida.
- O scheduler financeiro ainda precisa de bootstrap explícito para operação automática contínua.
- O financeiro agora suporta vínculo operacional entre lançamento, cliente e processo, além de planos parcelados acompanháveis por status de parcela.
