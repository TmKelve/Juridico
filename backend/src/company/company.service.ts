import type {
  CompanyRecord,
  CompanyMembershipRecord,
  CreateCompanyInput,
  CreateCompanyMembershipInput,
  UpdateCompanyMembershipRoleInput,
  UpdateCompanyStatusInput,
} from './company.types';

export interface CompanyDomainRepository {
  findCompanyBySlug(slug: string): Promise<CompanyRecord | null>;
  findCompanyById(companyId: number): Promise<CompanyRecord | null>;
  createCompany(input: CreateCompanyInput): Promise<CompanyRecord>;
  updateCompanyStatus(input: UpdateCompanyStatusInput): Promise<CompanyRecord>;
  findCompanyMembership(companyId: number, userId: number): Promise<CompanyMembershipRecord | null>;
  createCompanyMembership(input: CreateCompanyMembershipInput): Promise<CompanyMembershipRecord>;
  updateCompanyMembershipRole(input: UpdateCompanyMembershipRoleInput): Promise<CompanyMembershipRecord>;
}

export class CompanyDomainError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CompanyDomainError';
  }
}

export class CompanyDomainService {
  constructor(private readonly repository: CompanyDomainRepository) {}

  async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    const existing = await this.repository.findCompanyBySlug(input.slug);
    if (existing) {
      throw new CompanyDomainError('COMPANY_ALREADY_EXISTS', 409, 'Empresa já cadastrada com esse slug.', { slug: input.slug });
    }

    return this.repository.createCompany(input);
  }

  async updateCompanyStatus(input: UpdateCompanyStatusInput): Promise<CompanyRecord> {
    const company = await this.repository.findCompanyById(input.companyId);
    if (!company) {
      throw new CompanyDomainError('COMPANY_NOT_FOUND', 404, 'Empresa não encontrada.', { companyId: input.companyId });
    }

    return this.repository.updateCompanyStatus(input);
  }

  async createCompanyMembership(input: CreateCompanyMembershipInput): Promise<CompanyMembershipRecord> {
    const company = await this.repository.findCompanyById(input.companyId);
    if (!company) {
      throw new CompanyDomainError('COMPANY_NOT_FOUND', 404, 'Empresa não encontrada.', { companyId: input.companyId });
    }

    const existing = await this.repository.findCompanyMembership(input.companyId, input.userId);
    if (existing) {
      throw new CompanyDomainError('COMPANY_MEMBERSHIP_EXISTS', 409, 'Usuário já é membro da empresa.', {
        companyId: input.companyId,
        userId: input.userId,
      });
    }

    return this.repository.createCompanyMembership(input);
  }

  async updateCompanyMembershipRole(input: UpdateCompanyMembershipRoleInput): Promise<CompanyMembershipRecord> {
    const existing = await this.repository.findCompanyMembership(input.companyId, input.userId);
    if (!existing) {
      throw new CompanyDomainError('COMPANY_MEMBERSHIP_NOT_FOUND', 404, 'Associação não encontrada.', {
        companyId: input.companyId,
        userId: input.userId,
      });
    }

    return this.repository.updateCompanyMembershipRole(input);
  }
}

export class InMemoryCompanyDomainRepository implements CompanyDomainRepository {
  private companyIdSequence = 1;
  private membershipIdSequence = 1;
  private readonly companies = new Map<number, CompanyRecord>();
  private readonly memberships = new Map<string, CompanyMembershipRecord>();

  constructor(seed?: {
    companies?: CompanyRecord[];
    memberships?: CompanyMembershipRecord[];
  }) {
    for (const company of seed?.companies ?? []) {
      this.companies.set(company.id, { ...company });
      this.companyIdSequence = Math.max(this.companyIdSequence, company.id + 1);
    }

    for (const membership of seed?.memberships ?? []) {
      this.memberships.set(this.membershipKey(membership.companyId, membership.userId), { ...membership });
      this.membershipIdSequence = Math.max(this.membershipIdSequence, membership.id + 1);
    }
  }

  async findCompanyBySlug(slug: string): Promise<CompanyRecord | null> {
    const found = [...this.companies.values()].find((company) => company.slug === slug);
    return found ? { ...found } : null;
  }

  async findCompanyById(companyId: number): Promise<CompanyRecord | null> {
    const found = this.companies.get(companyId);
    return found ? { ...found } : null;
  }

  async createCompany(input: CreateCompanyInput): Promise<CompanyRecord> {
    const now = new Date().toISOString();
    const created: CompanyRecord = {
      id: this.companyIdSequence++,
      name: input.name,
      slug: input.slug,
      status: input.status ?? 'active',
      createdAt: now,
      updatedAt: now,
    };
    this.companies.set(created.id, created);
    return { ...created };
  }

  async updateCompanyStatus(input: UpdateCompanyStatusInput): Promise<CompanyRecord> {
    const existing = this.companies.get(input.companyId);
    if (!existing) {
      throw new CompanyDomainError('COMPANY_NOT_FOUND', 404, 'Empresa não encontrada.', { companyId: input.companyId });
    }

    const updated: CompanyRecord = {
      ...existing,
      status: input.status,
      updatedAt: new Date().toISOString(),
    };
    this.companies.set(updated.id, updated);
    return { ...updated };
  }

  async findCompanyMembership(companyId: number, userId: number): Promise<CompanyMembershipRecord | null> {
    const found = this.memberships.get(this.membershipKey(companyId, userId));
    return found ? { ...found } : null;
  }

  async createCompanyMembership(input: CreateCompanyMembershipInput): Promise<CompanyMembershipRecord> {
    const now = new Date().toISOString();
    const created: CompanyMembershipRecord = {
      id: this.membershipIdSequence++,
      companyId: input.companyId,
      userId: input.userId,
      role: input.role,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.memberships.set(this.membershipKey(created.companyId, created.userId), created);
    return { ...created };
  }

  async updateCompanyMembershipRole(input: UpdateCompanyMembershipRoleInput): Promise<CompanyMembershipRecord> {
    const key = this.membershipKey(input.companyId, input.userId);
    const existing = this.memberships.get(key);
    if (!existing) {
      throw new CompanyDomainError('COMPANY_MEMBERSHIP_NOT_FOUND', 404, 'Associação não encontrada.', {
        companyId: input.companyId,
        userId: input.userId,
      });
    }

    const updated: CompanyMembershipRecord = {
      ...existing,
      role: input.role,
      updatedAt: new Date().toISOString(),
    };
    this.memberships.set(key, updated);
    return { ...updated };
  }

  private membershipKey(companyId: number, userId: number) {
    return `${companyId}:${userId}`;
  }
}
