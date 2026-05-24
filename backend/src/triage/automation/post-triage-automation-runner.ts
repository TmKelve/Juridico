import type { TriggerAutomationCommand } from './triage-automation-planner';

export type TriggerAutomationFailure = {
  commandType: string;
  code: string;
  message: string;
};

export type TriggerAutomationResult = {
  triageItemId: number;
  executed: Array<{ commandType: string; entityId: number | string | null }>;
  skippedDuplicates: string[];
  failed: TriggerAutomationFailure[];
};

export interface PostTriageAutomationExecutor {
  execute(command: TriggerAutomationCommand): Promise<{ entityId: number | string | null }>;
}

function normalizeFailure(error: unknown, commandType: string): TriggerAutomationFailure {
  if (error && typeof error === 'object') {
    const code =
      typeof (error as { code?: unknown }).code === 'string'
        ? ((error as { code: string }).code)
        : 'TRIAGE_AUTOMATION_FAILED';
    const message =
      typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message: string }).message)
        : 'Falha inesperada na automacao.';
    return { commandType, code, message };
  }

  return {
    commandType,
    code: 'TRIAGE_AUTOMATION_FAILED',
    message: 'Falha inesperada na automacao.',
  };
}

export async function executePostTriageAutomation(params: {
  triageItemId: number;
  commands: TriggerAutomationCommand[];
  executor: PostTriageAutomationExecutor;
  existingDedupeKeys?: ReadonlySet<string>;
}): Promise<TriggerAutomationResult> {
  const executed: TriggerAutomationResult['executed'] = [];
  const skippedDuplicates: string[] = [];
  const failed: TriggerAutomationFailure[] = [];
  const knownKeys = new Set(params.existingDedupeKeys ?? []);

  for (const command of params.commands) {
    if (knownKeys.has(command.dedupeKey)) {
      skippedDuplicates.push(command.dedupeKey);
      continue;
    }

    knownKeys.add(command.dedupeKey);

    try {
      const result = await params.executor.execute(command);
      executed.push({
        commandType: command.type,
        entityId: result.entityId,
      });
    } catch (error) {
      failed.push(normalizeFailure(error, command.type));
    }
  }

  return {
    triageItemId: params.triageItemId,
    executed,
    skippedDuplicates,
    failed,
  };
}

