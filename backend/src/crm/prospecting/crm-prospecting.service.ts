import type { CrmAuditService } from '../audit';
import type { ProspectLeadRecord } from './crm-prospecting.types';
import type { ClientProspectSignalResult, CrmProspectingRepository } from './crm-prospecting.types';
import { validateClientProspectSignalInput } from './crm-prospecting.validators';

export class CrmProspectingService {
  constructor(
    private readonly repository: CrmProspectingRepository,
    private readonly auditService: Pick<CrmAuditService, 'record' | 'runIdempotent'>,
  ) {}

  async signal(input: Record<string, unknown>): Promise<ClientProspectSignalResult> {
    const normalized = validateClientProspectSignalInput(input);
    const matchedClient = await this.repository.findClientByCpfCnpj(normalized.cpfCnpj);
    const hasActiveProcess = matchedClient ? await this.repository.hasActiveProcessByClientId(matchedClient.id) : false;
    const existingLead = await this.repository.findLeadByCpfCnpj(normalized.cpfCnpj);
    const entityId = existingLead?.id ?? matchedClient?.id ?? null;

    const response = await this.auditService.runIdempotent({
      key: normalized.idempotencyKey,
      scope: 'client.prospect.signal',
      entityType: 'crm_idempotency',
      entityId,
      action: 'signal_client_prospect',
      payload: normalized,
      onConflictMessage: 'PROSPECT_DUPLICATE',
      execute: async () => {
        let lead: ProspectLeadRecord | null = existingLead;
        if (!hasActiveProcess) {
          const baseLead = {
            clientId: matchedClient?.id ?? null,
            cpf: normalized.cpfCnpj,
            personName: normalized.personName ?? matchedClient?.name ?? 'Prospect sem nome',
            source: normalized.sourceType,
            status: 'novo',
            summary: normalized.summary,
          };

          lead = existingLead
            ? await this.repository.updateLead(existingLead.id, baseLead)
            : await this.repository.createLead(baseLead);
        }

        const result: ClientProspectSignalResult = {
          prospectId: lead?.id ?? matchedClient?.id ?? 0,
          leadId: lead?.id ?? null,
          matchedClientId: matchedClient?.id ?? null,
          hasActiveProcess,
          idempotent: false,
        };

        await this.auditService.record({
          scope: 'crm',
          entityType: 'crm_idempotency',
          entityId: result.prospectId || null,
          action: 'client.prospect.signal',
          status: hasActiveProcess ? 'warning' : 'success',
          summary: hasActiveProcess
            ? `Sinal de prospeccao ignorado por processo ativo do cliente #${matchedClient?.id}`
            : `Sinal de prospeccao registrado para ${normalized.cpfCnpj}`,
          details: {
            cpfCnpj: normalized.cpfCnpj,
            personName: normalized.personName,
            sourceType: normalized.sourceType,
            sourceReference: normalized.sourceReference,
            summary: normalized.summary,
            leadId: result.leadId,
            matchedClientId: result.matchedClientId,
            hasActiveProcess: result.hasActiveProcess,
          },
          actor: {
            source: 'api',
            role: 'crm-prospecting',
          },
          occurredAt: new Date().toISOString(),
          idempotencyKey: normalized.idempotencyKey,
        });

        return result;
      },
    });

    return {
      ...response.data,
      idempotent: response.mode === 'replayed' ? true : response.data.idempotent,
    };
  }
}
