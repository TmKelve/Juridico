const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'dist',
  'triage',
  'automation',
  'post-triage-automation-runner.js',
);

test('executePostTriageAutomation skips duplicates and reports executor failures', async () => {
  const { executePostTriageAutomation } = require(modulePath);

  const result = await executePostTriageAutomation({
    triageItemId: 33,
    existingDedupeKeys: new Set(['dup:key']),
    commands: [
      {
        commandId: 'create_task:33:dup:key',
        type: 'create_task',
        dedupeKey: 'dup:key',
        payload: {},
      },
      {
        commandId: 'create_deadline:33:new:key',
        type: 'create_deadline',
        dedupeKey: 'new:key',
        payload: {},
      },
    ],
    executor: {
      async execute(command) {
        if (command.type === 'create_deadline') {
          const error = new Error('deadline service unavailable');
          error.code = 'DEADLINE_DOWN';
          throw error;
        }
        return { entityId: 10 };
      },
    },
  });

  assert.deepEqual(result.executed, []);
  assert.deepEqual(result.skippedDuplicates, ['dup:key']);
  assert.deepEqual(result.failed, [
    {
      commandType: 'create_deadline',
      code: 'DEADLINE_DOWN',
      message: 'deadline service unavailable',
    },
  ]);
});

test('executePostTriageAutomation reports executed commands in contract shape', async () => {
  const { executePostTriageAutomation } = require(modulePath);

  const result = await executePostTriageAutomation({
    triageItemId: 34,
    existingDedupeKeys: new Set(),
    commands: [
      {
        commandId: 'create_task:34:new:key',
        type: 'create_task',
        dedupeKey: 'new:key',
        payload: {},
      },
    ],
    executor: {
      async execute() {
        return { entityId: 'task-501' };
      },
    },
  });

  assert.deepEqual(result.executed, [
    {
      commandType: 'create_task',
      entityId: 'task-501',
    },
  ]);
  assert.deepEqual(result.skippedDuplicates, []);
  assert.deepEqual(result.failed, []);
});
