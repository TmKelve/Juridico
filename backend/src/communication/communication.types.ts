import type { ClientConsentSnapshot } from '../clients/consent';

export type CommunicationChannel = 'email' | 'whatsapp' | 'portal';
export type CommunicationHistoryChannel = CommunicationChannel | 'all';
export type CommunicationContextEntityType = 'document' | 'triage' | 'process' | 'attendance' | 'crm';
export type CommunicationDeliveryStatus = 'queued' | 'sent' | 'delivered' | 'failed';

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
  }>;
};

export type CommunicationDispatchResult = {
  deliveryStatus: CommunicationDeliveryStatus;
  retryCount: number;
  providerMessageId?: string | null;
  deliveredAt?: string | null;
};

export type CommunicationDispatcher = {
  dispatch(input: {
    client: CommunicationClientRecord;
    channel: CommunicationChannel;
    subject: string | null;
    message: string;
    templateCode: string | null;
    contextEntityType: CommunicationContextEntityType;
    contextEntityId: number | string | null;
  }): Promise<CommunicationDispatchResult>;
};

export type CommunicationRepository = {
  findClientById(clientId: number): Promise<CommunicationClientRecord | null>;
  findLatestConsentByClientId(clientId: number): Promise<ClientConsentSnapshot | null>;
  listCommunicationHistory(clientId: number, channel: CommunicationHistoryChannel, limit: number): Promise<ClientCommunicationHistoryItem[]>;
};
