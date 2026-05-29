import type { PlatformAuditApiPayload, PlatformAuditEntryView } from './types'

function normalizeStatus(input?: string): PlatformAuditEntryView['status'] {
  if (input === 'warning') return 'warning'
  if (input === 'error') return 'error'
  return 'success'
}

function formatDateLabel(value?: string): string {
  if (!value) return 'data não informada'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'data inválida'
  return parsed.toLocaleString('pt-BR', { timeZone: 'UTC' })
}

export function normalizePlatformAudit(payload: PlatformAuditApiPayload): PlatformAuditEntryView[] {
  return (payload.items ?? []).map((item, index) => ({
    id: String(item.id ?? `audit-${index}`),
    occurredAtLabel: formatDateLabel(item.occurredAt),
    actor: item.actor ?? 'ator não informado',
    action: item.action ?? 'ação não informada',
    entity: item.entity ?? 'entidade não informada',
    status: normalizeStatus(item.status),
    summary: item.summary ?? 'Sem resumo',
  }))
}
