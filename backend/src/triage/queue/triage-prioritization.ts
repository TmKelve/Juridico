import { type TriageQueueItemSnapshot } from '../core/triage-operational-model';
import {
  TRIAGE_ITEM_PRIORITIZE,
  computeDynamicPriorityScore,
  resolvePriorityLabel,
  triageItemPrioritize,
} from './triage-item-prioritize';

export function prioritizeTriageItem(params: {
  item: TriageQueueItemSnapshot;
  now: Date;
}) {
  return triageItemPrioritize(params);
}

export { TRIAGE_ITEM_PRIORITIZE, computeDynamicPriorityScore, resolvePriorityLabel, triageItemPrioritize };
