const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const dist = (...parts) => path.resolve(__dirname, '..', 'dist', ...parts);

test('smoke: triagem -> decisao -> automacao', async () => {
  const { assistTriageDecision } = require(dist('triage', 'decision', 'assisted-triage-decision.js'));
  const { executePostTriageAutomation } = require(dist('triage', 'automation', 'post-triage-automation-runner.js'));

  const triageItem = {
    id: 901,
    queueType: 'critica',
    status: 'pendente',
    suggestedAction: 'criar_prazo',
    suggestedReason: 'Prazo fatal identificado.',
    processId: 33,
    clientId: 12,
    crmLeadId: null,
    crmOpportunityId: null,
    assignedQueue: 'fila_central',
    discardReason: null,
    discardNote: null,
    postponeUntil: null,
    aiConfidenceBand: 'alta',
    priorityReasons: ['prazo fatal'],
    process: { phase: 'Recursal', client: 'Cliente Atlas' },
    clientRecord: { name: 'Cliente Atlas' },
    capture: {
      normalizedText: 'Intimacao para apresentar contrarrazoes em 8 dias.',
      occurredAt: new Date('2026-05-22T12:00:00.000Z'),
      sourceReference: 'DJSP-901',
    },
    event: {
      publicationId: 901,
      title: 'Intimacao recursal',
      summary: 'Manifestacao obrigatoria',
      riskLevel: 'critico',
      requiresAction: true,
      eventAt: new Date('2026-05-22T12:00:00.000Z'),
    },
  };

  const assisted = assistTriageDecision({
    triageItem,
    decision: {
      triageItemId: 901,
      decisionType: 'confirmado',
      decisionReason: 'Fluxo critico confirmado',
      idempotencyKey: 'triage-smoke-901',
      dueDate: '2026-05-30',
      taskDueDate: '2026-05-29',
    },
    actor: 'user:1',
    now: new Date('2026-05-22T12:05:00.000Z'),
  });

  const executed = await executePostTriageAutomation({
    triageItemId: 901,
    commands: assisted.automation.commands,
    executor: {
      async execute(command) {
        return { entityId: `${command.type}-ok` };
      },
    },
  });

  assert.equal(assisted.projection.automationPlanned, true);
  assert.equal(assisted.explanation.confidenceBand, 'alta');
  assert.equal(executed.executed.length, 1);
  assert.equal(executed.failed.length, 0);
});

test('smoke: documento -> aprovacao -> vinculo', async () => {
  const { DocumentUploadService } = require(dist('documents', 'upload', 'document-upload.service.js'));
  const { DocumentApprovalService } = require(dist('documents', 'approval', 'document-approval.service.js'));
  const { DocumentLinksService, InMemoryDocumentLinksRepository } = require(dist('documents', 'links'));
  const { DocumentAuditService, InMemoryDocumentAuditSink } = require(dist('documents', 'audit'));

  const docs = new Map();
  let nextId = 1001;

  const uploadService = new DocumentUploadService(
    {
      async store(input) {
        return {
          storageKey: `memory://${input.processId}/${input.fileName}`,
          mimeType: input.mimeType,
          sizeInBytes: input.sizeInBytes,
          checksum: 'checksum-1001',
          previewUrl: null,
        };
      },
    },
    {
      async assertProcessExists(processId) {
        return { id: processId, proceduralType: 'default' };
      },
      async createDocument(input) {
        const document = {
          id: nextId++,
          processId: input.processId,
          title: input.title,
          status: input.status,
          category: input.category,
          version: 1,
          isLatestVersion: true,
          mimeType: input.mimeType,
          previewUrl: input.previewUrl,
          metadata: input.metadata,
          storage: input.storage,
        };
        docs.set(document.id, {
          ...document,
          description: input.description,
          origin: input.origin,
          responsible: input.responsible,
          requiredChecklist: input.requiredChecklist,
          pendingForAdvance: input.pendingForAdvance,
        });
        return document;
      },
    },
  );

  const uploaded = await uploadService.upload({
    processId: 19,
    title: 'Procuracao assinada',
    actor: { source: 'user', email: 'adv@lexora.local' },
    file: { fileName: 'procuracao.pdf', contentBase64: Buffer.from('pdf').toString('base64') },
    metadata: { proceduralType: 'default', documentType: 'procuracao' },
  });

  const approvalService = new DocumentApprovalService({
    async findById(documentId) {
      const document = docs.get(documentId);
      return document
        ? {
            id: document.id,
            processId: document.processId,
            title: document.title,
            status: document.status,
            version: document.version,
            isLatestVersion: document.isLatestVersion,
            metadata: document.metadata,
          }
        : null;
    },
    async saveDecision(input) {
      const document = docs.get(input.documentId);
      document.status = input.decision === 'approved' ? 'validado' : 'rejeitado';
      docs.set(input.documentId, document);
      return {
        documentId: input.documentId,
        status: document.status,
        decision: input.decision,
        reason: input.reason,
        decidedAt: '2026-05-22T12:10:00.000Z',
        checklist: input.checklist,
      };
    },
  });

  const decision = await approvalService.decide({
    documentId: uploaded.document.id,
    decision: 'approved',
    reason: 'Checklist atendido',
    actor: { source: 'user', email: 'adv@lexora.local' },
  });

  const linkRepository = new InMemoryDocumentLinksRepository();
  linkRepository.seedDocument({ id: uploaded.document.id, processId: 19 });
  linkRepository.seedTarget({ entityType: 'process', entityId: 19 });
  linkRepository.seedTarget({ entityType: 'deadline', entityId: 71 });

  const linkService = new DocumentLinksService(linkRepository, {
    auditService: new DocumentAuditService(new InMemoryDocumentAuditSink()),
  });

  const links = await linkService.bindEntities({
    documentId: uploaded.document.id,
    processId: 19,
    deadlineId: 71,
    actor: { source: 'user', email: 'adv@lexora.local' },
    occurredAt: '2026-05-22T12:11:00.000Z',
  });

  assert.equal(decision.status, 'validado');
  assert.equal(links.links.length, 2);
  assert.equal(links.auditEvents.length, 2);
});

test('smoke: cliente -> comunicacao -> historico', async () => {
  const { ClientConsentService } = require(dist('clients', 'consent', 'client-consent.service.js'));
  const { ClientCommunicationService } = require(dist('communication', 'communication.service.js'));

  const auditEvents = [];
  const history = [];
  let consentSnapshot = null;

  const auditService = {
    async record(input) {
      auditEvents.push(input);
      if (input.action === 'client.communication.send' || input.action === 'client.communication.retry') {
        history.unshift({
          clientId: input.details.clientId,
          communicationId: input.details.communicationId,
          channel: input.details.channel,
          status: input.details.deliveryStatus,
          sentAt: input.details.sentAt,
          deliveredAt: input.details.deliveredAt,
          summary: input.details.message,
          retryCount: input.details.retryCount,
          providerMessageId: input.details.providerMessageId,
          attemptKind: input.details.attemptKind,
          failureMessage: input.details.failureMessage,
        });
      }
      return { id: `audit-${auditEvents.length}`, ...input };
    },
    async runIdempotent(input) {
      const data = await input.execute();
      return { mode: 'created', data, idempotencyKey: input.key ?? null };
    },
  };

  const consentService = new ClientConsentService(
    {
      async findClientById(clientId) {
        return { id: clientId, name: 'Cliente Boreal', status: 'ativo' };
      },
      async findLatestConsentByClientId(clientId) {
        return consentSnapshot && consentSnapshot.clientId === clientId ? { ...consentSnapshot } : null;
      },
    },
    auditService,
  );

  consentSnapshot = await consentService.update({
    clientId: 44,
    preferences: { email: true, whatsapp: true, portal: true },
    legalBasis: 'consentimento',
    capturedAt: '2026-05-22T12:15:00.000Z',
    capturedBy: 'adv@lexora.local',
  });

  const communicationService = new ClientCommunicationService(
    {
      async findClientById(clientId) {
        return { id: clientId, name: 'Cliente Boreal', status: 'ativo', email: 'boreal@cliente.com', phone: '+5511999999999' };
      },
      async findLatestConsentByClientId(clientId) {
        return consentSnapshot && consentSnapshot.clientId === clientId ? { ...consentSnapshot } : null;
      },
      async findCommunicationById(clientId, communicationId) {
        const item = history.find((entry) => entry.clientId === clientId && entry.communicationId === communicationId);
        return item
          ? {
              ...item,
              subject: 'Checklist pendente',
              message: item.summary,
              templateCode: 'doc-pendente',
              contextEntityType: 'document',
              contextEntityId: 1001,
              providerMessageId: item.providerMessageId ?? null,
              attemptKind: item.attemptKind ?? 'send',
              failureMessage: item.failureMessage ?? null,
            }
          : null;
      },
      async listCommunicationHistory(clientId, channel, limit) {
        return history.filter((item) => item.clientId === clientId && (channel === 'all' || item.channel === channel)).slice(0, limit);
      },
    },
    auditService,
    {
      async dispatch(input) {
        return {
          deliveryStatus: input.attemptKind === 'retry' ? 'sent' : 'queued',
          retryCount: input.retryCount,
          providerMessageId: input.attemptKind === 'retry' ? 'provider-retry' : 'provider-queued',
        };
      },
    },
  );

  const sent = await communicationService.send({
    clientId: 44,
    channel: 'email',
    subject: 'Checklist pendente',
    message: 'Favor enviar os documentos pendentes.',
    templateCode: 'doc-pendente',
    contextEntityType: 'document',
    contextEntityId: 1001,
    idempotencyKey: 'comm-smoke-44',
  });

  const listed = await communicationService.history({
    clientId: 44,
    channel: 'email',
    limit: 10,
  });

  const retried = await communicationService.retry({
    clientId: 44,
    communicationId: sent.communicationId,
    idempotencyKey: 'comm-smoke-44-retry',
  });

  const listedAfterRetry = await communicationService.history({
    clientId: 44,
    channel: 'email',
    limit: 10,
  });

  assert.equal(consentSnapshot.preferences.email, true);
  assert.equal(sent.deliveryStatus, 'queued');
  assert.equal(listed.items.length, 1);
  assert.equal(retried.retryCount, 1);
  assert.equal(listedAfterRetry.items.length, 2);
});
