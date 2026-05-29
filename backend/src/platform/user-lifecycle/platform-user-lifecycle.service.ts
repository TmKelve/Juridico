import { evaluateCompanyStatusAccess } from '../../platform-access/company-status-access-policy';

export class PlatformUserLifecycleService {
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

  async deactivate(input: { companyId: number; membershipId: number; actor: any }) {
    await this.validateWritableCompany(input.companyId);
    const membership = await this.prisma.companyMembership.update({
      where: { id: input.membershipId },
      data: { active: false },
    });
    await this.audit(input.companyId, 'deactivate', membership, input.actor);
    return membership;
  }

  async remove(input: { companyId: number; membershipId: number; actor: any }) {
    await this.validateWritableCompany(input.companyId);
    const membership = await this.prisma.companyMembership.delete({ where: { id: input.membershipId } });
    await this.audit(input.companyId, 'remove', membership, input.actor);
    return { removed: true, membershipId: input.membershipId };
  }

  async resetAccess(input: { companyId: number; membershipId: number; actor: any }) {
    await this.validateWritableCompany(input.companyId);
    const membership = await this.prisma.companyMembership.update({
      where: { id: input.membershipId },
      data: { active: true },
    });
    await this.audit(input.companyId, 'resetAccess', membership, input.actor);
    return membership;
  }

  private async audit(companyId: number, action: string, membership: any, actor: any) {
    await this.prisma.billingEvent.create({
      data: {
        companyId,
        eventType: 'platform.membership',
        eventStatus: 'success',
        summary: `Membership ${action} #${membership.id}`,
        metadataJson: {
          action,
          membershipId: membership.id,
          userId: membership.userId,
          actorUserId: actor?.sub ?? null,
          actorEmail: actor?.email ?? null,
        },
      },
    });
  }
}
