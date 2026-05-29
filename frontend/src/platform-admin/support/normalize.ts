import type { SupportContextApiPayload, SupportContextItem } from './types'

function formatDateLabel(value?: string): string {
  if (!value) return 'sem atualização'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'data inválida'
  return parsed.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

export function normalizeSupportContext(payload: SupportContextApiPayload): SupportContextItem[] {
  return (payload.items ?? []).map((item, index) => ({
    id: String(item.id ?? `support-${index}`),
    title: item.title ?? 'Contexto sem título',
    description: item.description ?? 'Sem descrição operacional',
    owner: item.owner ?? 'owner não informado',
    updatedAtLabel: formatDateLabel(item.updatedAt),
    link: item.link ?? '#',
  }))
}
