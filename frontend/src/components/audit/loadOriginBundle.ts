import {
  api,
  type ApiDerivedActionRecord,
  type ApiOriginReference,
  type ApiPublicationCapture,
  type ApiPublicationPipelineItem,
} from '../../api';

export interface OriginBundleState {
  capture: ApiPublicationCapture | null;
  timeline: ApiPublicationPipelineItem[];
  derivedActions: ApiDerivedActionRecord[];
  error: string;
}

function uniqueTimelineItems(items: ApiPublicationPipelineItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.id}:${item.entityType}:${item.entityId ?? 'na'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueDerivedActions(items: ApiDerivedActionRecord[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.entityType}:${item.entityId}:${item.status}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadOriginBundle(input: {
  originReference?: ApiOriginReference | null;
  correlationId?: string | null;
  captureId?: number | null;
}) {
  const captureId = input.originReference?.captureId ?? input.captureId ?? null;
  const correlationId = input.originReference?.correlationId || input.correlationId || null;

  const next: OriginBundleState = {
    capture: null,
    timeline: [],
    derivedActions: [],
    error: '',
  };

  if (!captureId && !correlationId) return next;

  const results = await Promise.allSettled([
    captureId ? api.getPublicationCaptureEvidence(captureId) : Promise.resolve(null),
    correlationId ? api.getPublicationPipeline(correlationId) : Promise.resolve(null),
    correlationId ? api.getPublicationPipelineActions(correlationId) : Promise.resolve(null),
  ]);

  const [captureEvidenceResult, pipelineResult, actionsResult] = results;

  if (captureEvidenceResult.status === 'fulfilled' && captureEvidenceResult.value?.status === 200 && captureEvidenceResult.value.data) {
    next.capture = captureEvidenceResult.value.data.capture;
    next.timeline = captureEvidenceResult.value.data.timeline;
    next.derivedActions = captureEvidenceResult.value.data.derivedActions;
  }

  if (pipelineResult.status === 'fulfilled' && pipelineResult.value?.status === 200 && pipelineResult.value.data) {
    next.timeline = uniqueTimelineItems([...next.timeline, ...(pipelineResult.value.data.items ?? [])]);
  } else if (pipelineResult.status === 'fulfilled' && pipelineResult.value && pipelineResult.value.status !== 404 && pipelineResult.value.error) {
    next.error = pipelineResult.value.error;
  }

  if (actionsResult.status === 'fulfilled' && actionsResult.value?.status === 200 && Array.isArray(actionsResult.value.data)) {
    next.derivedActions = uniqueDerivedActions([...next.derivedActions, ...actionsResult.value.data]);
  } else if (actionsResult.status === 'fulfilled' && actionsResult.value && actionsResult.value.status !== 404 && actionsResult.value.error && !next.error) {
    next.error = actionsResult.value.error;
  }

  if (!next.error && captureEvidenceResult.status === 'fulfilled' && captureEvidenceResult.value && captureEvidenceResult.value.status !== 200 && captureEvidenceResult.value.status !== 404) {
    next.error = captureEvidenceResult.value.error || 'Nao foi possivel carregar a evidencia de origem.';
  }

  return next;
}
