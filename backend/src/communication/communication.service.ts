import { randomUUID } from 'crypto';
import type { CrmAuditService } from '../crm/audit';
import { CrmContractError } from '../crm/opportunities/crm-opportunity.types';
import type {
  ClientCommunicationHistoryResult,
  ClientCommunicationRetryResult,
  ClientCommunicationSendResult,
  CommunicationAttemptKind,
  CommunicationDispatcher,
  CommunicationDispatchResult,
  CommunicationRepository,
} from './communication.types';
import {
  validateClientCommunicationHistoryQuery,
  validateClientCommunicationRetryInput,
  validateClientCommunicationSendInput,
} from './communication.validators';

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
        return this.dispatchAttempt({
          client,
          clientId: normalized.clientId,
          communicationId,
          channel: normalized.channel,
          subject: normalized.subject,
          message: normalized.message,
          templateCode: normalized.templateCode,
          contextEntityType: normalized.contextEntityType,
          contextEntityId: normalized.contextEntityId,
          retryCount: 0,
          attemptKind: 'send',
          action: 'client.communication.send',
          idempotencyKey: normalized.idempotencyKey,
        });
      },
    });

    return {
      ...response.data,
      idempotent: response.mode === 'replayed' ? true : response.data.idempotent,
    };
  }

  async retry(input: Record<string, unknown>): Promise<ClientCommunicationRetryResult> {
    const normalized = validateClientCommunicationRetryInput(input);
    const client = await this.repository.findClientById(normalized.clientId);
    if (!client) {
      throw new CrmContractError('CLIENT_NOT_FOUND', 404, 'Cliente nao encontrado.', { clientId: normalized.clientId });
    }

    const consent = await this.repository.findLatestConsentByClientId(normalized.clientId);
    const communication = await this.repository.findCommunicationById(normalized.clientId, normalized.communicationId);
    if (!communication) {
      throw new CrmContractError('COMMUNICATION_DISPATCH_FAILED', 404, 'Comunicação não encontrada para retry.', {
        clientId: normalized.clientId,
        communicationId: normalized.communicationId,
      });
    }

    if (!consent || consent.preferences[communication.channel] !== true) {
      throw new CrmContractError('COMMUNICATION_CONSENT_REQUIRED', 409, 'Cliente nao consentiu com o canal.', {
        clientId: normalized.clientId,
        channel: communication.channel,
      });
    }

    const response = await this.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'client.communication.retry',
      entityType: 'crm_idempotency',
      entityId: normalized.clientId,
      action: 'retry_client_communication',
      payload: normalized,
      onConflictMessage: 'COMMUNICATION_DISPATCH_FAILED',
      execute: async () => this.dispatchAttempt({
        client,
        clientId: normalized.clientId,
        communicationId: communication.communicationId,
        channel: communication.channel,
        subject: communication.subject,
        message: communication.message,
        templateCode: communication.templateCode,
        contextEntityType: communication.contextEntityType,
        contextEntityId: communication.contextEntityId,
        retryCount: communication.retryCount + 1,
        attemptKind: 'retry',
        action: 'client.communication.retry',
        idempotencyKey: normalized.idempotencyKey,
      }),
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
        retryCount: item.retryCount,
        attemptKind: item.attemptKind,
        providerMessageId: item.providerMessageId,
        failureMessage: item.failureMessage,
      })),
    };
  }

  private async dispatchAttempt(input: {
    client: Awaited<ReturnType<CommunicationRepository['findClientById']>>;
    clientId: number;
    communicationId: string;
    channel: Parameters<CommunicationDispatcher['dispatch']>[0]['channel'];
    subject: string | null;
    message: string;
    templateCode: string | null;
    contextEntityType: Parameters<CommunicationDispatcher['dispatch']>[0]['contextEntityType'];
    contextEntityId: number | string | null;
    retryCount: number;
    attemptKind: CommunicationAttemptKind;
    action: 'client.communication.send' | 'client.communication.retry';
    idempotencyKey: string;
  }): Promise<ClientCommunicationSendResult> {
    const sentAt = new Date().toISOString();

    try {
      const dispatchResult = await this.dispatcher.dispatch({
        client: input.client!,
        communicationId: input.communicationId,
        channel: input.channel,
        subject: input.subject,
        message: input.message,
        templateCode: input.templateCode,
        contextEntityType: input.contextEntityType,
        contextEntityId: input.contextEntityId,
        retryCount: input.retryCount,
        attemptKind: input.attemptKind,
      });

      await this.recordDispatchAudit({
        input,
        dispatchResult,
        sentAt,
        failureMessage: null,
      });

      return {
        communicationId: input.communicationId,
        deliveryStatus: dispatchResult.deliveryStatus,
        retryCount: dispatchResult.retryCount,
        idempotent: false,
      };
    } catch (error) {
      await this.recordDispatchAudit({
        input,
        dispatchResult: {
          deliveryStatus: 'failed',
          retryCount: input.retryCount,
          providerMessageId: null,
          deliveredAt: null,
        },
        sentAt,
        failureMessage: error instanceof Error ? error.message : 'Falha não identificada no provider de comunicação.',
      });

      throw new CrmContractError('COMMUNICATION_DISPATCH_FAILED', 502, 'Falha no envio ou enfileiramento.', {
        clientId: input.clientId,
        communicationId: input.communicationId,
        channel: input.channel,
        retryCount: input.retryCount,
        cause: error instanceof Error ? error.message : 'Falha desconhecida',
      });
    }
  }

  private async recordDispatchAudit(input: {
    input: {
      clientId: number;
      communicationId: string;
      channel: Parameters<CommunicationDispatcher['dispatch']>[0]['channel'];
      subject: string | null;
      message: string;
      templateCode: string | null;
      contextEntityType: Parameters<CommunicationDispatcher['dispatch']>[0]['contextEntityType'];
      contextEntityId: number | string | null;
      retryCount: number;
      attemptKind: CommunicationAttemptKind;
      action: 'client.communication.send' | 'client.communication.retry';
      idempotencyKey: string;
    };
    dispatchResult: CommunicationDispatchResult;
    sentAt: string;
    failureMessage: string | null;
  }) {
    const deliveredAt = input.dispatchResult.deliveryStatus === 'delivered'
      ? input.dispatchResult.deliveredAt ?? input.sentAt
      : null;

    await this.auditService.record({
      scope: 'communication',
      entityType: 'crm_idempotency',
      entityId: input.input.clientId,
      action: input.input.action,
      status: input.dispatchResult.deliveryStatus === 'failed' ? 'error' : 'success',
      summary: `${input.input.channel} ${input.dispatchResult.deliveryStatus} para o cliente #${input.input.clientId}`,
      details: {
        clientId: input.input.clientId,
        communicationId: input.input.communicationId,
        channel: input.input.channel,
        subject: input.input.subject,
        message: input.input.message,
        templateCode: input.input.templateCode,
        contextEntityType: input.input.contextEntityType,
        contextEntityId: input.input.contextEntityId,
        deliveryStatus: input.dispatchResult.deliveryStatus,
        retryCount: input.dispatchResult.retryCount,
        providerMessageId: input.dispatchResult.providerMessageId ?? null,
        sentAt: input.sentAt,
        deliveredAt,
        attemptKind: input.input.attemptKind,
        failureMessage: input.failureMessage,
      },
      actor: {
        source: 'api',
        role: 'communication',
      },
      occurredAt: input.sentAt,
      idempotencyKey: input.input.idempotencyKey,
    });
  }
}

export class InMemoryCommunicationDispatcher implements CommunicationDispatcher {
  async dispatch(input: Parameters<CommunicationDispatcher['dispatch']>[0]) {
    return {
      deliveryStatus: 'queued',
      retryCount: input.retryCount,
      providerMessageId: null,
    } as const;
  }
}
