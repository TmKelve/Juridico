import type { ClientConsentSnapshot } from '../clients/consent';

export type CommunicationChannel = 'email' | 'whatsapp' | 'portal';
export type CommunicationHistoryChannel = CommunicationChannel | 'all';
export type CommunicationContextEntityType = 'document' | 'triage' | 'process' | 'attendance' | 'crm';
export type CommunicationDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';
export type CommunicationAttemptKind = 'send' | 'retry';

export type CommunicationClientRecord = {
  id: number;
  name: string;
  status: string;
  email?: string | null;
  phone?: string | null;
};

export type ClientCommunicationSendInput = {
  clientId: number;
  channel: CommunicationChannel;
  subject: string | null;
  message: string;
  templateCode: string | null;
  contextEntityType: CommunicationContextEntityType;
  contextEntityId: number | string | null;
  idempotencyKey: string;
};

export type ClientCommunicationSendResult = {
  communicationId: string;
  deliveryStatus: CommunicationDeliveryStatus;
  retryCount: number;
  idempotent: boolean;
};

export type ClientCommunicationRetryInput = {
  clientId: number;
  communicationId: string;
  idempotencyKey: string;
};

export type ClientCommunicationRetryResult = ClientCommunicationSendResult;

export type ClientCommunicationHistoryQuery = {
  clientId: number;
  channel: CommunicationHistoryChannel;
  limit: number;
};

export type ClientCommunicationHistoryItem = {
  clientId: number;
  communicationId: string;
  channel: CommunicationChannel;
  status: CommunicationDeliveryStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  summary: string;
  retryCount: number;
  attemptKind: CommunicationAttemptKind;
  providerMessageId: string | null;
  failureMessage: string | null;
};

export type ClientCommunicationHistoryResult = {
  clientId: number;
  items: Array<{
    communicationId: string;
    channel: CommunicationChannel;
    status: CommunicationDeliveryStatus;
    sentAt: string | null;
    deliveredAt: string | null;
    summary: string;
    retryCount: number;
    attemptKind: CommunicationAttemptKind;
    providerMessageId: string | null;
    failureMessage: string | null;
  }>;
};

export type CommunicationDispatchResult = {
  deliveryStatus: CommunicationDeliveryStatus;
  retryCount: number;
  providerMessageId?: string | null;
  deliveredAt?: string | null;
};

export type CommunicationRecord = {
  clientId: number;
  communicationId: string;
  channel: CommunicationChannel;
  subject: string | null;
  message: string;
  templateCode: string | null;
  contextEntityType: CommunicationContextEntityType;
  contextEntityId: number | string | null;
  deliveryStatus: CommunicationDeliveryStatus;
  retryCount: number;
  providerMessageId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  summary: string;
  attemptKind: CommunicationAttemptKind;
  failureMessage: string | null;
};

export type CommunicationDispatcher = {
  dispatch(input: {
    client: CommunicationClientRecord;
    communicationId: string;
    channel: CommunicationChannel;
    subject: string | null;
    message: string;
    templateCode: string | null;
    contextEntityType: CommunicationContextEntityType;
    contextEntityId: number | string | null;
    retryCount: number;
    attemptKind: CommunicationAttemptKind;
  }): Promise<CommunicationDispatchResult>;
};

export type CommunicationRepository = {
  findClientById(clientId: number): Promise<CommunicationClientRecord | null>;
  findLatestConsentByClientId(clientId: number): Promise<ClientConsentSnapshot | null>;
  findCommunicationById(clientId: number, communicationId: string): Promise<CommunicationRecord | null>;
  listCommunicationHistory(clientId: number, channel: CommunicationHistoryChannel, limit: number): Promise<ClientCommunicationHistoryItem[]>;
};
