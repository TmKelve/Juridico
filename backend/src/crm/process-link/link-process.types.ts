import type {
  CrmActor,
  CrmOpportunityRecord,
  CrmProcessRecord,
} from '../opportunities/crm-opportunity.types';

export type LinkProcessCommand = {
  opportunityId: number;
  processId: number;
  confirmLink: boolean;
  summary?: string | null;
  actor: CrmActor;
};

export type LinkProcessOpportunityUpdate = {
  opportunityId: number;
  processId: number;
  clientId: number | null;
  personName: string;
  status: string;
  summary: string;
  contactEvent: {
    kind: string;
    summary: string;
    createdBy: string;
    createdAt: Date;
  };
};

export type LinkProcessResult =
  | {
      outcome: 'linked';
      opportunity: CrmOpportunityRecord;
      process: CrmProcessRecord;
      idempotent: false;
    }
  | {
      outcome: 'already_linked';
      opportunity: CrmOpportunityRecord;
      process: CrmProcessRecord;
      idempotent: true;
    };

export type LinkProcessRepository = {
  findOpportunityById(id: number): Promise<CrmOpportunityRecord | null>;
  findProcessById(id: number): Promise<CrmProcessRecord | null>;
  linkOpportunityToProcess(update: LinkProcessOpportunityUpdate): Promise<CrmOpportunityRecord>;
};
