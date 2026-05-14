# SaaS Jurídico - Documentação do produto

Esta pasta contém a documentação de produto para o SaaS Jurídico, organizada para Obsidian.

## Objetivo
- Tornar a visão do produto executável rapidamente.
- Facilitar priorização e entrega de MVP.
- Ter uma matriz completa por perfil, dashboard e permissão.

## Estrutura do conteúdo
1. 01-Visao-Geral.md - visão geral do produto e filosofia de experiência.
2. 02-Perfis.md - definição de perfis, home e comportamentos.
3. 03-Dashboards.md - mapeamento de dashboards por perfil.
4. 04-Permissoes.md - matriz de permissões por módulo/perfil/ação.
5. 05-Navegacao.md - arquitetura de menu e fluxo de telas.
6. 06-Wireframes.md - wireframes textuais das principais telas.
7. 07-Modelagem-Dados.md - modelo de dados para usuários/perfis/permissões.
8. 08-Agentes-e-Skills.md - análise de agentes/skills para otimização do desenvolvimento (Copilot/AI).
9. 12-Identidade-Visual.md - paleta de cores, tipografia, componentes, espaçamento e diretrizes de marca.
10. 13-Analise-Contraste-Login.md - análise WCAG de acessibilidade da tela de login.
11. 14-Revisao-Design-Login-Fechamento.md - relatório de implementação de melhorias (P1–P7) na tela de login.
12. 15-Teste-Acessibilidade-Manual.md - guia completo de testes de acessibilidade (automático + NVDA + Axe DevTools).
13. 16-Relatorio-Validacao-Testes.md - relatório executivo de validação com evidências (desktop, tablet, mobile).
14. 17-Deploy-Checklist.md - checklist final pré-produção e opções de deployment.
15. 18-Setup-Staging-Producao.md - instruções de deploy em staging/produção (Vercel, Docker, Heroku).
16. 19-Roadmap-Q1-Q2.md - roadmap de features até Q2 2026 (Processes, Clientes, Relatórios, PWA).
17. 20-Guia-Desenvolvimento.md - guia completo para novos desenvolvedores (setup, arquitetura, estilo).
18. 28-Validacao-Telas-ADV-Full-Lifecycle.md - validação mais recente das telas operacionais ADV.
19. 29-Plano-Producao-Full-Lifecycle.md - plano executivo para transformar o alpha atual em produção.
20. 30-Mapeamento-Tela-API-P0.md - contrato atual entre telas P0 e endpoints reais.
21. 31-Plano-Migracao-SQLite-Postgres-Grupo-A.md - roteiro de migração do banco atual sem ampliar domínio.
22. 32-Baseline-Staging-CI.md - baseline operacional para staging e pipeline mínima com Postgres limpo.
23. 33-Runbook-Staging-Deploy.md - runbook operacional para primeira subida de staging.
24. 34-Handoff-Git-Baseline.md - handoff operacional para o primeiro commit tecnico e publicacao no remoto.
25. test-acessibilidade-login.js - script automatizado de testes WCAG (executar no console).

## Status Atual
- Baseline vigente: alpha funcional avançado, conforme `28-Validacao-Telas-ADV-Full-Lifecycle.md`.
- Plano de produção vigente: `29-Plano-Producao-Full-Lifecycle.md`.
- Frontend e backend compilam localmente.
- Frontend passa em lint, ainda com warnings de dependência em hooks.
- Runtime soberano do backend já opera em Postgres.
- Smoke integrado frontend + backend passou em banco Postgres limpo.
- Próximo bloqueio real está em baseline Git, CI versionada e staging remoto persistente.
- Documentos anteriores a `28` devem ser tratados como histórico quando conflitarem com o estado real do código.

## Como usar
- Abra no Obsidian.
- Navegue pelos arquivos para ver o blueprint macro e micro do produto.
- Utilize como base para reuniões de priorização e planejamento de squad.
