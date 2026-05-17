# Governanca UI - Criterios de Pronto e Checklist de PR

Data: 17/05/2026  
Status: obrigatorio para PRs de UI

## 1. Objetivo

Padronizar o criterio de pronto para mudancas de UI e reduzir regressao visual, funcional e de acessibilidade.

## 2. Criterios de Pronto (Definition of Done UI)

## 2.1 Visual

- segue identidade e tokens atuais (tipografia, espacamento, cores, estado de foco)
- nao ha sobreposicao de elementos/textos em breakpoints suportados
- estados de componente cobertos: default, hover, foco, disabled, loading, erro
- icones e acoes seguem padrao de navegacao do sistema

## 2.2 Acessibilidade

- navegacao por teclado funcional nos fluxos alterados
- foco visivel e ordem de tab coerente
- labels e nomes acessiveis presentes em controles interativos
- contraste minimo WCAG AA nos elementos essenciais
- dialogos/menus/popovers com comportamento de foco correto

## 2.3 Responsividade

- comportamento validado em mobile, tablet e desktop
- sem quebra de layout horizontal em resolucoes alvo
- conteudo critico visivel sem bloqueio de acao principal

## 2.4 Regressao

- fluxo principal da tela alterada executado ponta a ponta
- impactos em componentes compartilhados revisados nas telas dependentes
- sem mudanca silenciosa de contrato de props/eventos sem alinhamento

## 3. Checklist Obrigatorio de PR de UI

Copiar e preencher no corpo do PR:

```md
## Checklist UI

- [ ] Escopo de stack alvo respeitado (`Tailwind + shadcn/Radix + wrappers locais`)
- [ ] Decisao de componente documentada (`shadcn` vs `Radix` vs wrapper local)
- [ ] Sem adicao de CSS global legado para feature nova
- [ ] Estados visuais validados (default/hover/focus/disabled/loading/erro)
- [ ] Navegacao por teclado validada nos fluxos alterados
- [ ] Contraste e semantica basica de acessibilidade revisados
- [ ] Responsividade validada (mobile/tablet/desktop)
- [ ] Regressao funcional executada no fluxo principal
- [ ] Evidencias anexadas (prints ou video curto)
- [ ] Documentacao atualizada em `docs-juridico` quando houve decisao estrutural
```

## 4. Evidencias Minimas por Tipo de Mudanca

### Mudanca visual simples (sem fluxo novo)

- 1 print desktop
- 1 print mobile

### Mudanca com interacao (form, dialog, tabela com acao)

- 1 video curto do fluxo principal
- 1 evidencia de foco por teclado (print ou video)

### Mudanca estrutural (layout/base component)

- evidencias das telas impactadas
- nota de risco de regressao e plano de rollback simples

## 5. Regras de Aprovacao

- PR de UI sem checklist preenchido nao entra em merge
- excecoes devem ser explicitas e aprovadas por responsavel de frontend
- se houver excecao de stack, atualizar `36-Migracao-UI-Stack-Alvo.md` no mesmo PR

## 6. Relacao com Documento de Stack

Este checklist operacionaliza as decisoes do documento:

- `docs-juridico/36-Migracao-UI-Stack-Alvo.md`

