# 🗓️ Roadmap Lexora SaaS - Q1-Q2 2026

**Status:** 📅 Planejamento de Features  
**Data:** 2 de abril de 2026  
**Versão Atual:** 1.0.0-alpha (Login + Dashboard)

> Nota de baseline em 12/05/2026: este roadmap permanece como registro histórico do planejamento inicial. O estado real do produto avançou para um alpha funcional com múltiplas telas operacionais ADV. Para execução atual, usar `28-Validacao-Telas-ADV-Full-Lifecycle.md` como evidência de telas e `29-Plano-Producao-Full-Lifecycle.md` como plano vigente de produção.

---

## ✅ Completado (v1.0)

- [x] Autenticação JWT (backend + frontend)
- [x] Tela de Login com acessibilidade WCAG AAA
- [x] Sistema de Design (tokens.css + guia de marca)
- [x] Favicon + app icons
- [x] Dashboard base (layout + KPIs)
- [x] Validação de contraste
- [x] Documentação completa
- [x] Setup CI/CD (Vercel)

---

## 📋 Q1 2026 (Próximas 4 semanas)

### Sprint 1-2: Telas Principais
- [ ] **Processos** (CRUD completo)
  - Listar processos com filtros
  - Criar novo processo
  - Editar processo
  - Deletar processo
  - Visualizar detalhes (modal)
  - Estimativa: 2 sprints

- [ ] **Clientes** (Contact management)
  - Listar clientes
  - Adicionar cliente
  - Editar informações
  - Telefone/email contato
  - Estimativa: 1 sprint

### Sprint 3: Integrações & UX
- [ ] **Notificações** (toast + bell icon)
  - Error/success feedback
  - Browser notifications
  - Estimativa: 0.5 sprint

- [ ] **Testes E2E** (Cypress/Playwright)
  - Login flow
  - Criar processo
  - Atualizar processo
  - Estimativa: 1 sprint

### Sprint 4: Performance
- [ ] **Otimização**
  - Lazy loading de componentes
  - Code splitting
  - Image optimization
  - SEO (sitemap, robots.txt)
  - Estimativa: 0.5 sprint

---

## 📦 Q2 2026 (Próximas 8 semanas)

### Sprint 5-6: Relatórios & Analytics
- [ ] **Dashboards Avançados**
  - Gráficos (Chart.js/Recharts)
  - Filtros por data/tipo
  - Export (PDF/CSV)
  - Estimativa: 2 sprints

- [ ] **Relatórios Periódicos**
  - Relatório de processos
  - Relatório financeiro (para FIN)
  - Relatório de produtividade (para ADV)
  - Estimativa: 1 sprint

### Sprint 7-8: Features Avançadas
- [ ] **Agendamento & Prazos**
  - Calendário (React Big Calendar)
  - Lembretes automáticos
  - Integração com Google Calendar (opcional)
  - Estimativa: 2 sprints

- [ ] **Documentos & Arquivos**
  - Upload de arquivos
  - Preview (PDF, DOC)
  - Versionamento
  - Armazenamento em S3
  - Estimativa: 2 sprints

- [ ] **Permissões Granulares**
  - Matriz de acesso por campo
  - Custom roles
  - Audit log
  - Estimativa: 1 sprint

---

## 🎨 Design System (Contínuo)

- [ ] **Dark mode** (CSS variables ready)
- [ ] **Theming customizável** (multi-tenant)
- [ ] **Componentes adicionais** (modals, dropdowns, etc.)
- [ ] **Iconografia completa** (Feather icons)
- [ ] **Documentação Storybook** (opcional)

---

## 🔒 Segurança & Compliance

- [ ] **2FA** (Two-Factor Authentication)
- [ ] **SSO** (Single Sign On) - Okta/Auth0
- [ ] **LGPD Compliance** (dados pessoais)
- [ ] **Backup automático** (Backblaze/AWS)
- [ ] **Penetration testing**
- [ ] **GDPR ready**

---

## 📱 Mobile & Responsividade

- [ ] **Optimização mobile-first**
- [ ] **PWA** (Progressive Web App)
  - Service Worker
  - Installable app
  - Offline support
- [ ] **React Native app** (opcional, Q3+)

---

## 🔗 Integrações Externas (Q3+)

- [ ] **Email** (SendGrid/AWS SES)
- [ ] **SMS** (Twilio)
- [ ] **WhatsApp** (Twilio)
- [ ] **Google Drive** (documento sharing)
- [ ] **Assinatura Digital** (Docusign/SafeSign)
- [ ] **Webhooks** (para apps de terceiros)

---

## 📊 Estimativa de Esforço

| Feature | Prioridade | Esforço | Sprint |
|---------|-----------|--------|--------|
| Processos (CRUD) | 🔴 P0 | 8 pontos | 1-2 |
| Clientes | 🟡 P1 | 5 pontos | 2-3 |
| Notificações | 🟡 P1 | 3 pontos | 3 |
| Testes E2E | 🟡 P1 | 8 pontos | 4 |
| Dashboards Avançados | 🟡 P1 | 8 pontos | 5-6 |
| Calendário/Prazos | 🟡 P1 | 8 pontos | 7-8 |
| Documentos | 🟡 P1 | 13 pontos | 7-8 |
| 2FA | 🔴 P0 | 5 pontos | Q2+ |
| SSO | 🟢 P2 | 8 pontos | Q3+ |
| Mobile App | 🟢 P2 | 21+ pontos | Q3+ |

---

## 🎯 Métricas de Sucesso

### Qualidade
- ✅ Cobertura de testes: > 80%
- ✅ Accessibility Score: > 90
- ✅ Performance Score: > 85
- ✅ Zero critical bugs

### Adoption
- ✅ 100 usuários beta em Q1
- ✅ 500 usuários em Q2
- ✅ 2000+ usuários em Q3

### Business
- ✅ MRR: R$ 10k em Q2
- ✅ ARPU: R$ 50-200/mês
- ✅ Churn: < 5% mensal
- ✅ NPS: > 40

---

## 💰 Budget Estimado

| Item | Custo/mês | Q1 | Q2 | Total |
|------|-----------|----|----|-------|
| **Hosting** | | | | |
| Vercel (Frontend) | $10-50 | $50 | $50 | $100 |
| Railway/Heroku (Backend) | $10-50 | $50 | $100 | $150 |
| Database (Postgres) | $15-45 | $45 | $90 | $135 |
| **Services** | | | | |
| Sentry (Errors) | $29 | $58 | $58 | $116 |
| GA Enterprise | $150 | $450 | $300 | $750 |
| Auth0/Okta | $0-200 | $0 | $200 | $200 |
| **Total Mensal** | ~$200-400 | | | ~$1,500 |

---

## 👥 Time Recomendado

- **1 Full-stack** (React + Node.js)
- **1 Part-time QA** (testes)
- **1 Product Manager** (priorização)
- **1 Designer** (UX refinements)

**Velocidade:** 2-3 features por sprint (2 semanas)

---

## 📝 Log de Iterações

### v1.0.0-alpha (2 abril 2026) ✅
- Login WCAG AAA
- Dashboard layout
- Design system

### v1.1.0 (15 abril 2026) 🚀
- Processes CRUD
- Clientes básico
- Notificações toast

### v1.2.0 (30 abril 2026)
- Testes E2E
- Performance optimizations
- Documentação Storybook

### v2.0.0 (30 junho 2026)
- Dashboards avançados
- Calendário/Prazos
- Documentos & upload
- 2FA

---

## 🚀 Go-to-Market

### Phase 1: Beta (Abril-Maio)
- 50 beta testers
- Free trial 30 dias
- Feedback collection
- Feature prioritization

### Phase 2: Soft Launch (Junho)
- 500 early adopters
- Pricing tiers (Basic $50, Pro $150, Enterprise $500)
- Basic customer support
- Community Slack

### Phase 3: General Availability (Julho+)
- Marketing campaign
- Sales team onboarding
- Customer success program
- Enterprise deals

---

## 🎯 Next Immediate Steps (Esta Semana)

1. ✅ Validar acessibilidade login (WCAG AAA) — FEITO
2. ✅ Build de produção — FEITO
3. ⏳ Implementar Processes CRUD — SESSION
4. ⏳ Integrar monitoring (Sentry) — SESSION
5. ⏳ Deploy em staging — SESSION

---

**Meta Principal:** Ter MVP funcional (login + processos + dashboard) pronto para 50 beta testers em **15 de abril de 2026**.

**Tempo restante:** 13 dias para 2 sprints

**Velocity requerida:** 13 pontos/sprint (médio)

---

*Roadmap atualizado regularmente conforme feedback de usuários e mudanças de negócio.*

