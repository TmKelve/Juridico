export type ProspectSourceType = 'publicacao' | 'manual' | 'importacao';

export type ClientProspectSignalInput = {
  cpfCnpj: string;
  personName: string | null;
  sourceType: ProspectSourceType;
  sourceReference: string;
  summary: string;
  idempotencyKey: string;
};

export type ClientProspectSignalResult = {
  prospectId: number;
  leadId: number | null;
  matchedClientId: number | null;
  hasActiveProcess: boolean;
  idempotent: boolean;
};

export type ProspectClientRecord = {
  id: number;
  name: string;
  cpfCnpj: string | null;
  status: string;
};

export type ProspectLeadRecord = {
  id: number;
  clientId?: number | null;
  cpf: string | null;
  personName: string;
  source: string;
  status: string;
  summary: string;
};

export type CrmProspectingRepository = {
  findClientByCpfCnpj(cpfCnpj: string): Promise<ProspectClientRecord | null>;
  hasActiveProcessByClientId(clientId: number): Promise<boolean>;
  findLeadByCpfCnpj(cpfCnpj: string): Promise<ProspectLeadRecord | null>;
  createLead(input: {
    clientId: number | null;
    cpf: string;
    personName: string;
    source: string;
    status: string;
    summary: string;
  }): Promise<ProspectLeadRecord>;
  updateLead(leadId: number, input: {
    clientId: number | null;
    cpf: string;
    personName: string;
    source: string;
    status: string;
    summary: string;
  }): Promise<ProspectLeadRecord>;
};
