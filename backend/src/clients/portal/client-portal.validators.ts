import { normalizePositiveInt } from '../../crm/opportunities/crm-opportunity.utils';
import type { ClientPortalFetchInput } from './client-portal.types';

export function validateClientPortalFetchInput(input: Record<string, unknown>): ClientPortalFetchInput {
  return {
    clientId: normalizePositiveInt('clientId', input.clientId, 'Cliente'),
    includeDocuments: Boolean(input.includeDocuments),
    includePublications: Boolean(input.includePublications),
    includeDeadlines: Boolean(input.includeDeadlines),
  };
}
