import { evaluateCompanyStatusAccess } from '../../platform-access/company-status-access-policy';

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export class PlatformInvitationService {
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
  }

  async invite(input: { companyId: number; email: string; role: string; actor: any }) {
    await this.validateWritableCompany(input.companyId);

    const event = await this.prisma.billingEvent.create({
      data: {
        companyId: input.companyId,
        eventType: 'platform.invitation',
        eventStatus: 'success',
        summary: `Convite enviado para ${input.email}`,
        metadataJson: {
          action: 'invite',
          email: input.email,
          role: input.role,
          state: 'pending',
          actorUserId: input.actor?.sub ?? null,
          actorEmail: input.actor?.email ?? null,
        },
      },
    });

    return {
      invitationId: event.id,
      companyId: input.companyId,
      email: input.email,
      role: input.role,
      state: 'pending',
      createdAt: toIso(event.createdAt),
    };
  }

  async accept(input: { companyId: number; invitationId: number; userId: number; actor: any }) {
    await this.validateWritableCompany(input.companyId);

    const invitationEvent = await this.prisma.billingEvent.findUnique({ where: { id: input.invitationId } });
    if (!invitationEvent || invitationEvent.companyId !== input.companyId || invitationEvent.eventType !== 'platform.invitation') {
      const error: any = new Error('Convite não encontrado');
      error.statusCode = 404;
      error.code = 'INVITATION_NOT_FOUND';
      throw error;
    }

    const metadata = (invitationEvent.metadataJson ?? {}) as Record<string, any>;
    const membership = await this.prisma.companyMembership.upsert({
      where: { companyId_userId: { companyId: input.companyId, userId: input.userId } },
      update: { active: true, role: metadata.role ?? 'assistant' },
      create: { companyId: input.companyId, userId: input.userId, active: true, role: metadata.role ?? 'assistant' },
    });

    await this.prisma.billingEvent.create({
      data: {
        companyId: input.companyId,
        eventType: 'platform.invitation',
        eventStatus: 'success',
        summary: `Convite aceito para user #${input.userId}`,
        metadataJson: {
          action: 'accept',
          invitationId: input.invitationId,
          userId: input.userId,
          membershipId: membership.id,
          actorUserId: input.actor?.sub ?? null,
          actorEmail: input.actor?.email ?? null,
        },
      },
    });

    return {
      invitationId: input.invitationId,
      companyId: input.companyId,
      membershipId: membership.id,
      userId: input.userId,
      acceptedAt: new Date().toISOString(),
    };
  }

  async history(companyId: number, email?: string) {
    const whereClause: any = {
      companyId,
      eventType: 'platform.invitation',
    };
    if (email) {
      whereClause.summary = { contains: email };
    }

    const events = await this.prisma.billingEvent.findMany({ where: whereClause, orderBy: { createdAt: 'desc' } });
    return events.map((event: any) => ({
      id: event.id,
      companyId: event.companyId,
      eventStatus: event.eventStatus,
      summary: event.summary,
      metadata: event.metadataJson ?? null,
      occurredAt: toIso(event.occurredAt),
      createdAt: toIso(event.createdAt),
    }));
  }
}
