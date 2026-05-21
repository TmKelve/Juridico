import type {
  CrmActor,
  CrmClientRecord,
  CrmOpportunityRecord,
  CrmProcessRecord,
} from '../opportunities/crm-opportunity.types';

export type OpportunityConversionCommand = {
  opportunityId: number;
  confirmConversion: boolean;
  clientId?: number | null;
  clientName: string;
  processTitle: string;
  processPhase: string;
  processStatus: string;
  processNumber: string | null;
  summary?: string | null;
  actor: CrmActor;
};

export type ClientMutation = {
  name?: string;
  type?: string;
  cpfCnpj?: string | null;
  status?: string;
  legalArea?: string | null;
  responsible?: string | null;
  notes?: string | null;
};

export type OpportunityConversionTransaction = {
  createProcess(data: {
    title: string;
    processNumber: string | null;
    client: string;
    clientId: number;
    phase: string;
    status: string;
    ownerId: number;
  }): Promise<CrmProcessRecord>;
  updateOpportunityAfterConversion(data: {
    opportunityId: number;
    clientId: number;
    convertedProcessId: number;
    personName: string;
    status: string;
    summary: string;
    contactEvent: {
      kind: string;
      summary: string;
      createdBy: string;
      createdAt: Date;
    };
  }): Promise<CrmOpportunityRecord>;
};

export type OpportunityConversionRepository = {
  findOpportunityById(id: number): Promise<CrmOpportunityRecord | null>;
  findProcessByNumber(processNumber: string): Promise<CrmProcessRecord | null>;
  findProcessById(id: number): Promise<CrmProcessRecord | null>;
  findClientById(id: number): Promise<CrmClientRecord | null>;
  findClientByCpfCnpj(cpfCnpj: string): Promise<CrmClientRecord | null>;
  findClientByName(name: string): Promise<CrmClientRecord | null>;
  createClient(data: ClientMutation & { name: string; status: string; type: string }): Promise<CrmClientRecord>;
  updateClient(id: number, data: ClientMutation): Promise<CrmClientRecord>;
  runInTransaction<T>(callback: (tx: OpportunityConversionTransaction) => Promise<T>): Promise<T>;
};

export type OpportunityConversionResult =
  | {
      outcome: 'converted';
      opportunity: CrmOpportunityRecord;
      process: CrmProcessRecord;
      client: CrmClientRecord;
      idempotent: false;
    }
  | {
      outcome: 'already_converted';
      opportunity: CrmOpportunityRecord;
      process: CrmProcessRecord | null;
      client: CrmClientRecord | null;
      idempotent: true;
    };
