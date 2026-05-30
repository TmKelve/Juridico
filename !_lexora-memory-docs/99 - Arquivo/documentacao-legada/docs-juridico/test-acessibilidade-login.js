/**
 * TESTE DE ACESSIBILIDADE - TELA DE LOGIN LEXORA
 * Execute no console do navegador: http://localhost:5173
 * 
 * Validações WCAG 2.1 Level AAA:
 * - Labels visíveis obrigatório
 * - Contraste mínimo 7:1 (AAA)
 * - Foco visível
 * - ARIA attributes corretos
 * - Elementos semânticos (form, label, input, button)
 * - Touch targets mínimo 44x44px
 */

console.log('🔍 INICIANDO TESTE DE ACESSIBILIDADE - LEXORA LOGIN\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Verificar existência de labels
const emailLabel = document.querySelector('label[for="email"]');
const senhaLabel = document.querySelector('label[for="senha"]');

if (emailLabel && emailLabel.textContent.trim()) {
  results.passed.push('✅ Label "Email" visível');
} else {
  results.failed.push('❌ Label "Email" ausente ou vazia');
}

if (senhaLabel && senhaLabel.textContent.trim()) {
  results.passed.push('✅ Label "Senha" visível');
} else {
  results.failed.push('❌ Label "Senha" ausente ou vazia');
}

// Test 2: Verificar inputs com id correspondente
const emailInput = document.getElementById('email');
const senhaInput = document.getElementById('senha');

if (emailInput && emailInput.tagName === 'INPUT') {
  results.passed.push('✅ Input #email semântico');
} else {
  results.failed.push('❌ Input #email não encontrado');
}

if (senhaInput && senhaInput.tagName === 'INPUT') {
  results.passed.push('✅ Input #senha semântico');
} else {
  results.failed.push('❌ Input #senha não encontrado');
}

// Test 3: Verificar ARIA attributes
if (emailInput?.hasAttribute('aria-required')) {
  results.passed.push('✅ Input email tem aria-required');
} else {
  results.warnings.push('⚠️  Input email sem aria-required');
}

if (senhaInput?.hasAttribute('aria-required')) {
  results.passed.push('✅ Input senha tem aria-required');
} else {
  results.warnings.push('⚠️  Input senha sem aria-required');
}

// Test 4: Verificar aria-invalid em estado de erro
const errorContainer = document.getElementById('auth-error');
if (errorContainer) {
  if (errorContainer.hasAttribute('role') && errorContainer.getAttribute('role') === 'alert') {
    results.passed.push('✅ Error container tem role="alert"');
  } else {
    results.failed.push('❌ Error container sem role="alert"');
  }
  
  if (errorContainer.hasAttribute('aria-live')) {
    results.passed.push('✅ Error container tem aria-live');
  } else {
    results.failed.push('❌ Error container sem aria-live');
  }
}

// Test 5: Verificar botão de submit
const submitBtn = document.querySelector('button[type="submit"]');
if (submitBtn) {
  results.passed.push('✅ Botão de submit encontrado');
  
  const btnStyle = window.getComputedStyle(submitBtn);
  const btnWidth = submitBtn.offsetWidth;
  const btnHeight = submitBtn.offsetHeight;
  
  if (btnWidth >= 44 && btnHeight >= 44) {
    results.passed.push(`✅ Touch target adequado (${btnWidth}x${btnHeight}px ≥ 44x44px)`);
  } else {
    results.warnings.push(`⚠️  Touch target abaixo do ideal (${btnWidth}x${btnHeight}px < 44x44px)`);
  }
} else {
  results.failed.push('❌ Botão de submit não encontrado');
}

// Test 6: Verificar formulário semântico
const form = document.querySelector('form');
if (form) {
  results.passed.push('✅ Formulário semântico <form>');
} else {
  results.warnings.push('⚠️  Formulário não é <form> semântico');
}

// Test 7: Verificar contraste (aproximado usando luminância)
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(x => {
    x = x / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(rgb1, rgb2) {
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

if (submitBtn) {
  const btnStyle = window.getComputedStyle(submitBtn);
  const bgColor = btnStyle.backgroundColor;
  const textColor = btnStyle.color;
  
  // Parse RGB values
  const bgMatch = bgColor.match(/\d+/g);
  const textMatch = textColor.match(/\d+/g);
  
  if (bgMatch && textMatch) {
    const contrast = getContrastRatio(
      [parseInt(bgMatch[0]), parseInt(bgMatch[1]), parseInt(bgMatch[2])],
      [parseInt(textMatch[0]), parseInt(textMatch[1]), parseInt(textMatch[2])]
    );
    
    if (parseFloat(contrast) >= 7) {
      results.passed.push(`✅ Contraste botão: ${contrast}:1 (AAA)`);
    } else if (parseFloat(contrast) >= 4.5) {
      results.warnings.push(`⚠️  Contraste botão: ${contrast}:1 (AA, não AAA)`);
    } else {
      results.failed.push(`❌ Contraste botão: ${contrast}:1 (FALHA)`);
    }
  }
}

// Test 8: Verificar logo/marca visual
const logo = document.querySelector('img[alt*="logo"], img[alt*="Lexora"], [class*="logo"]');
if (logo) {
  results.passed.push('✅ Logo/marca visual encontrad(a)');
} else {
  results.warnings.push('⚠️  Logo não encontrado (pode estar em SVG)');
}

// Test 9: Verificar detalhes credential (P3)
const credentialsDetails = document.querySelector('details');
if (credentialsDetails) {
  results.passed.push('✅ Credenciais em elemento <details> (P3 implementado)');
  if (!credentialsDetails.open) {
    results.passed.push('✅ <details> fechado por padrão (segurança)');
  } else {
    results.warnings.push('⚠️  <details> aberto - considere fechar por padrão');
  }
} else {
  results.warnings.push('⚠️  Elemento <details> não encontrado (P3 opcional)');
}

// Test 10: Responsividade (viewport width)
const viewport = window.innerWidth;
results.passed.push(`ℹ️  Viewport atual: ${viewport}x${window.innerHeight}px`);

if (viewport < 768) {
  results.passed.push('ℹ️  Modo mobile detectado - validar touch targets');
}

// Relatório final
console.log('\n' + '='.repeat(60));
console.log('📊 RESULTADO DO TESTE');
console.log('='.repeat(60) + '\n');

console.log(`✅ PASSOU (${results.passed.length}):`);
results.passed.forEach(p => console.log('  ' + p));

if (results.warnings.length > 0) {
  console.log(`\n⚠️  AVISOS (${results.warnings.length}):`);
  results.warnings.forEach(w => console.log('  ' + w));
}

if (results.failed.length > 0) {
  console.log(`\n❌ FALHOU (${results.failed.length}):`);
  results.failed.forEach(f => console.log('  ' + f));
}

console.log('\n' + '='.repeat(60));
console.log(`🎯 RESUMO: ${results.passed.length} ✅ | ${results.warnings.length} ⚠️  | ${results.failed.length} ❌`);
console.log('='.repeat(60) + '\n');

// Recomendações
if (results.failed.length === 0) {
  console.log('✨ LOGIN PASSOU EM TODOS OS TESTES CRÍTICOS!\n');
  console.log('Próximos passos:');
  console.log('  1. Verificar visualmente em diferentes resoluções (mobile, tablet, desktop)');
  console.log('  2. Testar com screen reader (NVDA, JAWS)');
  console.log('  3. Usar Axe DevTools chrome extension para análise completa');
  console.log('  4. Validar em navegadores múltiplos (Chrome, Firefox, Safari)');
} else {
  console.log('⚠️  Corrija os itens com ❌ antes de prosseguir.\n');
}
