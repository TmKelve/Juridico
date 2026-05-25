const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const repositoryPath = path.resolve(__dirname, '..', '..', 'dist', 'communication', 'prisma-communication.repository.js');

function createAuditRows(items) {
  return items.map((item, index) => ({
    id: `audit-${index + 1}`,
    scope: 'communication',
    action: item.action ?? 'client.communication.send',
    entityId: item.clientId,
    summary: item.summary,
    occurredAt: item.occurredAt,
    details: {
      clientId: item.clientId,
      communicationId: item.communicationId,
      channel: item.channel,
      subject: item.subject ?? null,
      message: item.message ?? item.summary,
      templateCode: item.templateCode ?? null,
      contextEntityType: item.contextEntityType ?? 'crm',
      contextEntityId: item.contextEntityId ?? null,
      deliveryStatus: item.status,
      retryCount: item.retryCount ?? 0,
      providerMessageId: item.providerMessageId ?? null,
      sentAt: item.sentAt ?? item.occurredAt,
      deliveredAt: item.deliveredAt ?? null,
      attemptKind: item.attemptKind ?? 'send',
      failureMessage: item.failureMessage ?? null,
    },
  }));
}

test('createPrismaCommunicationRepository overfetches history when channel filter excludes the newest items', async () => {
  const { createPrismaCommunicationRepository } = require(repositoryPath);

  const rows = createAuditRows([
    { clientId: 8, communicationId: 'comm-1', channel: 'portal', status: 'delivered', summary: 'Portal 1', occurredAt: '2026-05-25T10:05:00.000Z' },
    { clientId: 8, communicationId: 'comm-2', channel: 'portal', status: 'delivered', summary: 'Portal 2', occurredAt: '2026-05-25T10:04:00.000Z' },
    { clientId: 8, communicationId: 'comm-3', channel: 'portal', status: 'delivered', summary: 'Portal 3', occurredAt: '2026-05-25T10:03:00.000Z' },
    { clientId: 8, communicationId: 'comm-4', channel: 'portal', status: 'delivered', summary: 'Portal 4', occurredAt: '2026-05-25T10:02:00.000Z' },
    { clientId: 8, communicationId: 'comm-5', channel: 'email', status: 'sent', summary: 'Email 1', occurredAt: '2026-05-25T10:01:00.000Z' },
  ]);

  const repository = createPrismaCommunicationRepository({
    client: {
      async findUnique() {
        return null;
      },
    },
    crmAuditEvent: {
      async findMany({ take, skip = 0 }) {
        return [...rows]
          .sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)))
          .slice(skip, skip + take);
      },
    },
  });

  const history = await repository.listCommunicationHistory(8, 'email', 1);
  assert.equal(history.length, 1);
  assert.equal(history[0].communicationId, 'comm-5');
});

test('createPrismaCommunicationRepository finds retryable communication snapshots across send and retry events', async () => {
  const { createPrismaCommunicationRepository } = require(repositoryPath);

  const rows = createAuditRows([
    {
      clientId: 8,
      communicationId: 'comm-base',
      channel: 'email',
      status: 'failed',
      summary: 'Falha inicial',
      occurredAt: '2026-05-25T10:00:00.000Z',
      subject: 'Checklist',
      templateCode: 'checklist-pendente',
      contextEntityType: 'document',
      contextEntityId: 11,
      failureMessage: 'timeout',
    },
    {
      clientId: 8,
      communicationId: 'comm-base',
      action: 'client.communication.retry',
      channel: 'email',
      status: 'sent',
      summary: 'Retry enviado',
      occurredAt: '2026-05-25T10:10:00.000Z',
      subject: 'Checklist',
      templateCode: 'checklist-pendente',
      contextEntityType: 'document',
      contextEntityId: 11,
      retryCount: 1,
      attemptKind: 'retry',
      providerMessageId: 'provider-2',
    },
  ]);

  const repository = createPrismaCommunicationRepository({
    client: {
      async findUnique() {
        return null;
      },
    },
    crmAuditEvent: {
      async findMany({ take, skip = 0 }) {
        return [...rows]
          .sort((left, right) => String(right.occurredAt).localeCompare(String(left.occurredAt)))
          .slice(skip, skip + take);
      },
    },
  });

  const communication = await repository.findCommunicationById(8, 'comm-base');
  assert.ok(communication);
  assert.equal(communication.retryCount, 1);
  assert.equal(communication.attemptKind, 'retry');
  assert.equal(communication.providerMessageId, 'provider-2');
});
