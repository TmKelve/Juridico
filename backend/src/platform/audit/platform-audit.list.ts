import type { PlatformAuditEventRecord, PlatformAuditListQuery } from './platform-audit.types';
import type { PlatformAuditService } from './platform-audit.service';

export interface PlatformAuditListInput {
  companyId?: number;
  actor?: string;
  action?: string;
  from?: string | Date | null;
  to?: string | Date | null;
  limit?: number;
}

export interface PlatformAuditListResult {
  scope: 'platform.audit.list';
  items: PlatformAuditEventRecord[];
}

export async function platformAuditList(service: Pick<PlatformAuditService, 'list'>, input: PlatformAuditListInput): Promise<PlatformAuditListResult> {
  const query: PlatformAuditListQuery = {
    companyId: input.companyId,
    actor: input.actor,
    action: input.action,
    from: input.from,
    to: input.to,
    limit: input.limit,
  };
  const items = await service.list(query);
  return { scope: 'platform.audit.list', items };
}
