import type { AutomationCommand } from '../../publications/automation/automation-planner';
import {
  createDecisionEngineAdapter,
  type DecisionEngineAdapter,
} from '../decision/decision-engine-adapter';
import type { TriageDecisionInput, TriageDecisionItem } from '../decision-engine';

export type TriggerAutomationCommand = {
  commandId: string;
  type: AutomationCommand['commandType'];
  dedupeKey: string;
  payload: AutomationCommand;
};

export type PostTriageAutomationPlan = {
  automationPlanned: boolean;
  commands: TriggerAutomationCommand[];
  skippedReason: AutomationCommand['skipReason'] | null;
};

function buildCommandId(command: AutomationCommand) {
  return [command.commandType, command.triageItemId ?? 'na', command.dedupeKey || 'no-dedupe'].join(':');
}

export function toTriggerAutomationCommand(command: AutomationCommand): TriggerAutomationCommand | null {
  if (command.commandType === 'none' || !command.dedupeKey) return null;
  return {
    commandId: buildCommandId(command),
    type: command.commandType,
    dedupeKey: command.dedupeKey,
    payload: command,
  };
}

export function planPostTriageAutomation(params: {
  triageItem: TriageDecisionItem;
  decision: TriageDecisionInput;
  actor: string;
  now: Date;
  existingDedupeKeys?: ReadonlySet<string>;
  decisionEngine?: DecisionEngineAdapter;
}): PostTriageAutomationPlan {
  const engine = params.decisionEngine ?? createDecisionEngineAdapter();
  const planned = engine.planDecision({
    triageItem: params.triageItem,
    decision: params.decision,
    actor: params.actor,
    now: params.now,
    existingDedupeKeys: params.existingDedupeKeys,
  });
  const command = toTriggerAutomationCommand(planned.automation);

  return {
    automationPlanned: Boolean(command),
    commands: command ? [command] : [],
    skippedReason: command ? null : planned.automation.skipReason ?? null,
  };
}

