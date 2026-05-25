const test = require('node:test');
const assert = require('node:assert/strict');

test('TaskWorkflowService creates task with canonical status, idempotency replay and audit trail', async () => {
  const { InMemoryTaskAuditRepository, TaskAuditService } = require('../../../dist/tasks/core/task-audit.js');
  const { InMemoryTaskRepository } = require('../../../dist/tasks/core/task-repository.js');
  const { TaskWorkflowService } = require('../../../dist/tasks/workflow/task-workflow.service.js');

  const repository = new InMemoryTaskRepository({
    processIds: [11],
    clientIds: [7],
    ownerUserIds: [101],
    links: [{ entityType: 'process', entityId: 11 }],
  });
  const auditService = new TaskAuditService(new InMemoryTaskAuditRepository());
  const service = new TaskWorkflowService({
    repository,
    auditService,
    now: () => new Date('2026-05-25T12:00:00.000Z'),
  });
  const actor = { type: 'user', userId: 101, label: 'user:101' };

  const first = await service.createTask({
    title: '  Retornar cliente  ',
    description: 'Confirmar documentos pendentes',
    processId: 11,
    clientId: 7,
    origin: 'atendimento',
    ownerUserId: 101,
    ownerLabel: 'Ana',
    priority: 'alta',
    dueDate: '2026-05-26',
    workflowStage: 'planejamento',
    linkedEntities: [{ entityType: 'process', entityId: 11 }],
    notes: 'ligar ainda hoje',
    createdByUserId: 101,
    idempotencyKey: 'task:create:11',
  }, actor);

  const replay = await service.createTask({
    title: 'Retornar cliente',
    description: 'Confirmar documentos pendentes',
    processId: 11,
    clientId: 7,
    origin: 'atendimento',
    ownerUserId: 101,
    ownerLabel: 'Ana',
    priority: 'alta',
    dueDate: '2026-05-26',
    workflowStage: 'planejamento',
    linkedEntities: [{ entityType: 'process', entityId: 11 }],
    notes: 'ligar ainda hoje',
    createdByUserId: 101,
    idempotencyKey: 'task:create:11',
  }, actor);

  assert.equal(first.task.status, 'triagem');
  assert.equal(first.task.legacyStatus, 'pendente');
  assert.equal(first.task.linkedEntities.length, 1);
  assert.equal(first.task.history.length, 1);
  assert.equal(first.idempotency, 'created');
  assert.equal(replay.idempotency, 'replayed');
  assert.equal(replay.task.taskId, first.task.taskId);

  const events = await auditService.list({ entityType: 'task', entityId: first.task.taskId });
  assert.equal(events.length, 2);
  assert.equal(events[0].action, 'task_created');
  assert.equal(first.auditEvent.status, 'success');
});

test('TaskWorkflowService updates status via legacy adapter and links entities with audit history', async () => {
  const { InMemoryTaskAuditRepository, TaskAuditService } = require('../../../dist/tasks/core/task-audit.js');
  const { InMemoryTaskRepository } = require('../../../dist/tasks/core/task-repository.js');
  const { TaskWorkflowService } = require('../../../dist/tasks/workflow/task-workflow.service.js');

  const repository = new InMemoryTaskRepository({
    processIds: [12],
    clientIds: [9],
    ownerUserIds: [101],
    links: [
      { entityType: 'process', entityId: 12 },
      { entityType: 'deadline', entityId: 44 },
      { entityType: 'document', entityId: 55 },
    ],
  });
  const auditService = new TaskAuditService(new InMemoryTaskAuditRepository());
  const service = new TaskWorkflowService({
    repository,
    auditService,
    now: () => new Date('2026-05-25T12:00:00.000Z'),
  });
  const actor = { type: 'user', userId: 101, label: 'user:101' };

  const created = await service.createTask({
    title: 'Protocolar petição',
    processId: 12,
    clientId: 9,
    origin: 'processo',
    ownerUserId: 101,
    ownerLabel: 'Ana',
    priority: 'media',
    dueDate: '2026-05-25',
    workflowStage: 'captura',
    linkedEntities: [{ entityType: 'process', entityId: 12 }],
    idempotencyKey: 'task:create:12',
  }, actor);

  const statusUpdated = await service.updateStatus({
    taskId: created.task.taskId,
    fromStatus: 'pendente',
    toStatus: 'em_andamento',
    transitionReason: 'iniciada no kanban',
    actorUserId: 101,
    idempotencyKey: 'task:update:12',
  }, actor);

  const linked = await service.linkEntities({
    taskId: created.task.taskId,
    links: [
      { entityType: 'deadline', entityId: 44 },
      { entityType: 'document', entityId: 55 },
    ],
    actorUserId: 101,
    idempotencyKey: 'task:links:12',
  }, actor);

  assert.equal(statusUpdated.task.status, 'em_execucao');
  assert.equal(statusUpdated.task.legacyStatus, 'em_andamento');
  assert.equal(linked.task.linkedEntities.length, 3);
  assert.equal(linked.task.history.length, 3);

  await assert.rejects(
    () => service.linkEntities({
      taskId: created.task.taskId,
      links: [{ entityType: 'deadline', entityId: 44 }],
      actorUserId: 101,
      idempotencyKey: 'task:links:duplicate',
    }, actor),
    (error) => error && error.code === 'TASK_LINK_DUPLICATE',
  );
});
