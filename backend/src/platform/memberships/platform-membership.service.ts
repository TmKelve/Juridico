import { evaluateCompanyStatusAccess } from '../../platform-access/company-status-access-policy';
import { resolveRole } from '../../roles/roles';

const DEFAULT_MEMBERSHIP_LIMIT = 3;

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function parseLimitFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const meta = metadata as Record<string, unknown>;
  const direct = meta.maxMembers ?? meta.membershipLimit ?? meta.maxCollaborators ?? meta.collaboratorsLimit;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct >= 1) return Math.floor(direct);

  const limits = meta.limits;
  if (limits && typeof limits === 'object') {
    const nested = (limits as Record<string, unknown>).memberships ?? (limits as Record<string, unknown>).collaborators;
    if (typeof nested === 'number' && Number.isFinite(nested) && nested >= 1) return Math.floor(nested);
  }

  return null;
}

export class PlatformMembershipService {
  constructor(private readonly prisma: any) {}

  async validateWritableCompany(companyId: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      const error: any = new Error('Empresa não encontrada');
      error.statusCode = 404;
      error.code = 'COMPANY_NOT_FOUND';
      throw error;
    }
    const decision = evaluateCompanyStatusAccess({ status: company.status, operation: 'write' });
    if (!decision.allowed) {
      const error: any = new Error(`Empresa sem permissão para escrita: ${decision.reason}`);
      error.statusCode = 409;
      error.code = 'COMPANY_STATUS_BLOCKED';
      throw error;
    }
    return company;
  }

  async resolveMembershipLimit(companyId: number): Promise<number> {
    const subscription = await this.prisma.subscription.findFirst({
      where: { companyId, status: { in: ['active', 'grace_period', 'past_due', 'read_only'] } },
      include: { plan: true },
      orderBy: { updatedAt: 'desc' },
    });

    const metadataLimit = parseLimitFromMetadata(subscription?.plan?.metadata);
    return metadataLimit ?? DEFAULT_MEMBERSHIP_LIMIT;
  }

  async enforceMembershipLimit(companyId: number) {
    const [limit, activeCount] = await Promise.all([
      this.resolveMembershipLimit(companyId),
      this.prisma.companyMembership.count({ where: { companyId, active: true } }),
    ]);

    if (activeCount >= limit) {
      const error: any = new Error('Limite de colaboradores do plano atingido');
      error.statusCode = 409;
      error.code = 'PLAN_MEMBERSHIP_LIMIT_REACHED';
      error.details = { limit, activeCount };
      throw error;
    }

    return { limit, activeCount };
  }

  async list(companyId: number) {
    await this.validateWritableCompany(companyId);
    const items = await this.prisma.companyMembership.findMany({
      where: { companyId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return items.map((item: any) => ({
      id: item.id,
      companyId: item.companyId,
      userId: item.userId,
      email: item.user?.email ?? null,
      role: item.role,
      active: item.active,
      createdAt: toIso(item.createdAt),
      updatedAt: toIso(item.updatedAt),
    }));
  }

  async assignRole(input: { companyId: number; membershipId: number; role: string; actor: any }) {
    await this.validateWritableCompany(input.companyId);
    const resolved = resolveRole(input.role);
    if (!resolved.role) {
      const error: any = new Error('Role inválida');
      error.statusCode = 422;
      error.code = 'ROLE_INVALID';
      throw error;
    }

    const updated = await this.prisma.companyMembership.update({
      where: { id: input.membershipId },
      data: { role: resolved.role },
      include: { user: true },
    });

    await this.prisma.billingEvent.create({
      data: {
        companyId: input.companyId,
        eventType: 'platform.membership',
        eventStatus: 'success',
        summary: `Role atualizada para membership #${input.membershipId}`,
        metadataJson: {
          action: 'assignRole',
          membershipId: input.membershipId,
          userId: updated.userId,
          role: resolved.role,
          actorUserId: input.actor?.sub ?? null,
          actorEmail: input.actor?.email ?? null,
        },
      },
    });

    return updated;
  }
}

export function assertPlatformOperator(actor: any, writeRequired = false) {
  const isPlatform = actor?.userType === 'platform';
  if (!isPlatform) {
    const error: any = new Error('Acesso permitido apenas para perfil de plataforma');
    error.statusCode = 403;
    error.code = 'PLATFORM_PROFILE_REQUIRED';
    throw error;
  }

  if (writeRequired && actor?.role !== 'platform_admin') {
    const error: any = new Error('Apenas platform_admin pode executar mutações');
    error.statusCode = 403;
    error.code = 'PLATFORM_ADMIN_REQUIRED';
    throw error;
  }
}
