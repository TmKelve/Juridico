import type {
  PlatformCompanyActionName,
  PlatformCompanyActor,
  PlatformCompanyAuditSink,
  PlatformCompanyDetail,
  PlatformCompanyListItem,
  PlatformCompanySummary,
} from './company-management.types';

export class PlatformCompanyDomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

type CompanyRecord = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type SummaryRecord = {
  subscriptionStatus: string | null;
  planCode: string | null;
  planName: string | null;
  activationDate: Date | string | null;
  responsibleUserId: number | null;
  responsibleEmail: string | null;
  responsibleRole: string | null;
};

export type PlatformCompanyRepository = {
  listCompanies(): Promise<CompanyRecord[]>;
  findCompanyById(companyId: number): Promise<CompanyRecord | null>;
  findSummaryByCompanyId(companyId: number): Promise<SummaryRecord>;
  updateCompanyStatus(companyId: number, status: string): Promise<CompanyRecord>;
};

export class PlatformCompanyManagementService {
  constructor(
    private readonly repository: PlatformCompanyRepository,
    private readonly auditSink: PlatformCompanyAuditSink,
  ) {}

  async list(): Promise<PlatformCompanyListItem[]> {
    const companies = await this.repository.listCompanies();
    const mapped = await Promise.all(companies.map((company) => this.toListItem(company)));
    return mapped;
  }

  async detail(companyId: number): Promise<PlatformCompanyDetail> {
    const company = await this.requireCompany(companyId);
    return this.toListItem(company);
  }

  async summary(companyId: number): Promise<PlatformCompanySummary> {
    const company = await this.requireCompany(companyId);
    return this.toSummary(companyId, company.status);
  }

  async activate(input: { companyId: number; actor: PlatformCompanyActor; reason?: string | null }) {
    return this.applyStatusChange({ ...input, action: 'activate', toStatus: 'active' });
  }

  async block(input: { companyId: number; actor: PlatformCompanyActor; reason: string }) {
    return this.applyStatusChange({ ...input, action: 'block', toStatus: 'suspended' });
  }

  async cancel(input: { companyId: number; actor: PlatformCompanyActor; reason: string }) {
    return this.applyStatusChange({ ...input, action: 'cancel', toStatus: 'cancelled' });
  }

  async reactivate(input: { companyId: number; actor: PlatformCompanyActor; reason: string }) {
    return this.applyStatusChange({ ...input, action: 'reactivate', toStatus: 'active' });
  }

  private async applyStatusChange(input: {
    companyId: number;
    actor: PlatformCompanyActor;
    action: PlatformCompanyActionName;
    toStatus: string;
    reason?: string | null;
  }) {
    const current = await this.requireCompany(input.companyId);
    const updated = await this.repository.updateCompanyStatus(input.companyId, input.toStatus);
    await this.auditSink.record({
      companyId: input.companyId,
      action: `platform.company.${input.action}`,
      actorUserId: input.actor.userId ?? null,
      actorEmail: input.actor.email ?? null,
      reason: input.reason ?? null,
      previousStatus: current.status,
      nextStatus: updated.status,
      metadata: { role: input.actor.role },
    });

    return {
      companyId: updated.id,
      status: updated.status,
      summary: await this.toSummary(updated.id, updated.status),
    };
  }

  private async requireCompany(companyId: number) {
    const company = await this.repository.findCompanyById(companyId);
    if (!company) {
      throw new PlatformCompanyDomainError('PLATFORM_COMPANY_NOT_FOUND', 404, 'Empresa não encontrada.');
    }
    return company;
  }

  private async toListItem(company: CompanyRecord): Promise<PlatformCompanyListItem> {
    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      status: company.status,
      createdAt: this.toIsoRequired(company.createdAt),
      updatedAt: this.toIsoRequired(company.updatedAt),
      summary: await this.toSummary(company.id, company.status),
    };
  }

  private async toSummary(companyId: number, companyStatus?: string): Promise<PlatformCompanySummary> {
    const summary = await this.repository.findSummaryByCompanyId(companyId);
    return {
      plan: summary.planName ?? summary.planCode,
      subscription: summary.subscriptionStatus,
      status: companyStatus ?? summary.subscriptionStatus ?? 'unknown',
      activationDate: this.toIso(summary.activationDate),
      responsible:
        summary.responsibleEmail || summary.responsibleUserId || summary.responsibleRole
          ? {
              userId: summary.responsibleUserId,
              email: summary.responsibleEmail,
              role: summary.responsibleRole,
            }
          : null,
    };
  }

  private toIso(value: Date | string | null) {
    if (!value) return null;
    return value instanceof Date ? value.toISOString() : value;
  }

  private toIsoRequired(value: Date | string) {
    return value instanceof Date ? value.toISOString() : value;
  }
}
