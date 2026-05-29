import { PlatformAuditService } from '../platform-audit/platform-audit.service';

export class CompanyStatusAuditService {
  constructor(private readonly auditService: PlatformAuditService) {}

  async recordTransition(input: {
    companyId: number;
    actorUserId?: number | null;
    actorEmail?: string | null;
    action: 'company.setReadOnly' | 'company.suspend' | 'company.reactivate' | 'subscription.transitionStatus';
    fromStatus?: string | null;
    toStatus: string;
    reason: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.auditService.record({
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      action: input.action,
      reason: input.reason,
      previousStatus: input.fromStatus ?? null,
      nextStatus: input.toStatus,
      metadata: input.metadata ?? null,
    });
  }
}

