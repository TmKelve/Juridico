import { expect, type Page, test } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
const advogadoEmail = 'advogado@juridico.com'

const mockedUser = { id: 2, email: advogadoEmail, role: 'ADV' }
const mockedHome = {
  profile: 'ADV',
  home: {
    menu: ['processos', 'publicacoes', 'triagem', 'clientes', 'crm'],
    cards: ['queue', 'agenda', 'deadlines'],
  },
}

const mockedClients = [
  {
    id: 91,
    name: 'Cliente Origem Atlas',
    type: 'PJ',
    cpfCnpj: '12345678000199',
    phone: '11999999999',
    email: 'contato@atlas.test',
    address: 'Rua da Correlação, 100',
    status: 'ativo',
    legalArea: 'Cível',
    responsible: 'advogado',
    notes: 'Cliente com publicação correlacionada por capture record.',
    createdAt: '2026-05-25T10:00:00.000Z',
    processes: [
      {
        id: 301,
        title: 'Cumprimento de sentença Atlas',
        client: 'Cliente Origem Atlas',
        phase: 'Execução',
        status: 'ativo',
        ownerId: 2,
        owner: mockedUser,
        lastAttendanceAt: '2026-05-25T11:30:00.000Z',
        pendingDocumentsCount: 1,
      },
    ],
    metrics: {
      lastAttendanceAt: '2026-05-25T11:30:00.000Z',
      pendingDocumentsCount: 1,
      pendingAttendance: true,
      pendingItems: 2,
    },
  },
]

const mockedPortal = {
  clientId: 91,
  summary: {
    activeProcesses: 1,
    pendingDocuments: 1,
    recentPublications: 1,
  },
  cards: {
    client: { id: 91, name: 'Cliente Origem Atlas', status: 'ativo' },
    documents: [
      {
        documentId: 501,
        processId: 301,
        title: 'Checklist de origem',
        status: 'pendente',
        category: 'Checklist',
        uploadedAt: '2026-05-25T12:00:00.000Z',
      },
    ],
    publications: [
      {
        publicationId: 401,
        processId: 301,
        title: 'Intimação com referência de captura',
        status: 'em análise',
        publishedAt: '2026-05-25T09:00:00.000Z',
        requiresAction: true,
      },
    ],
    deadlines: [
      {
        deadlineId: 601,
        processId: 301,
        title: 'Prazo derivado da origem',
        status: 'aberto',
        dueDate: '2026-05-30T12:00:00.000Z',
        priority: 'alta',
      },
    ],
  },
  timeline: [
    {
      entityType: 'publication',
      entityId: 401,
      processId: 301,
      title: 'Origem capturada',
      status: 'publicada',
      occurredAt: '2026-05-25T09:10:00.000Z',
      highlight: 'correlationId corr-origin-301',
    },
  ],
}

const mockedCommunications = {
  clientId: 91,
  items: [
    {
      communicationId: 'comm-91',
      channel: 'email',
      status: 'failed',
      attemptKind: 'send',
      retryCount: 1,
      providerMessageId: null,
      failureMessage: 'Provider timeout',
      sentAt: '2026-05-25T10:00:00.000Z',
      deliveredAt: null,
      summary: 'Atualização sobre publicação correlacionada.',
    },
  ],
}

const mockedConsent = {
  clientId: 91,
  consentVersion: 3,
  preferences: {
    email: true,
    whatsapp: true,
    portal: true,
  },
  legalBasis: 'consentimento',
  capturedAt: '2026-05-24T10:00:00.000Z',
  capturedBy: advogadoEmail,
  updatedAt: '2026-05-25T08:00:00.000Z',
}

const mockedPublications = [
  {
    id: 401,
    tipo: 'intimacao',
    status: 'em_analise',
    impacto: 'alto',
    processId: 301,
    processLabel: '#301',
    processTitle: 'Cumprimento de sentença Atlas',
    client: 'Cliente Origem Atlas',
    tribunal: 'TJSP',
    origem: 'Captura Diário Oficial · corr-origin-301',
    dataPublicacao: '2026-05-25',
    resumo: 'Evento normalizado com vínculo explícito de origem.',
    textoRelevante: 'Intime-se a parte para manifestação.',
    exigeAcao: true,
    convertidaEmPrazo: true,
    prazoDerivedoLabel: 'Prazo: 30/05/2026',
    derivedDeadlineId: 601,
    observacoes: 'Validar a timeline consolidada antes do reprocessamento.',
    lida: false,
  },
]

const mockedTriageItems = [
  {
    id: 701,
    queueType: 'critica',
    status: 'pendente',
    suggestedAction: 'criar_oportunidade',
    suggestedReason: 'Origem capturada com risco alto e sem confirmação comercial.',
    aiConfidenceBand: 'alta',
    aiScoreRaw: 0.94,
    postponeUntil: null,
    assignedQueue: 'origem-publicacoes',
    handledBy: null,
    handledAt: null,
    discardReason: null,
    discardNote: null,
    sourceLabel: 'Diário Oficial',
    createdAt: '2026-05-25T09:05:00.000Z',
    updatedAt: '2026-05-25T09:05:00.000Z',
    priorityScore: 93,
    priorityLabel: 'critica',
    priorityReasons: ['Impacto alto', 'Sem ação derivada confirmada'],
    queueRank: 1,
    agingHours: 2,
    slaTargetAt: '2026-05-25T15:00:00.000Z',
    breached: false,
    operationalBucket: 'origem',
    processId: 301,
    processLabel: '#301',
    processTitle: 'Cumprimento de sentença Atlas',
    clientId: 91,
    client: 'Cliente Origem Atlas',
    crmLeadId: null,
    crmOpportunityId: 801,
    capture: {
      id: 901,
      sourceType: 'diario',
      sourceReference: 'DJE/TJSP/2026-05-25',
      occurredAt: '2026-05-25T08:55:00.000Z',
      tribunal: 'TJSP',
      processNumber: '0001234-55.2026.8.26.0100',
      cpf: '12345678900',
      personName: 'Cliente Origem Atlas',
      normalizedText: 'Publicação correlacionada com oportunidade CRM.',
    },
    event: {
      id: 401,
      publicationId: 401,
      title: 'Intimação com referência de captura',
      summary: 'Evento normalizado com origem explícita.',
      riskLevel: 'alto',
      requiresAction: true,
      eventAt: '2026-05-25T09:00:00.000Z',
    },
    timeline: [
      {
        id: 1,
        title: 'Captura recebida',
        summary: 'Registro bruto persistido.',
        eventType: 'capture',
        eventAt: '2026-05-25T08:55:00.000Z',
        riskLevel: 'normal',
        requiresAction: false,
      },
      {
        id: 2,
        title: 'Evento normalizado',
        summary: 'Consolidado para análise operacional.',
        eventType: 'publication',
        eventAt: '2026-05-25T09:00:00.000Z',
        riskLevel: 'alto',
        requiresAction: true,
      },
    ],
    decisions: [],
    explanation: {
      summary: 'A publicação exige validação comercial.',
      appliedRules: ['risk-high', 'crm-followup'],
      matchedSignals: ['correlationId', 'processNumber'],
      confidenceBand: 'alta',
      priorityReasons: ['Impacto alto'],
    },
  },
]

const mockedJobs = [
  {
    id: 1,
    sourceType: 'diario',
    scheduledFor: '2026-05-25T08:00:00.000Z',
    startedAt: '2026-05-25T08:01:00.000Z',
    finishedAt: '2026-05-25T08:02:00.000Z',
    status: 'success',
    itemsCaptured: 1,
    itemsCreated: 1,
    itemsUpdated: 0,
    itemsFlaggedCritical: 1,
    itemsSentToCrm: 1,
    errorLog: null,
  },
]

const mockedLeads = [
  {
    id: 811,
    cpf: '12345678900',
    personName: 'Lead Origem Atlas',
    source: 'triagem',
    status: 'qualificado',
    responsible: 'advogado',
    summary: 'Lead oriundo da mesma cadeia de origem.',
    clientId: 91,
    client: 'Cliente Origem Atlas',
    triageCount: 1,
    hasCriticalTriage: true,
    lastContactAt: '2026-05-25T10:00:00.000Z',
    nextContactAt: '2026-05-26T11:00:00.000Z',
    contactEvents: [],
    createdAt: '2026-05-25T09:30:00.000Z',
    updatedAt: '2026-05-25T09:30:00.000Z',
  },
]

const mockedOpportunities = [
  {
    id: 801,
    convertedProcessId: null,
    cpf: '12345678900',
    personName: 'Cliente Origem Atlas',
    source: 'triagem',
    status: 'acao_recomendada',
    responsible: 'advogado',
    summary: 'Oportunidade originada da publicação correlacionada.',
    clientId: 91,
    client: 'Cliente Origem Atlas',
    triageCount: 1,
    hasCriticalTriage: true,
    lastContactAt: '2026-05-25T10:00:00.000Z',
    nextContactAt: '2026-05-26T11:00:00.000Z',
    contactEvents: [],
    createdAt: '2026-05-25T09:45:00.000Z',
    updatedAt: '2026-05-25T09:45:00.000Z',
  },
]

const mockedOpportunityDocuments = [
  {
    id: 1,
    opportunityId: 801,
    documentId: 501,
    title: 'Checklist de origem',
    category: 'Checklist',
    status: 'pendente',
    mimeType: 'application/pdf',
    previewUrl: null,
    requiredChecklist: true,
    pendingForAdvance: false,
    uploadedAt: '2026-05-25T10:00:00.000Z',
    responsible: 'advogado',
    createdBy: advogadoEmail,
    externalDocumentId: null,
  },
]

const mockedOpportunityAudit = [
  {
    id: 'audit-1',
    scope: 'crm.opportunity.originReference',
    entityType: 'crm_opportunity',
    entityId: 801,
    action: 'origin_reference_attached',
    status: 'success',
    summary: 'Origem anexada à oportunidade.',
    details: { correlationId: 'corr-origin-301' },
    actor: { email: advogadoEmail },
    occurredAt: '2026-05-25T10:10:00.000Z',
    correlationId: 'corr-origin-301',
    idempotencyKey: null,
    createdAt: '2026-05-25T10:10:00.000Z',
  },
]

async function installPublicationOriginMocks(page: Page) {
  await page.route('**/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockedUser }) })
  })

  await page.route('**/home', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedHome) })
  })

  await page.route('**/auth/login', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: mockedUser }) })
  })

  await page.route('**/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) })
  })

  await page.route('**/clients', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedClients) })
  })

  await page.route('**/clients/91/portal*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedPortal) })
  })

  await page.route('**/clients/91/communications*', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedCommunications) })
      return
    }
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          communicationId: 'comm-91-retry',
          deliveryStatus: 'queued',
          retryCount: 2,
          idempotent: false,
        }),
      })
      return
    }
    await route.continue()
  })

  await page.route('**/clients/91/communications/comm-91/retry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        communicationId: 'comm-91',
        deliveryStatus: 'queued',
        retryCount: 2,
        idempotent: false,
      }),
    })
  })

  await page.route('**/clients/91/consent', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedConsent) })
      return
    }
    if (method === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedConsent) })
      return
    }
    await route.continue()
  })

  await page.route('**/publications', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedPublications) })
  })

  await page.route('**/publications/401', async (route) => {
    const method = route.request().method()
    if (method === 'GET' || method === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedPublications[0]) })
      return
    }
    await route.continue()
  })

  await page.route('**/triage/jobs', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedJobs) })
  })

  await page.route('**/triage', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedTriageItems) })
  })

  await page.route('**/triage/701', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedTriageItems[0]) })
  })

  await page.route('**/crm/leads', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedLeads) })
  })

  await page.route('**/crm/opportunities', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedOpportunities) })
  })

  await page.route('**/crm/opportunities/801/documents', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedOpportunityDocuments) })
  })

  await page.route('**/crm/opportunities/801/audit', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockedOpportunityAudit) })
  })
}

async function openShell(page: Page) {
  await page.goto(baseURL)
  await expect(page.locator('.shell-content-canvas')).toBeVisible()
}

test.describe('Publication origin rework - smoke minimo', () => {
  test.beforeEach(async ({ page }) => {
    await installPublicationOriginMocks(page)
  })

  test('ADV navega por publicacoes, triagem, clientes e CRM com contexto de origem mockado', async ({ page }) => {
    await openShell(page)

    await page.goto(`${baseURL}/publicacoes-intimacoes`)
    await expect(page.locator('.publications-page')).toBeVisible()
    await page.locator('tr.pub-table-row').first().click()
    const publicationDrawer = page.locator('.pub-drawer.pub-drawer--open')
    await expect(publicationDrawer).toBeVisible()
    await expect(publicationDrawer.getByText(/corr-origin-301/)).toBeVisible()
    await expect(publicationDrawer.getByText('Prazo derivado', { exact: true })).toBeVisible()

    await page.goto(`${baseURL}/triagem`)
    await expect(page.locator('.triage-page')).toBeVisible()
    await page.locator('.triage-card').first().click()
    const triageDrawer = page.locator('.triage-drawer')
    await expect(triageDrawer.getByText('Detalhe da triagem', { exact: true })).toBeVisible()
    await expect(triageDrawer.getByText('Timeline relacionada', { exact: true })).toBeVisible()
    await expect(triageDrawer.getByText(/Captura recebida/).first()).toBeVisible()

    await page.goto(`${baseURL}/clientes`)
    await expect(page.locator('.clients-page')).toBeVisible()
    await page.locator('tbody tr').first().click()
    const clientDrawer = page.locator('.cli-detail-panel')
    await expect(clientDrawer).toBeVisible()
    await clientDrawer.locator('.cli-detail-tab', { hasText: 'Portal' }).click()
    await expect(page.getByText('Histórico visível no portal', { exact: true })).toBeVisible()
    await expect(page.getByText(/correlationId corr-origin-301/)).toBeVisible()
    await clientDrawer.locator('.cli-detail-tab', { hasText: 'Comunicação' }).click()
    await expect(page.locator('.client-comm-panel')).toBeVisible()
    await expect(page.getByText('Consentimento de canal', { exact: true })).toBeVisible()
    await expect(page.getByText('Atualização sobre publicação correlacionada.', { exact: true })).toBeVisible()
    await expect(page.getByText('Falhou', { exact: true })).toBeVisible()

    await page.goto(`${baseURL}/crm-juridico`)
    await expect(page.getByText('CRM Jurídico', { exact: true })).toBeVisible()
    await page.locator('.crm-card--opportunity').first().click()
    await expect(page.getByText('Detalhe da oportunidade', { exact: true })).toBeVisible()
    await expect(page.getByText('Contexto de triagem', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Converter oportunidade' })).toBeVisible()
  })
})
