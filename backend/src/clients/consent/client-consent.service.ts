import type { CrmAuditService } from '../../crm/audit';
import { CrmContractError } from '../../crm/opportunities/crm-opportunity.types';
import type { ClientConsentRepository, ClientConsentSnapshot, ClientConsentUpdateInput } from './client-consent.types';
import { buildClientConsentIdempotencyKey, validateClientConsentUpdateInput } from './client-consent.validators';

export class ClientConsentService {
  constructor(
    private readonly repository: ClientConsentRepository,
    private readonly auditService: Pick<CrmAuditService, 'record' | 'runIdempotent'>,
  ) {}

  async get(clientId: number): Promise<ClientConsentSnapshot> {
    const client = await this.repository.findClientById(clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId });
    }

    const latestConsent = await this.repository.findLatestConsentByClientId(clientId);
    if (!latestConsent) {
      throw new CrmContractError('CONSENT_NOT_FOUND', 404, 'Consentimento nao encontrado.', { clientId });
    }

    return latestConsent;
  }

  async update(input: Record<string, unknown>): Promise<ClientConsentSnapshot> {
    const normalized = validateClientConsentUpdateInput(input);
    const client = await this.repository.findClientById(normalized.clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId: normalized.clientId });
    }

    const latestConsent = await this.repository.findLatestConsentByClientId(normalized.clientId);
    const idempotencyKey = buildClientConsentIdempotencyKey(normalized);

    const response = await this.auditService.runIdempotent({
      key: idempotencyKey,
      scope: 'client.consent.update',
      entityType: 'crm_idempotency',
      entityId: normalized.clientId,
      action: 'update_client_consent',
      payload: normalized,
      onConflictMessage: 'CONSENT_INVALID',
      execute: async () => {
        const result: ClientConsentSnapshot = {
          clientId: normalized.clientId,
          consentVersion: (latestConsent?.consentVersion ?? 0) + 1,
          preferences: normalized.preferences,
          legalBasis: normalized.legalBasis,
          capturedAt: normalized.capturedAt,
          capturedBy: normalized.capturedBy,
          updatedAt: normalized.capturedAt,
        };

        await this.auditService.record({
          scope: 'clients',
          entityType: 'crm_idempotency',
          entityId: normalized.clientId,
          action: 'client.consent.update',
          status: 'success',
          summary: `Consentimento atualizado para o cliente #${normalized.clientId}`,
          details: {
            clientId: normalized.clientId,
            clientName: client.name,
            consentVersion: result.consentVersion,
            preferences: result.preferences,
            legalBasis: result.legalBasis,
            capturedAt: result.capturedAt,
            capturedBy: result.capturedBy,
            updatedAt: result.updatedAt,
          },
          actor: {
            source: 'api',
            email: normalized.capturedBy,
            role: 'client-consent',
          },
          occurredAt: normalized.capturedAt,
          idempotencyKey,
        });

        return result;
      },
    });

    return response.data;
  }
}
