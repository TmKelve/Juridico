import {
  applyAutomationDedupe,
  planAutomationCommand,
  type AutomationCommand,
  type AutomationPlanningInput,
  type AutomationPlanningItem,
} from '../publications/automation/automation-planner';

export type TriageDecisionItem = AutomationPlanningItem & {
  crmLeadId?: number | null;
  crmOpportunityId?: number | null;
  assignedQueue?: string | null;
  discardReason?: string | null;
  discardNote?: string | null;
  postponeUntil?: Date | null;
};

export type TriageDecisionInput = AutomationPlanningInput & {
  decisionReason?: string | null;
  decisionNote?: string | null;
  postponeUntil?: string | null;
  assignedQueue?: string | null;
};

export type PlannedTriageDecision = {
  decision: {
    decisionType: string;
    decisionReason: string | null;
    decisionNote: string | null;
    decidedBy: string;
    decidedAt: string;
  };
  itemUpdate: {
    status: string;
    queueType: string;
    handledBy: string;
    handledAt: Date;
    discardReason: string | null;
    discardNote: string | null;
    postponeUntil: Date | null;
    assignedQueue: string | null;
    crmLeadId: number | null;
    crmOpportunityId: number | null;
  };
  automation: AutomationCommand;
};

function normalizeText(value?: string | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function resolveNextStatus(decisionType: string) {
  if (decisionType === 'confirmado' || decisionType === 'descartado') return decisionType;
  if (decisionType === 'revisao_manual') return 'em_revisao_manual';
  if (decisionType === 'adiado') return 'adiado';
  return 'pendente';
}

function resolveNextQueueType(currentQueueType: string, decisionType: string) {
  if (decisionType === 'confirmado' || decisionType === 'descartado') return 'tratados';
  return currentQueueType;
}

export function planTriageDecision(params: {
  triageItem: TriageDecisionItem;
  decision: TriageDecisionInput;
  actor: string;
  now: Date;
  existingDedupeKeys?: ReadonlySet<string>;
}): PlannedTriageDecision {
  const { triageItem, decision, actor, now } = params;
  const existingDedupeKeys = params.existingDedupeKeys ?? new Set<string>();

  const plannedAutomation = applyAutomationDedupe(
    planAutomationCommand({
      triageItem,
      input: decision,
      actor,
      now,
    }),
    existingDedupeKeys,
  );

  return {
    decision: {
      decisionType: decision.decisionType,
      decisionReason: normalizeText(decision.decisionReason),
      decisionNote: normalizeText(decision.decisionNote),
      decidedBy: actor,
      decidedAt: now.toISOString(),
    },
    itemUpdate: {
      status: resolveNextStatus(decision.decisionType),
      queueType: resolveNextQueueType(triageItem.queueType, decision.decisionType),
      handledBy: actor,
      handledAt: now,
      discardReason:
        decision.decisionType === 'descartado'
          ? normalizeText(decision.decisionReason) ?? triageItem.discardReason ?? null
          : triageItem.discardReason ?? null,
      discardNote:
        decision.decisionType === 'descartado'
          ? normalizeText(decision.decisionNote) ?? triageItem.discardNote ?? null
          : triageItem.discardNote ?? null,
      postponeUntil:
        decision.decisionType === 'adiado' && normalizeText(decision.postponeUntil)
          ? new Date(decision.postponeUntil as string)
          : triageItem.postponeUntil ?? null,
      assignedQueue: normalizeText(decision.assignedQueue) ?? triageItem.assignedQueue ?? null,
      crmLeadId: triageItem.crmLeadId ?? null,
      crmOpportunityId: triageItem.crmOpportunityId ?? null,
    },
    automation: plannedAutomation,
  };
}

export function planBatchTriageDecisions(params: {
  items: TriageDecisionItem[];
  decision: TriageDecisionInput;
  actor: string;
  now: Date;
  existingDedupeKeys?: ReadonlySet<string>;
}) {
  const knownKeys = new Set(params.existingDedupeKeys ?? []);

  return params.items.map((item) => {
    const planned = planTriageDecision({
      triageItem: item,
      decision: params.decision,
      actor: params.actor,
      now: params.now,
      existingDedupeKeys: knownKeys,
    });

    if (planned.automation.dedupeKey) {
      knownKeys.add(planned.automation.dedupeKey);
    }

    return planned;
  });
}
