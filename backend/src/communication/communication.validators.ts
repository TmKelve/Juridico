import { CrmContractError } from '../crm/opportunities/crm-opportunity.types';
import { normalizePositiveInt, requireText } from '../crm/opportunities/crm-opportunity.utils';
import type {
  ClientCommunicationHistoryQuery,
  ClientCommunicationSendInput,
  CommunicationChannel,
  CommunicationContextEntityType,
  CommunicationHistoryChannel,
} from './communication.types';

const sendChannels = new Set<CommunicationChannel>(['email', 'whatsapp', 'portal']);
const historyChannels = new Set<CommunicationHistoryChannel>(['email', 'whatsapp', 'portal', 'all']);
const contextTypes = new Set<CommunicationContextEntityType>(['document', 'triage', 'process', 'attendance', 'crm']);

export function validateClientCommunicationSendInput(input: Record<string, unknown>): ClientCommunicationSendInput {
  const channel = requireText('channel', input.channel, 'Canal') as CommunicationChannel;
  if (!sendChannels.has(channel)) {
    throw new CrmContractError('COMMUNICATION_INVALID_CHANNEL', 400, 'Canal nao suportado.', { channel });
  }

  const contextEntityType = requireText('contextEntityType', input.contextEntityType, 'Contexto') as CommunicationContextEntityType;
  if (!contextTypes.has(contextEntityType)) {
    throw new CrmContractError('COMMUNICATION_DISPATCH_FAILED', 400, 'Contexto de comunicação inválido.', { contextEntityType });
  }

  const contextEntityId = input.contextEntityId === undefined || input.contextEntityId === null
    ? null
    : typeof input.contextEntityId === 'number' || typeof input.contextEntityId === 'string'
      ? input.contextEntityId
      : null;

  return {
    clientId: normalizePositiveInt('clientId', input.clientId, 'Cliente'),
    channel,
    subject: input.subject === undefined || input.subject === null ? null : String(input.subject).trim() || null,
    message: requireText('message', input.message, 'Mensagem'),
    templateCode: input.templateCode === undefined || input.templateCode === null ? null : String(input.templateCode).trim() || null,
    contextEntityType,
    contextEntityId,
    idempotencyKey: requireText('idempotencyKey', input.idempotencyKey, 'Idempotency key'),
  };
}

export function validateClientCommunicationHistoryQuery(input: Record<string, unknown>): ClientCommunicationHistoryQuery {
  const channel = requireText('channel', input.channel, 'Canal') as CommunicationHistoryChannel;
  if (!historyChannels.has(channel)) {
    throw new CrmContractError('COMMUNICATION_INVALID_CHANNEL', 400, 'Canal nao suportado.', { channel });
  }

  const rawLimit = typeof input.limit === 'number' ? input.limit : Number(input.limit ?? 20);
  if (!Number.isInteger(rawLimit) || rawLimit <= 0 || rawLimit > 100) {
    throw new CrmContractError('COMMUNICATION_DISPATCH_FAILED', 400, 'Limite de histórico inválido.', { limit: input.limit });
  }

  return {
    clientId: normalizePositiveInt('clientId', input.clientId, 'Cliente'),
    channel,
    limit: rawLimit,
  };
}
