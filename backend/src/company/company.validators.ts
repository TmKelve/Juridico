import {
  COMPANY_STATUSES,
  type CompanyStatus,
  type CreateCompanyInput,
  type CreateCompanyMembershipInput,
  type UpdateCompanyMembershipRoleInput,
  type UpdateCompanyStatusInput,
} from './company.types';

const companyStatusSet = new Set<CompanyStatus>(COMPANY_STATUSES);

export class CompanyContractError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CompanyContractError';
  }
}

export function validateCreateCompanyInput(input: Record<string, unknown>): CreateCompanyInput {
  const status = normalizeOptionalCompanyStatus(input.status);
  return {
    name: requireText('name', input.name, 'Nome da empresa'),
    slug: requireText('slug', input.slug, 'Slug da empresa'),
    status: status ?? 'active',
  };
}

export function validateUpdateCompanyStatusInput(input: Record<string, unknown>): UpdateCompanyStatusInput {
  return {
    companyId: normalizePositiveInt('companyId', input.companyId, 'Empresa'),
    status: normalizeRequiredCompanyStatus('status', input.status, 'Status da empresa'),
  };
}

export function validateCreateCompanyMembershipInput(input: Record<string, unknown>): CreateCompanyMembershipInput {
  return {
    companyId: normalizePositiveInt('companyId', input.companyId, 'Empresa'),
    userId: normalizePositiveInt('userId', input.userId, 'Usuário'),
    role: requireText('role', input.role, 'Papel de associação'),
    active: typeof input.active === 'boolean' ? input.active : true,
  };
}

export function validateUpdateCompanyMembershipRoleInput(input: Record<string, unknown>): UpdateCompanyMembershipRoleInput {
  return {
    companyId: normalizePositiveInt('companyId', input.companyId, 'Empresa'),
    userId: normalizePositiveInt('userId', input.userId, 'Usuário'),
    role: requireText('role', input.role, 'Papel de associação'),
  };
}

function normalizeRequiredCompanyStatus(field: string, value: unknown, label: string): CompanyStatus {
  const normalized = requireText(field, value, label) as CompanyStatus;
  if (!companyStatusSet.has(normalized)) {
    throw new CompanyContractError('COMPANY_INVALID_STATUS', 400, `${label} inválido.`, { field, value });
  }
  return normalized;
}

function normalizeOptionalCompanyStatus(value: unknown): CompanyStatus | undefined {
  if (value === undefined || value === null) return undefined;
  return normalizeRequiredCompanyStatus('status', value, 'Status da empresa');
}

function requireText(field: string, value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new CompanyContractError('COMPANY_REQUIRED_FIELD', 400, `${label} é obrigatório.`, { field });
  }
  return value.trim();
}

function normalizePositiveInt(field: string, value: unknown, label: string): number {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new CompanyContractError('COMPANY_INVALID_NUMBER', 400, `${label} deve ser inteiro positivo.`, { field, value });
  }
  return value as number;
}
