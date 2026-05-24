export type ClientPortalFetchInput = {
  clientId: number;
  includeDocuments: boolean;
  includePublications: boolean;
  includeDeadlines: boolean;
};

export type PortalClientRecord = {
  id: number;
  name: string;
  status: string;
};

export type ClientPortalDocumentCard = {
  documentId: number;
  processId: number;
  title: string;
  status: string;
  category: string;
  uploadedAt: string;
};

export type ClientPortalPublicationCard = {
  publicationId: number;
  processId: number;
  title: string;
  status: string;
  publishedAt: string;
  requiresAction: boolean;
};

export type ClientPortalDeadlineCard = {
  deadlineId: number;
  processId: number;
  title: string;
  status: string;
  dueDate: string;
  priority: string;
};

export type ClientPortalTimelineItem = {
  entityType: 'document' | 'publication' | 'deadline';
  entityId: number;
  processId: number;
  title: string;
  status: string;
  occurredAt: string;
  highlight: string;
};

export type ClientPortalRepository = {
  findClientById(clientId: number): Promise<PortalClientRecord | null>;
  countActiveProcesses(clientId: number): Promise<number>;
  countPendingDocuments(clientId: number): Promise<number>;
  countRecentPublications(clientId: number): Promise<number>;
  listDocumentCards(clientId: number): Promise<ClientPortalDocumentCard[]>;
  listPublicationCards(clientId: number): Promise<ClientPortalPublicationCard[]>;
  listDeadlineCards(clientId: number): Promise<ClientPortalDeadlineCard[]>;
};
