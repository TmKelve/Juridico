import type { CommunicationDispatchResult, CommunicationDispatcher, CommunicationDeliveryStatus } from './communication.types';

type HttpCommunicationDispatcherConfig = {
  providerName: string;
  baseUrl: string;
  apiKey: string;
  dispatchPath: string;
  timeoutMs: number;
};

function normalizeStatus(value: unknown): CommunicationDeliveryStatus {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'delivered') return 'delivered';
  if (normalized === 'sent') return 'sent';
  if (normalized === 'failed' || normalized === 'error') return 'failed';
  return 'queued';
}

function assertEnv(value: string | undefined, code: string, field: string) {
  if (!value?.trim()) {
    throw Object.assign(new Error(`Configuração ausente: ${field}`), { code, field });
  }

  return value.trim();
}

export class HttpCommunicationDispatcher implements CommunicationDispatcher {
  readonly name: string;

  constructor(private readonly config: HttpCommunicationDispatcherConfig) {
    this.name = config.providerName;
  }

  async dispatch(input: Parameters<CommunicationDispatcher['dispatch']>[0]): Promise<CommunicationDispatchResult> {
    const url = new URL(this.config.dispatchPath, this.config.baseUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          provider: this.name,
          communicationId: input.communicationId,
          channel: input.channel,
          retryCount: input.retryCount,
          attemptKind: input.attemptKind,
          client: {
            id: input.client.id,
            name: input.client.name,
            email: input.client.email ?? null,
            phone: input.client.phone ?? null,
          },
          subject: input.subject,
          message: input.message,
          templateCode: input.templateCode,
          context: {
            entityType: input.contextEntityType,
            entityId: input.contextEntityId,
          },
        }),
        signal: controller.signal,
      });

      const responseText = await response.text();
      const payload = responseText ? JSON.parse(responseText) as Record<string, unknown> : {};
      if (!response.ok) {
        throw Object.assign(new Error('Falha ao despachar comunicação no provider externo'), {
          code: 'COMMUNICATION_PROVIDER_ERROR',
          provider: this.name,
          status: response.status,
          body: responseText.slice(0, 500),
        });
      }

      return {
        deliveryStatus: normalizeStatus(payload.deliveryStatus ?? payload.status),
        retryCount: typeof payload.retryCount === 'number' ? payload.retryCount : input.retryCount,
        providerMessageId: typeof payload.providerMessageId === 'string'
          ? payload.providerMessageId
          : typeof payload.messageId === 'string'
            ? payload.messageId
            : null,
        deliveredAt: typeof payload.deliveredAt === 'string' ? payload.deliveredAt : null,
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw Object.assign(new Error('Resposta inválida do provider de comunicação'), {
          code: 'COMMUNICATION_PROVIDER_INVALID_RESPONSE',
          provider: this.name,
        });
      }

      if ((error as { name?: string } | null)?.name === 'AbortError') {
        throw Object.assign(new Error('Timeout no provider de comunicação'), {
          code: 'COMMUNICATION_PROVIDER_TIMEOUT',
          provider: this.name,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createCommunicationDispatcherFromEnv(env: NodeJS.ProcessEnv = process.env): CommunicationDispatcher {
  const provider = (env.CLIENT_COMMUNICATION_PROVIDER ?? 'memory').trim().toLowerCase();
  if (!provider || provider === 'memory' || provider === 'mock') {
    const { InMemoryCommunicationDispatcher } = require('./communication.service');
    return new InMemoryCommunicationDispatcher();
  }

  return new HttpCommunicationDispatcher({
    providerName: provider,
    baseUrl: assertEnv(env.CLIENT_COMMUNICATION_BASE_URL, 'COMMUNICATION_PROVIDER_CONFIG_INVALID', 'CLIENT_COMMUNICATION_BASE_URL'),
    apiKey: assertEnv(env.CLIENT_COMMUNICATION_API_KEY, 'COMMUNICATION_PROVIDER_CONFIG_INVALID', 'CLIENT_COMMUNICATION_API_KEY'),
    dispatchPath: (env.CLIENT_COMMUNICATION_DISPATCH_PATH ?? '/communications').trim() || '/communications',
    timeoutMs: Number(env.CLIENT_COMMUNICATION_TIMEOUT_MS ?? 8000) || 8000,
  });
}
