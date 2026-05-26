import type { PublicationCaptureRecordContract, PublicationNormalizedRecordContract } from '../capture';
import type { PublicationConsolidationStatus } from '../correlation';

export type PublicationTimelineEntityType =
  | 'capture'
  | 'event'
  | 'publication'
  | 'triage'
  | 'crm_lead'
  | 'crm_opportunity'
  | 'deadline'
  | 'task';

export interface PublicationTimelineItemContract {
  id: string;
  entityType: PublicationTimelineEntityType;
  entityId: number | null;
  stage: string;
  title: string;
  summary: string;
  status: string;
  occurredAt: string;
  sourceType?: string | null;
  sourceReference?: string | null;
  link?: string | null;
}

export interface PublicationPipelineTimelineContract {
  correlationId: string;
  items: PublicationTimelineItemContract[];
}

export interface DerivedActionRecordContract {
  entityType: 'triage' | 'crm_lead' | 'crm_opportunity' | 'deadline' | 'task';
  entityId: number;
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originStage: string;
  status: string;
  title: string;
  summary: string | null;
  url: string | null;
  createdAt: string;
}

export interface CrmOriginReferenceContract {
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originKind: 'capture' | 'publication';
  originLabel: string;
  originStage: string;
  consolidationStatus: PublicationConsolidationStatus;
  captureId: number | null;
  eventId: number | null;
  publicationId: number | null;
  evidenceUrl: string | null;
  publicationUrl: string | null;
  timelineUrl: string | null;
}

export interface TriageOriginReferenceContract {
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originKind: 'capture' | 'publication';
  originStage: string;
  pipelineStatus: string;
  captureId: number;
  eventId: number | null;
  publicationId: number | null;
}

export interface CaptureEvidenceFetchContract {
  capture: PublicationCaptureRecordContract;
  timeline: PublicationPipelineTimelineContract;
  derivedActions: DerivedActionRecordContract[];
}

export interface PublicationConsolidatedSnapshot {
  id: number;
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  consolidationStatus?: string | null;
  status?: string | null;
  summary: string;
  publishedAt: string | Date;
}

export interface PublicationTimelineAssemblyInput {
  capture: PublicationCaptureRecordContract;
  event?: PublicationNormalizedRecordContract | null;
  publication?: PublicationConsolidatedSnapshot | null;
  derivedActions?: DerivedActionRecordContract[] | null;
}
