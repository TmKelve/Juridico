# 📋 Teste de Acessibilidade - Login Lexora

**Status:** ✅ Automatizado + Manual

**Data:** 2 de abril de 2026  
**Versão:** 1.0

---

## 🎯 Como Executar Testes

### **Opção 1: Teste Automatizado (Console)**

1. Abra http://localhost:5173 no navegador
2. Abra o **DevTools** (F12 ou Ctrl+Shift+I)
3. Vá para aba **Console**
4. Copie e cole o conteúdo de `test-acessibilidade-login.js`
5. Pressione Enter

**Resultado esperado:**
```
✅ PASSOU (10+)
⚠️  AVISOS (0-2)
❌ FALHOU (0)
```

---

### **Opção 2: Teste com Axe DevTools (Recomendado)**

1. Instale extensão [Axe DevTools](https://www.deque.com/axe/devtools/) no Chrome/Edge
2. Abra http://localhost:5173
3. Clique no ícone Axe no DevTools
4. Clique "Scan ALL of my page"
5. Revise "Violations" e "Best Practices"

**Resultado esperado:**
- ✅ 0 violations
- ✅ 0 needs review (forma acessível)

---

### **Opção 3: Teste com NVDA (Screen Reader)**

**Pré-requisitos:**
- Instale [NVDA](https://www.nvaccess.org/download/) (gratuito)

**Procedimento:**
1. Inicie NVDA (Ctrl+Alt+N)
2. Navegue com Tab entre campos:
   - ✅ "Lexora" deve ser pronunciado (logo)
   - ✅ "Email" label deve ser pronunciado
   - ✅ "Senha" label deve ser pronunciado
   - ✅ "Entrar" botão deve ser pronunciado
3. Pressione Enter no Form
4. Se houver erro:
   - ✅ "Erro: Email ou senha incorretos" deve ser anunciado automaticamente

---

## ✅ Checklist de Testes Visuais

Abra http://localhost:5173 e valide:

### **Teste: Desktop (1920x1080)**
- [ ] Logo Lexora visível no cabeçalho
- [ ] Labels "Email" e "Senha" visíveis e alinhados
- [ ] Inputs possuem border clara
- [ ] Botão "Entrar" tem background Lexora navy (#223B4D)
- [ ] Botão tem cor de texto contrastada (branco)
- [ ] Ao clicar no input, aparece focus ring azul
- [ ] Ao submeter, botão muda para "Entrando..."
- [ ] Se erro, borda vermelha + ícone ⚠️ aparecem
- [ ] "Precisa de credenciais?" pode ser expandido

### **Teste: Tablet (768x1024)**
- [ ] Logo redimensiona mantendo proporção
- [ ] Inputs ocupam 90% da largura disponível
- [ ] Labels legíveis
- [ ] Botão 44x44px ou maior
- [ ] Details element funciona ao tocar

### **Teste: Mobile (375x812)**
- [ ] Todo conteúdo visível sem overflow horizontal
- [ ] Inputs com padding confortável
- [ ] Botão toca a largura inteira (com padding)
- [ ] Teclado virtual não oculta campos
- [ ] Credenciais expandem sem problemas

---

## 📊 Resultados Esperados

| Teste | Resultado | Evidência |
|-------|-----------|-----------|
| **Labels visíveis** | ✅ PASSOU | <label htmlFor="email"> em DOM |
| **Contraste AAA** | ✅ PASSOU | 11.2:1 (botão) + 13.4:1 (labels) |
| **Focus visível** | ✅ PASSOU | outline 2px solid #6A97BA |
| **ARIA attributes** | ✅ PASSOU | aria-required, aria-invalid, aria-live |
| **Touch targets** | ✅ PASSOU | 44px mínimo |
| **Semântica HTML** | ✅ PASSOU | <form>, <label>, <input>, <button> |
| **Credenciais ocultas** | ✅ PASSOU | <details> fechado por padrão |
| **Feedback de erro** | ✅ PASSOU | role="alert" aria-live="assertive" |
| **SVG logo** | ✅ PASSOU | lexora-logo.svg carregado |
| **Favicon** | ✅ PASSOU | favicon.ico + app icons copiados |

---

## 🚀 Próximos Passos

Após validar todos os testes:

```bash
# Build de produção
npm run build

# Resultado esperado:
# ✓ 26 modules transformed
# ✓ built in XXms
```

---

## 📞 Troubleshooting

### "Erro 404 no favicon"
**Solução:** Limpe cache (Ctrl+Shift+Delete) e recarregue

### "Logo não aparece"
**Solução:** Verifique se `lexora-logo.svg` existe em `frontend/public/`

### "Inputs sem labels"
**Solução:** Verifique se App.tsx contém `<label htmlFor="email">` com id correspondente

### "Foco não visível"
**Solução:** Verifique tokens.css - deve ter `--focus-ring: 2px solid ...`

---

## 📝 Documentação Relacionada

- [12-Identidade-Visual.md](12-Identidade-Visual.md) — Sistema de design Lexora
- [13-Analise-Contraste-Login.md](13-Analise-Contraste-Login.md) — Análise WCAG detalhada
- [14-Revisao-Design-Login-Fechamento.md](14-Revisao-Design-Login-Fechamento.md) — Implementação P1-P7

---

**Atualizado:** 2 de abril de 2026  
**Status:** ✅ Pronto para testes
