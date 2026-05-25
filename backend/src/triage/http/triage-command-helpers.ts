import { CrmContractError } from '../../crm/audit/crm-audit.validators';
import type { CrmAuditService } from '../../crm/audit/crm-audit.service';
import type { TriageQueueItemSnapshot } from '../core/triage-operational-model';
import {
  buildTriageExplanation,
  type ExplainableTriageItem,
} from '../explainability/triage-explanation-builder';
import {
  executePostTriageAutomation,
  type PostTriageAutomationExecutor,
} from '../automation/post-triage-automation-runner';
import type { TriggerAutomationCommand } from '../automation/triage-automation-planner';
import { rankUnifiedTriageQueue } from '../queue/triage-unified-queue';

export function buildPrioritizeCommandResult(params: {
  triageItemId: number;
  items: TriageQueueItemSnapshot[];
  now: Date;
}) {
  const ranked = rankUnifiedTriageQueue({
    items: params.items,
    now: params.now,
  });
  const selected = ranked.find((item) => item.id === params.triageItemId);

  if (!selected) {
    throw new Error('TRIAGE_NOT_FOUND');
  }

  return {
    triageItemId: selected.id,
    queueRank: selected.queueRank,
    priorityLabel: selected.priorityLabel,
    agingHours: selected.agingHours,
    breached: selected.breached,
  };
}

export function buildExplainCommandResult(params: {
  triageItemId: number;
  triageItem: ExplainableTriageItem;
  decisionType?: string | null;
  decisionReason?: string | null;
}) {
  const decisionType = params.decisionType ?? 'pendente';

  return {
    triageItemId: params.triageItemId,
    explanation: buildTriageExplanation({
      triageItem: params.triageItem,
      decisionType,
      decisionReason: params.decisionReason ?? null,
    }),
  };
}

export async function triggerTriageAutomation(params: {
  triageItemId: number;
  commands: TriggerAutomationCommand[];
  executor: PostTriageAutomationExecutor;
  existingDedupeKeys?: ReadonlySet<string>;
}) {
  return executePostTriageAutomation(params);
}

export async function runTriageDecisionIdempotent<T>(params: {
  auditService: Pick<CrmAuditService, 'runIdempotent'>;
  triageItemId: number;
  idempotencyKey?: string | null;
  payload: unknown;
  execute: () => Promise<T>;
}) {
  try {
    return await params.auditService.runIdempotent({
      key: params.idempotencyKey ?? null,
      scope: 'triage.item.decide',
      entityType: 'crm_idempotency',
      entityId: params.triageItemId,
      action: 'triage.item.decide',
      payload: params.payload,
      responseCode: 200,
      execute: params.execute,
      onConflictMessage: 'Conflito de decisão de triagem para a mesma chave de idempotência.',
    });
  } catch (error) {
    if (error instanceof CrmContractError && error.code === 'IDEMPOTENCY_CONFLICT') {
      throw new CrmContractError(
        'Conflito de decisão de triagem para a mesma chave de idempotência.',
        409,
        'TRIAGE_DECISION_CONFLICT',
        error.details,
      );
    }

    if (
      error
      && typeof error === 'object'
      && (error as { name?: string }).name === 'CrmContractError'
      && (error as { code?: string }).code === 'IDEMPOTENCY_CONFLICT'
    ) {
      const statusCode = typeof (error as { statusCode?: unknown }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 409;
      throw new CrmContractError(
        'Conflito de decisão de triagem para a mesma chave de idempotência.',
        statusCode,
        'TRIAGE_DECISION_CONFLICT',
        typeof (error as { details?: unknown }).details === 'object'
          ? ((error as { details?: Record<string, unknown> }).details ?? undefined)
          : undefined,
      );
    }

    throw error;
  }
}
