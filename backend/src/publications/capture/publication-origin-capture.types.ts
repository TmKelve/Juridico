import type {
  PublicationConsolidationStatus,
  PublicationOriginSourceTypeLike,
  PublicationOriginStage,
  PublicationPipelineStatus,
} from '../correlation';

export interface PublicationCaptureSnapshot {
  id?: number | null;
  correlationId?: string | null;
  sourceType: PublicationOriginSourceTypeLike;
  sourceReference: string;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  capturedAt?: string | Date | null;
  occurredAt: string | Date;
  evidenceText?: string | null;
  normalizedText?: string | null;
  tribunal?: string | null;
  processNumber?: string | null;
  cpfCnpj?: string | null;
  oabNumber?: string | null;
  personName?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PublicationNormalizedEventSnapshot {
  id?: number | null;
  captureId: number;
  publicationId?: number | null;
  correlationId?: string | null;
  sourceType?: string | null;
  sourceReference?: string | null;
  originStage?: string | null;
  pipelineStatus?: string | null;
  title: string;
  summary: string;
  fullText: string;
  riskLevel?: string | null;
  requiresAction?: boolean | null;
  eventAt: string | Date;
}

export interface PublicationConsolidationSnapshot {
  correlationId: string;
  captureId: number;
  eventId?: number | null;
  publicationId?: number | null;
  publicationLabel?: string | null;
  lastUpdatedAt?: string | Date | null;
  status?: string | null;
}

export interface PublicationCaptureRecordContract {
  id: number | null;
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originStage: PublicationOriginStage;
  pipelineStatus: PublicationPipelineStatus;
  capturedAt: string;
  occurredAt: string;
  evidenceText: string;
  normalizedText: string;
  tribunal: string | null;
  processNumber: string | null;
  cpfCnpj: string | null;
  oabNumber: string | null;
  personName: string | null;
  consolidationStatus: PublicationConsolidationStatus;
  metadata: Record<string, unknown>;
}

export interface PublicationNormalizedRecordContract {
  id: number | null;
  captureId: number;
  publicationId: number | null;
  correlationId: string;
  sourceType: string;
  sourceReference: string;
  originStage: 'normalizado' | 'consolidado';
  pipelineStatus: string;
  title: string;
  summary: string;
  fullText: string;
  riskLevel: 'normal' | 'critico' | 'alto' | 'medio' | 'baixo';
  requiresAction: boolean;
  eventAt: string;
}

export interface PublicationConsolidationStatusContract {
  correlationId: string;
  captureId: number;
  eventId: number | null;
  publicationId: number | null;
  status: PublicationConsolidationStatus;
  publicationLabel: string | null;
  lastUpdatedAt: string;
}
