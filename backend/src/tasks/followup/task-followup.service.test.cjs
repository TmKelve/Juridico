const test = require('node:test');
const assert = require('node:assert/strict');

test('TaskFollowupService schedules and dispatches follow-ups with audit trail', async () => {
  const { InMemoryTaskAuditRepository, TaskAuditService } = require('../../../dist/tasks/core/task-audit.js');
  const { InMemoryTaskRepository } = require('../../../dist/tasks/core/task-repository.js');
  const { TaskWorkflowService } = require('../../../dist/tasks/workflow/task-workflow.service.js');
  const { TaskFollowupService, InMemoryTaskFollowupRepository } = require('../../../dist/tasks/followup/task-followup.service.js');
  const { InMemoryTaskFollowupDispatcher } = require('../../../dist/notifications/tasks/task-followup-dispatcher.js');

  const repository = new InMemoryTaskRepository({
    processIds: [21],
    ownerUserIds: [201],
    links: [{ entityType: 'process', entityId: 21 }],
  });
  const auditService = new TaskAuditService(new InMemoryTaskAuditRepository());
  const workflowService = new TaskWorkflowService({
    repository,
    auditService,
    now: () => new Date('2026-05-25T10:00:00.000Z'),
  });
  const followupRepository = new InMemoryTaskFollowupRepository();
  const dispatcher = new InMemoryTaskFollowupDispatcher();
  const followupService = new TaskFollowupService({
    repository,
    followups: followupRepository,
    dispatcher,
    auditService,
    now: () => new Date('2026-05-25T10:00:00.000Z'),
  });

  const actor = { type: 'user', userId: 201, label: 'user:201' };
  const created = await workflowService.createTask({
    title: 'Cobrar resposta do cliente',
    processId: 21,
    origin: 'interno',
    ownerUserId: 201,
    ownerLabel: 'João',
    priority: 'alta',
    dueDate: '2026-05-24',
    workflowStage: 'aguardando',
    linkedEntities: [{ entityType: 'process', entityId: 21 }],
    idempotencyKey: 'task:create:21',
  }, actor);

  const scheduled = await followupService.schedule({
    taskId: created.task.taskId,
    followupAt: '2026-05-25T09:30:00.000Z',
    reason: 'overdue',
    channel: 'in_app',
    actor: 'user:201',
    dedupeKey: 'followup:21:overdue',
  });

  const executed = await followupService.execute({
    referenceAt: '2026-05-25T10:30:00.000Z',
    batchSize: 10,
    actor: 'scheduler',
    dedupeKey: 'followup:run:1',
  });

  assert.equal(scheduled.task.followupState, 'pending_dispatch');
  assert.equal(executed.processed, 1);
  assert.equal(executed.dispatched, 1);
  assert.equal(executed.skipped, 0);
  assert.equal(dispatcher.sent.length, 1);

  const replay = await followupService.execute({
    referenceAt: '2026-05-25T10:30:00.000Z',
    batchSize: 10,
    actor: 'scheduler',
    dedupeKey: 'followup:run:1',
  });

  assert.equal(replay.dispatched, 1);
  assert.equal(replay.auditEvents.length, executed.auditEvents.length);
});

test('TaskFollowupService rejects divergent dedupe payload and skips terminal task execution', async () => {
  const { InMemoryTaskAuditRepository, TaskAuditService } = require('../../../dist/tasks/core/task-audit.js');
  const { InMemoryTaskRepository } = require('../../../dist/tasks/core/task-repository.js');
  const { TaskWorkflowService } = require('../../../dist/tasks/workflow/task-workflow.service.js');
  const { TaskFollowupService, InMemoryTaskFollowupRepository } = require('../../../dist/tasks/followup/task-followup.service.js');
  const { InMemoryTaskFollowupDispatcher } = require('../../../dist/notifications/tasks/task-followup-dispatcher.js');

  const repository = new InMemoryTaskRepository({
    ownerUserIds: [301],
    links: [],
  });
  const auditService = new TaskAuditService(new InMemoryTaskAuditRepository());
  const workflowService = new TaskWorkflowService({
    repository,
    auditService,
    now: () => new Date('2026-05-25T10:00:00.000Z'),
  });
  const followupService = new TaskFollowupService({
    repository,
    followups: new InMemoryTaskFollowupRepository(),
    dispatcher: new InMemoryTaskFollowupDispatcher(),
    auditService,
    now: () => new Date('2026-05-25T10:00:00.000Z'),
  });

  const actor = { type: 'user', userId: 301, label: 'user:301' };
  const created = await workflowService.createTask({
    title: 'Arquivar comprovante',
    origin: 'interno',
    ownerUserId: 301,
    ownerLabel: 'Maria',
    priority: 'baixa',
    dueDate: '2026-05-26',
    workflowStage: 'captura',
    idempotencyKey: 'task:create:31',
  }, actor);

  await followupService.schedule({
    taskId: created.task.taskId,
    followupAt: '2026-05-25T11:00:00.000Z',
    reason: 'manual',
    channel: 'internal_feed',
    actor: 'user:301',
    dedupeKey: 'followup:31',
  });

  await assert.rejects(
    () => followupService.schedule({
      taskId: created.task.taskId,
      followupAt: '2026-05-25T12:00:00.000Z',
      reason: 'sla_risk',
      channel: 'internal_feed',
      actor: 'user:301',
      dedupeKey: 'followup:31',
    }),
    (error) => error && error.code === 'TASK_FOLLOWUP_DUPLICATE',
  );

  await workflowService.updateStatus({
    taskId: created.task.taskId,
    toStatus: 'em_execucao',
    actorUserId: 301,
    idempotencyKey: 'task:start:31',
  }, actor);

  await workflowService.updateStatus({
    taskId: created.task.taskId,
    toStatus: 'concluida',
    actorUserId: 301,
    idempotencyKey: 'task:done:31',
  }, actor);

  const executed = await followupService.execute({
    referenceAt: '2026-05-25T12:30:00.000Z',
    batchSize: 10,
    actor: 'scheduler',
    dedupeKey: 'followup:run:31',
  });

  assert.equal(executed.processed, 1);
  assert.equal(executed.dispatched, 0);
  assert.equal(executed.skipped, 1);
});
