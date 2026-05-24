import {
  planPostTriageAutomation,
  type PostTriageAutomationPlan,
} from '../automation/triage-automation-planner';
import {
  buildTriageExplanation,
  type ExplainableTriageItem,
  type TriageExplanation,
} from '../explainability/triage-explanation-builder';
import {
  createDecisionEngineAdapter,
  type DecisionEngineAdapter,
} from './decision-engine-adapter';
import type { TriageDecisionInput, TriageDecisionItem } from '../decision-engine';

export type AssistedDecisionInput = TriageDecisionInput & {
  triageItemId: number;
  idempotencyKey: string;
};

export type AssistedDecisionProjection = {
  triageItemId: number;
  status: string;
  automationPlanned: boolean;
  automationCommandIds: string[];
  itemUpdate: {
    status: string;
    queueType: string;
    handledBy: string;
    handledAt: string;
    discardReason: string | null;
    discardNote: string | null;
    postponeUntil: string | null;
    assignedQueue: string | null;
    crmLeadId: number | null;
    crmOpportunityId: number | null;
  };
};

export type AssistedTriageDecision = {
  command: AssistedDecisionInput & { actor: string };
  projection: AssistedDecisionProjection;
  explanation: TriageExplanation;
  automation: PostTriageAutomationPlan;
};

function normalizeIdempotencyKey(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('TRIAGE_DECISION_INVALID: idempotencyKey obrigatoria.');
  }
  return normalized;
}

function assertDecision(decision: AssistedDecisionInput) {
  const supported = new Set(['confirmado', 'descartado', 'adiado', 'revisao_manual', 'escalado']);
  if (!supported.has(decision.decisionType)) {
    throw new Error('TRIAGE_DECISION_INVALID: decisionType nao suportado.');
  }
  if (decision.decisionType === 'adiado' && !(decision.postponeUntil && String(decision.postponeUntil).trim())) {
    throw new Error('TRIAGE_DECISION_INVALID: postponeUntil obrigatorio para decisoes adiadas.');
  }
  if (decision.decisionType === 'escalado' && !(decision.assignedQueue && String(decision.assignedQueue).trim())) {
    throw new Error('TRIAGE_DECISION_INVALID: escalationQueue/assignedQueue obrigatoria para decisoes escaladas.');
  }
}

function toExplainableItem(triageItem: TriageDecisionItem): ExplainableTriageItem {
  return triageItem as ExplainableTriageItem;
}

export function assistTriageDecision(params: {
  triageItem: TriageDecisionItem;
  decision: AssistedDecisionInput;
  actor: string;
  now: Date;
  existingDedupeKeys?: ReadonlySet<string>;
  decisionEngine?: DecisionEngineAdapter;
}) : AssistedTriageDecision {
  const engine = params.decisionEngine ?? createDecisionEngineAdapter();
  const idempotencyKey = normalizeIdempotencyKey(params.decision.idempotencyKey);
  assertDecision(params.decision);

  const planned = engine.planDecision({
    triageItem: params.triageItem,
    decision: params.decision,
    actor: params.actor,
    now: params.now,
    existingDedupeKeys: params.existingDedupeKeys,
  });

  const automation = planPostTriageAutomation({
    triageItem: params.triageItem,
    decision: params.decision,
    actor: params.actor,
    now: params.now,
    existingDedupeKeys: params.existingDedupeKeys,
    decisionEngine: engine,
  });

  return {
    command: {
      ...params.decision,
      actor: params.actor,
      idempotencyKey,
    },
    projection: {
      triageItemId: params.decision.triageItemId,
      status: planned.itemUpdate.status,
      automationPlanned: automation.automationPlanned,
      automationCommandIds: automation.commands.map((command) => command.commandId),
      itemUpdate: {
        status: planned.itemUpdate.status,
        queueType: planned.itemUpdate.queueType,
        handledBy: planned.itemUpdate.handledBy,
        handledAt: planned.itemUpdate.handledAt.toISOString(),
        discardReason: planned.itemUpdate.discardReason,
        discardNote: planned.itemUpdate.discardNote,
        postponeUntil: planned.itemUpdate.postponeUntil ? planned.itemUpdate.postponeUntil.toISOString() : null,
        assignedQueue: planned.itemUpdate.assignedQueue,
        crmLeadId: planned.itemUpdate.crmLeadId,
        crmOpportunityId: planned.itemUpdate.crmOpportunityId,
      },
    },
    explanation: buildTriageExplanation({
      triageItem: toExplainableItem(params.triageItem),
      decisionType: params.decision.decisionType,
      decisionReason: params.decision.decisionReason ?? null,
    }),
    automation,
  };
}

