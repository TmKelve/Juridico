# Epic 9-10 - Validação de Qualidade/Limpeza (Regressão)

Data: 2026-05-17

Escopo executado:
- Limpeza pontual em `frontend/src/components/ui/**` e `frontend/src/components/product/**` com redução de duplicação interna sem alteração de API pública (props/exports preservados).
- Reforço mínimo dos smoke checks em `frontend/admin.users.smoke.test.ts` e `frontend/adv.screens.smoke.test.ts` para validar navegação por rota e presença de shell/cabeçalho das telas migradas.
- Execução de validação solicitada:
  - `npm --prefix frontend run build`
  - `npm --prefix frontend run test:smoke -- --list`

Gaps de acessibilidade/responsividade identificados para ataque posterior:
- Smoke atual valida navegação/render, mas não cobre teclado/foco (`Tab`, ordem de foco, `Esc`) nem semântica ARIA dos componentes de formulário.
- Não há cobertura automatizada de viewport mobile/tablet para verificar quebra de layout e overflow horizontal nas telas migradas.
