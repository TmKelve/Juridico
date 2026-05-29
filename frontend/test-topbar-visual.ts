import { chromium } from 'playwright'
import path from 'path'

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots')
const BASE_URL = 'http://localhost:5173'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  // Capturar erros de console
  const consoleErrors: string[] = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  console.log('=== ETAPA 1: Login ===')
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.fill('#email', 'admin@juridico.com')
  await page.fill('#password', '123456')
  await page.click('button[type="submit"]')
  await page.waitForTimeout(2000)
  
  // Verificar se logou (deve ter a topbar)
  const topbar = await page.locator('header[role="banner"]')
  if (await topbar.isVisible()) {
    console.log('✅ Login bem-sucedido — Topbar visível')
  } else {
    console.log('❌ Login falhou')
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-login-fail.png') })
    await browser.close()
    return
  }
  
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dashboard.png'), fullPage: false })
  console.log('📸 Screenshot: dashboard')

  // === TESTE 1: Notificações ===
  console.log('\n=== ETAPA 2: Notificações ===')
  
  // Encontrar o botão de notificações pelo aria-label
  const bellBtn = page.locator('button[aria-label="Abrir notificações"]')
  if (await bellBtn.isVisible()) {
    console.log('✅ Botão de notificações visível')
    
    // Verificar badge
    const badge = bellBtn.locator('span[aria-label*="notificações"]')
    if (await badge.isVisible()) {
      const badgeText = await badge.textContent()
      console.log(`✅ Badge de notificações: ${badgeText}`)
    }
    
    // Abrir dropdown
    await bellBtn.click()
    await page.waitForTimeout(500)
    
    const notifDropdown = page.locator('.notif-dropdown')
    if (await notifDropdown.isVisible()) {
      console.log('✅ Dropdown de notificações aberto')
      
      // Verificar itens
      const items = await page.locator('.notif-item').count()
      console.log(`   → ${items} notificações exibidas`)
      
      // Verificar loading/empty
      const loading = await page.locator('.notif-loading').isVisible()
      if (loading) console.log('   ℹ️ Loading state ativo')
      
      // Verificar botão "Marcar todas como lidas"
      const markAllBtn = page.locator('.notif-mark-all-btn')
      if (await markAllBtn.isVisible()) {
        console.log('✅ Botão "Marcar todas como lidas" visível')
      }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-notificacoes.png'), fullPage: false })
      console.log('📸 Screenshot: notificações dropdown')
      
      // Testar marcar todas como lidas
      if (await markAllBtn.isVisible()) {
        await markAllBtn.click()
        await page.waitForTimeout(300)
        const unreadDots = await page.locator('.notif-unread-dot').count()
        console.log(`   → Após marcar todas: ${unreadDots} não lidas`)
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02b-notif-all-read.png'), fullPage: false })
      }
      
      // Fechar com Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      const stillOpen = await notifDropdown.isVisible()
      console.log(stillOpen ? '❌ Escape não fechou dropdown' : '✅ Escape fechou dropdown')
    } else {
      console.log('❌ Dropdown de notificações NÃO abriu')
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-notif-fail.png'), fullPage: false })
    }
  } else {
    console.log('❌ Botão de notificações NÃO encontrado')
  }

  // === TESTE 2: Atalhos ===
  console.log('\n=== ETAPA 3: Atalhos ===')
  
  const gridBtn = page.locator('button[aria-label="Abrir atalhos"]')
  if (await gridBtn.isVisible()) {
    console.log('✅ Botão de atalhos visível')
    
    await gridBtn.click()
    await page.waitForTimeout(500)
    
    const shortcutsPanel = page.locator('.shortcuts-launcher')
    if (await shortcutsPanel.isVisible()) {
      console.log('✅ Painel de atalhos aberto')
      
      const shortcuts = await page.locator('.shortcut-item').count()
      console.log(`   → ${shortcuts} atalhos exibidos`)
      
      // Verificar se tem os atalhos esperados
      const labels = await page.locator('.shortcut-label').allTextContents()
      console.log(`   → Labels: ${labels.join(', ')}`)
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-atalhos.png'), fullPage: false })
      console.log('📸 Screenshot: atalhos')
      
      // Testar Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)
      const stillOpen = await shortcutsPanel.isVisible()
      console.log(stillOpen ? '❌ Escape não fechou atalhos' : '✅ Escape fechou atalhos')
    } else {
      console.log('❌ Painel de atalhos NÃO abriu')
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-atalhos-fail.png'), fullPage: false })
    }
  } else {
    console.log('❌ Botão de atalhos NÃO encontrado')
  }

  // === TESTE 3: User Menu ===
  console.log('\n=== ETAPA 4: User Menu ===')
  
  const userBtn = page.locator('button[aria-label="Abrir menu do perfil"]')
  if (await userBtn.isVisible()) {
    console.log('✅ Botão de usuário visível')
    
    await userBtn.click()
    await page.waitForTimeout(500)
    
    const userDropdown = page.locator('.user-dropdown')
    if (await userDropdown.isVisible()) {
      console.log('✅ Dropdown do usuário aberto')
      
      const items = await page.locator('.user-dropdown-item').allTextContents()
      console.log(`   → Itens: ${items.map(i => i.trim()).join(' | ')}`)
      
      // Verificar separador
      const separator = page.locator('.user-dropdown-separator')
      if (await separator.isVisible()) {
        console.log('✅ Separador visível antes do "Sair"')
      }
      
      // Verificar item danger
      const dangerItem = page.locator('.user-dropdown-item--danger')
      if (await dangerItem.isVisible()) {
        console.log('✅ Item "Sair" com estilo destrutivo')
      }
      
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-user-menu.png'), fullPage: false })
      console.log('📸 Screenshot: user menu')
      
      // Clicar em "Meu perfil"
      await page.locator('.user-dropdown-item').first().click()
      await page.waitForTimeout(500)
      
      const profilePanel = page.locator('.profile-panel')
      if (await profilePanel.isVisible()) {
        console.log('✅ Profile Panel aberto')
        
        // Verificar seções
        const avatarWrapper = page.locator('.profile-avatar-wrapper')
        if (await avatarWrapper.isVisible()) {
          console.log('✅ Avatar com overlay de upload')
        }
        
        const passwordSection = page.locator('#current-pw')
        if (await passwordSection.isVisible()) {
          console.log('✅ Formulário de alterar senha')
        }
        
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-profile-panel.png'), fullPage: false })
        console.log('📸 Screenshot: profile panel')
        
        // Fechar
        await page.locator('.profile-panel-close').click()
        await page.waitForTimeout(300)
      } else {
        console.log('❌ Profile Panel NÃO abriu')
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-profile-fail.png'), fullPage: false })
      }
      
      // Abrir dropdown de novo e testar "Configurações"
      await userBtn.click()
      await page.waitForTimeout(300)
      
      const settingsItem = page.locator('.user-dropdown-item').nth(1)
      if (await settingsItem.isVisible()) {
        await settingsItem.click()
        await page.waitForTimeout(500)
        
        const settingsPanel = page.locator('.profile-panel').filter({ hasText: 'Configurações' })
        if (await settingsPanel.isVisible()) {
          console.log('✅ Settings Panel (WhatsApp) aberto')
          
          // Testar máscara de telefone
          const phoneInput = page.locator('#whatsapp-phone')
          if (await phoneInput.isVisible()) {
            await phoneInput.fill('11999887766')
            await page.waitForTimeout(200)
            const maskedValue = await phoneInput.inputValue()
            console.log(`   → Máscara aplicada: "${maskedValue}"`)
          }
          
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-settings-whatsapp.png'), fullPage: false })
          console.log('📸 Screenshot: settings (WhatsApp)')
          
          await page.locator('.profile-panel-close').click()
          await page.waitForTimeout(300)
        } else {
          console.log('❌ Settings Panel NÃO abriu')
        }
      }
    } else {
      console.log('❌ Dropdown do usuário NÃO abriu')
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-user-fail.png'), fullPage: false })
    }
  } else {
    console.log('❌ Botão de usuário NÃO encontrado')
  }

  // === TESTE 4: Responsividade ===
  console.log('\n=== ETAPA 5: Responsividade ===')
  
  // Tablet (768px)
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-tablet-768.png'), fullPage: false })
  console.log('📸 Screenshot: tablet 768px')
  
  // Mobile (640px)
  await page.setViewportSize({ width: 640, height: 900 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-mobile-640.png'), fullPage: false })
  console.log('📸 Screenshot: mobile 640px')

  // === Resumo ===
  console.log('\n=== RESUMO ===')
  if (consoleErrors.length > 0) {
    console.log(`⚠️ ${consoleErrors.length} erros de console:`)
    consoleErrors.forEach(e => console.log(`   → ${e.slice(0, 150)}`))
  } else {
    console.log('✅ Nenhum erro de console')
  }

  await browser.close()
  console.log('\n✅ Todos os testes concluídos. Screenshots em: test-screenshots/')
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
