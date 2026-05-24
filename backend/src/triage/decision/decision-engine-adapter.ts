import {
  planBatchTriageDecisions,
  planTriageDecision,
  type PlannedTriageDecision,
  type TriageDecisionInput,
  type TriageDecisionItem,
} from '../decision-engine';

export interface DecisionEngineAdapter {
  planDecision(params: {
    triageItem: TriageDecisionItem;
    decision: TriageDecisionInput;
    actor: string;
    now: Date;
    existingDedupeKeys?: ReadonlySet<string>;
  }): PlannedTriageDecision;
  planBatch(params: {
    items: TriageDecisionItem[];
    decision: TriageDecisionInput;
    actor: string;
    now: Date;
    existingDedupeKeys?: ReadonlySet<string>;
  }): PlannedTriageDecision[];
}

export function createDecisionEngineAdapter(): DecisionEngineAdapter {
  return {
    planDecision(params) {
      return planTriageDecision(params);
    },
    planBatch(params) {
      return planBatchTriageDecisions(params);
    },
  };
}

