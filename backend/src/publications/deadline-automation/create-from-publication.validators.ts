import { normalizeOptionalString, requireIsoDate, requireIsoDateTime, requireNonEmptyString, requirePositiveInteger } from '../../deadlines/deadline-validators';
import type { CreateDeadlineFromPublicationRequest } from './create-from-publication.types';

export function validateCreateFromPublicationRequest(input: CreateDeadlineFromPublicationRequest) {
  const idempotencyKey = requireNonEmptyString('idempotencyKey', input.idempotencyKey);
  const actor = requireNonEmptyString('actor', input.actor);
  const publication = input.publication;

  requirePositiveInteger('publication.id', publication.id);
  requirePositiveInteger('publication.processId', publication.processId);
  requireNonEmptyString('publication.processTitle', publication.processTitle);
  requireIsoDateTime('publication.publishedAt', publication.publishedAt);
  requireNonEmptyString('publication.tribunal', publication.tribunal);
  requireNonEmptyString('publication.summary', publication.summary);

  const payload = input.request ?? {};

  return {
    idempotencyKey,
    actor,
    publication: {
      ...publication,
      processPhase: normalizeOptionalString(publication.processPhase),
      clientName: normalizeOptionalString(publication.clientName),
      impact: normalizeOptionalString(publication.impact),
      publishedAt: requireIsoDateTime('publication.publishedAt', publication.publishedAt),
    },
    request: {
      dueDate: payload.dueDate ? requireIsoDate('request.dueDate', payload.dueDate) : null,
      title: normalizeOptionalString(payload.title),
      notes: normalizeOptionalString(payload.notes),
      responsible: normalizeOptionalString(payload.responsible),
      priority: normalizeOptionalString(payload.priority),
      createAgendaEvent: payload.createAgendaEvent !== false,
    },
  };
}
