export type CrmActor = {
  sub: number;
  email: string;
  role: string;
};

export type CrmClientRecord = {
  id: number;
  name: string;
  status: string;
  cpfCnpj?: string | null;
  legalArea?: string | null;
  responsible?: string | null;
  type?: string | null;
  notes?: string | null;
};

export type CrmProcessRecord = {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  processNumber?: string | null;
  clientId?: number | null;
  clientRecord?: CrmClientRecord | null;
};

export type CrmContactEventRecord = {
  id: number;
  kind: string;
  summary: string;
  createdBy?: string | null;
  createdAt: Date;
};

export type CrmOpportunityRecord = {
  id: number;
  clientId?: number | null;
  convertedProcessId?: number | null;
  cpf?: string | null;
  personName: string;
  source: string;
  status: string;
  responsible?: string | null;
  summary: string;
  lastContactAt?: Date | null;
  nextContactAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  clientRecord?: CrmClientRecord | null;
  contactEvents?: CrmContactEventRecord[];
};

export type CrmContractErrorDetails = Record<string, unknown> | undefined;

export class CrmContractError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
    readonly details?: CrmContractErrorDetails,
  ) {
    super(message);
    this.name = 'CrmContractError';
  }
}
