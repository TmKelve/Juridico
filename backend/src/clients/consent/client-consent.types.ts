export type ContactPreferences = {
  email: boolean;
  whatsapp: boolean;
  portal: boolean;
};

export type ClientConsentLegalBasis = 'consentimento' | 'execucao_contrato' | 'legitimo_interesse';

export type ClientConsentActor = {
  capturedBy: string;
  capturedAt: string;
};

export type ClientConsentUpdateInput = {
  clientId: number;
  preferences: ContactPreferences;
  legalBasis: ClientConsentLegalBasis;
  capturedAt: string;
  capturedBy: string;
};

export type ClientConsentSnapshot = {
  clientId: number;
  consentVersion: number;
  preferences: ContactPreferences;
  legalBasis: ClientConsentLegalBasis;
  capturedAt: string;
  capturedBy: string;
  updatedAt: string;
};

export type ClientConsentClientRecord = {
  id: number;
  name: string;
  status: string;
};

export type ClientConsentRepository = {
  findClientById(clientId: number): Promise<ClientConsentClientRecord | null>;
  findLatestConsentByClientId(clientId: number): Promise<ClientConsentSnapshot | null>;
};
