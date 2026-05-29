import type { PlatformAuditEventRecord, PlatformAuditWriter } from '../audit';

export interface PlatformSupportViewQuery {
  companyId: number;
  actor: string;
  supportUserId: number;
  section?: string | null;
}

export interface PlatformSupportContextRepository {
  getSupportView(query: PlatformSupportViewQuery): Promise<Record<string, unknown>>;
}

export interface PlatformSupportViewResult {
  mode: 'supportView';
  readOnly: true;
  context: Record<string, unknown>;
  auditEvent: PlatformAuditEventRecord;
}

export class PlatformSupportService {
  constructor(
    private readonly repository: PlatformSupportContextRepository,
    private readonly auditWriter: PlatformAuditWriter,
  ) {}

  async supportView(query: PlatformSupportViewQuery): Promise<PlatformSupportViewResult> {
    const normalized = normalizeSupportViewQuery(query);
    const context = await this.repository.getSupportView(normalized);
    const auditEvent = await this.auditWriter.record({
      companyId: normalized.companyId,
      actor: normalized.actor,
      action: 'platform.support.view',
      status: 'success',
      context: {
        supportUserId: normalized.supportUserId,
        section: normalized.section,
        readOnly: true,
      },
      metadata: { auditEvent: 'audit.event' },
    });

    return {
      mode: 'supportView',
      readOnly: true,
      context,
      auditEvent,
    };
  }
}

export class InMemoryPlatformSupportContextRepository implements PlatformSupportContextRepository {
  constructor(private readonly snapshots: Record<number, Record<string, unknown>> = {}) {}

  async getSupportView(query: PlatformSupportViewQuery) {
    const companySnapshot = this.snapshots[query.companyId] ?? {};
    const section = query.section ?? 'overview';
    const scopedData = Object.prototype.hasOwnProperty.call(companySnapshot, section)
      ? (companySnapshot[section] as Record<string, unknown>)
      : companySnapshot;

    return {
      companyId: query.companyId,
      section,
      readOnly: true,
      data: scopedData ?? {},
      generatedAt: new Date().toISOString(),
    };
  }
}

function normalizeSupportViewQuery(input: PlatformSupportViewQuery): PlatformSupportViewQuery {
  if (!Number.isFinite(input.companyId) || input.companyId <= 0) {
    throw new Error('companyId inválido para supportView.');
  }
  if (!Number.isFinite(input.supportUserId) || input.supportUserId <= 0) {
    throw new Error('supportUserId inválido para supportView.');
  }
  const actor = input.actor.trim();
  if (!actor) {
    throw new Error('actor obrigatório para supportView.');
  }

  return {
    companyId: Math.trunc(input.companyId),
    actor,
    supportUserId: Math.trunc(input.supportUserId),
    section: input.section ? input.section.trim() : null,
  };
}
