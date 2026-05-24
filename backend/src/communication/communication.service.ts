import { randomUUID } from 'crypto';
import type { CrmAuditService } from '../crm/audit';
import { CrmContractError } from '../crm/opportunities/crm-opportunity.types';
import type {
  ClientCommunicationHistoryResult,
  ClientCommunicationSendResult,
  CommunicationDispatcher,
  CommunicationRepository,
} from './communication.types';
import { validateClientCommunicationHistoryQuery, validateClientCommunicationSendInput } from './communication.validators';

export class ClientCommunicationService {
  constructor(
    private readonly repository: CommunicationRepository,
    private readonly auditService: Pick<CrmAuditService, 'record' | 'runIdempotent'>,
    private readonly dispatcher: CommunicationDispatcher,
  ) {}

  async send(input: Record<string, unknown>): Promise<ClientCommunicationSendResult> {
    const normalized = validateClientCommunicationSendInput(input);
    const client = await this.repository.findClientById(normalized.clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId: normalized.clientId });
    }

    const consent = await this.repository.findLatestConsentByClientId(normalized.clientId);
    if (!consent || consent.preferences[normalized.channel] !== true) {
      throw new CrmContractError('COMMUNICATION_CONSENT_REQUIRED', 409, 'Cliente nao consentiu com o canal.', {
        clientId: normalized.clientId,
        channel: normalized.channel,
      });
    }

    const response = await this.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'client.communication.send',
      entityType: 'crm_idempotency',
      entityId: normalized.clientId,
      action: 'send_client_communication',
      payload: normalized,
      onConflictMessage: 'COMMUNICATION_DISPATCH_FAILED',
      execute: async () => {
        const communicationId = `comm_${randomUUID().replace(/-/g, '')}`;
        const dispatchResult = await this.dispatcher.dispatch({
          client,
          channel: normalized.channel,
          subject: normalized.subject,
          message: normalized.message,
          templateCode: normalized.templateCode,
          contextEntityType: normalized.contextEntityType,
          contextEntityId: normalized.contextEntityId,
        });

        const sentAt = new Date().toISOString();
        const deliveredAt = dispatchResult.deliveryStatus === 'delivered'
          ? dispatchResult.deliveredAt ?? sentAt
          : null;

        await this.auditService.record({
          scope: 'communication',
          entityType: 'crm_idempotency',
          entityId: normalized.clientId,
          action: 'client.communication.send',
          status: dispatchResult.deliveryStatus === 'failed' ? 'error' : 'success',
          summary: `${normalized.channel} ${dispatchResult.deliveryStatus} para o cliente #${normalized.clientId}`,
          details: {
            clientId: normalized.clientId,
            communicationId,
            channel: normalized.channel,
            subject: normalized.subject,
            message: normalized.message,
            templateCode: normalized.templateCode,
            contextEntityType: normalized.contextEntityType,
            contextEntityId: normalized.contextEntityId,
            deliveryStatus: dispatchResult.deliveryStatus,
            retryCount: dispatchResult.retryCount,
            providerMessageId: dispatchResult.providerMessageId ?? null,
            sentAt,
            deliveredAt,
          },
          actor: {
            source: 'api',
            role: 'communication',
          },
          occurredAt: sentAt,
          idempotencyKey: normalized.idempotencyKey,
        });

        return {
          communicationId,
          deliveryStatus: dispatchResult.deliveryStatus,
          retryCount: dispatchResult.retryCount,
          idempotent: false,
        };
      },
    });

    return {
      ...response.data,
      idempotent: response.mode === 'replayed' ? true : response.data.idempotent,
    };
  }

  async history(input: Record<string, unknown>): Promise<ClientCommunicationHistoryResult> {
    const normalized = validateClientCommunicationHistoryQuery(input);
    const client = await this.repository.findClientById(normalized.clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId: normalized.clientId });
    }

    const items = await this.repository.listCommunicationHistory(normalized.clientId, normalized.channel, normalized.limit);
    return {
      clientId: normalized.clientId,
      items: items.map((item) => ({
        communicationId: item.communicationId,
        channel: item.channel,
        status: item.status,
        sentAt: item.sentAt,
        deliveredAt: item.deliveredAt,
        summary: item.summary,
      })),
    };
  }
}

export class InMemoryCommunicationDispatcher implements CommunicationDispatcher {
  async dispatch() {
    return {
      deliveryStatus: 'queued',
      retryCount: 0,
      providerMessageId: null,
    } as const;
  }
}
