export interface PlatformAuditEntryInput {
  companyId: number;
  actorUserId?: number | null;
  actorEmail?: string | null;
  action: string;
  reason?: string | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PlatformAuditRepository {
  create(entry: PlatformAuditEntryInput): Promise<void>;
  listByCompany(companyId: number): Promise<unknown[]>;
}

export class PlatformAuditService {
  constructor(private readonly repository: PlatformAuditRepository) {}

  async record(entry: PlatformAuditEntryInput) {
    await this.repository.create(entry);
  }

  async listByCompany(companyId: number) {
    return this.repository.listByCompany(companyId);
  }
}

