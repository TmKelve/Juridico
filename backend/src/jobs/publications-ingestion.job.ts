import {
  type PreparedPublicationCapture,
  type PublicationCaptureRecord,
  type PublicationIngestionPayload,
  type PublicationSourceType,
  preparePublicationCapture,
} from '../publications/ingestion/publication-ingestion';

export type PublicationJobMetrics = {
  itemsCaptured: number;
  itemsCreated: number;
  itemsUpdated: number;
  duplicates: number;
  failures: number;
};

export type PublicationJobResult = PublicationJobMetrics & {
  sourceType: PublicationSourceType;
  triggeredBy: string;
  scheduledFor: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'failed';
  captures: PreparedPublicationCapture[];
  errors: Array<{ sourceReference: string; error: string }>;
};

export type PublicationJobDependencies = {
  collect: () => Promise<PublicationIngestionPayload[]>;
  findExistingCapture: (fingerprint: string) => Promise<PublicationCaptureRecord | null>;
};

export async function runPublicationIngestionJob(input: {
  sourceType: PublicationSourceType;
  triggeredBy: string;
  scheduledFor?: Date;
  dependencies: PublicationJobDependencies;
}) {
  const scheduledFor = input.scheduledFor ?? new Date();
  const startedAt = new Date();
  const metrics: PublicationJobMetrics = {
    itemsCaptured: 0,
    itemsCreated: 0,
    itemsUpdated: 0,
    duplicates: 0,
    failures: 0,
  };
  const captures: PreparedPublicationCapture[] = [];
  const errors: Array<{ sourceReference: string; error: string }> = [];

  try {
    const collected = await input.dependencies.collect();
    metrics.itemsCaptured = collected.length;

    for (const payload of collected) {
      try {
        const probeFingerprint = preparePublicationCapture({
          sourceType: input.sourceType,
          triggeredBy: input.triggeredBy,
          payload,
        }).fingerprint;
        const existingCapture = await input.dependencies.findExistingCapture(probeFingerprint);
        const prepared = preparePublicationCapture({
          sourceType: input.sourceType,
          triggeredBy: input.triggeredBy,
          payload,
          existingCapture,
        });

        captures.push(prepared);
        if (prepared.operation === 'create') {
          metrics.itemsCreated += 1;
        } else {
          metrics.itemsUpdated += 1;
          metrics.duplicates += 1;
        }
      } catch (error) {
        metrics.failures += 1;
        errors.push({
          sourceReference: payload.sourceReference,
          error: error instanceof Error ? error.message : 'PUB_PIPELINE_FAILURE',
        });
      }
    }

    return {
      sourceType: input.sourceType,
      triggeredBy: input.triggeredBy,
      scheduledFor: scheduledFor.toISOString(),
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: errors.length > 0 ? 'failed' : 'success',
      captures,
      errors,
      ...metrics,
    } satisfies PublicationJobResult;
  } catch (error) {
    return {
      sourceType: input.sourceType,
      triggeredBy: input.triggeredBy,
      scheduledFor: scheduledFor.toISOString(),
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: 'failed',
      captures,
      errors: [{
        sourceReference: 'collect',
        error: error instanceof Error ? error.message : 'PUB_PIPELINE_FAILURE',
      }],
      ...metrics,
      failures: metrics.failures + 1,
    } satisfies PublicationJobResult;
  }
}
