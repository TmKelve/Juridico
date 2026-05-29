import type { PlatformAuditEventRecord, PlatformAuditWriter } from '../audit';

export interface PlatformAdminLoginAttemptInput {
  companyId: number;
  actor: string;
  adminUserId?: number | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
}

export interface PlatformAdminLoginAttemptResult {
  mode: 'granted' | 'denied';
  auditEvent: PlatformAuditEventRecord;
}

export class PlatformAdminLoginsService {
  constructor(private readonly auditWriter: PlatformAuditWriter) {}

  async recordLoginSuccess(input: PlatformAdminLoginAttemptInput): Promise<PlatformAdminLoginAttemptResult> {
    const auditEvent = await this.auditWriter.record({
      companyId: input.companyId,
      actor: input.actor,
      action: 'platform.adminLogin.success',
      status: 'success',
      context: buildContext(input),
      metadata: { auditEvent: 'audit.event' },
    });

    return { mode: 'granted', auditEvent };
  }

  async recordLoginDenied(input: PlatformAdminLoginAttemptInput): Promise<PlatformAdminLoginAttemptResult> {
    const auditEvent = await this.auditWriter.record({
      companyId: input.companyId,
      actor: input.actor,
      action: 'platform.adminLogin.denied',
      status: 'warning',
      context: buildContext(input),
      metadata: { auditEvent: 'audit.event', reason: input.reason ?? 'ACCESS_DENIED' },
    });

    return { mode: 'denied', auditEvent };
  }

  async recordUnauthorizedAccess(input: PlatformAdminLoginAttemptInput & { resource: string }): Promise<PlatformAuditEventRecord> {
    return this.auditWriter.record({
      companyId: input.companyId,
      actor: input.actor,
      action: 'platform.access.unauthorizedAttempt',
      status: 'error',
      context: {
        ...buildContext(input),
        resource: input.resource,
      },
      metadata: { auditEvent: 'audit.event', reason: input.reason ?? 'UNAUTHORIZED_ATTEMPT' },
    });
  }
}

function buildContext(input: PlatformAdminLoginAttemptInput) {
  return {
    adminUserId: input.adminUserId ?? null,
    email: input.email ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
  };
}
