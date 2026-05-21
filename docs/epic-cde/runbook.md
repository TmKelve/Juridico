# Runbook do Epic CDE

## Operacao diaria
- Validar usuario ADM e ADV no seed.
- Conferir se CRM, Publicacoes e Prazos sobem com labels esperados.
- Garantir que publicacao elegivel exista para smoke de conversao.
- Garantir que ao menos um prazo com trilha exista para smoke de operacao.

## Como validar o ambiente
1. Rodar o build do backend.
2. Rodar o build do frontend.
3. Validar os testes de docs e seed.
4. Subir backend e frontend.
5. Executar smoke de ADM, ADV e Epic CDE.

## Como reconhecer falha
- Conversao CRM sem dialogo ou sem mensagem de sucesso.
- Botao `Criar prazo` ausente ou desabilitado sem justificativa.
- Tela de Prazos sem contrato visual ou sem dados seedados.
- Repeticao de chamada gerando efeito duplicado.

## Como responder
- Recarregar o seed antes de abrir incidente funcional.
- Confirmar se a quebra esta em label, contrato visual ou persistencia.
- Se o replay idempotente falhou, registrar a chave usada e a resposta da segunda chamada.
- Se a agenda nao sincronizou, tratar como gap de orquestracao e nao como regressao de smoke isolado.

## Checklist de incidente
- Identificar tela afetada.
- Identificar usuario e contexto do seed.
- Registrar a acao que falhou.
- Registrar a chave de idempotencia quando existir.
- Registrar se a falha foi funcional, visual ou de integracao.
- Atualizar `changelog.md` com impacto e decisao.

