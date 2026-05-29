export interface PlatformAuditEntryView {
  id: string
  occurredAtLabel: string
  actor: string
  action: string
  entity: string
  status: 'success' | 'warning' | 'error'
  summary: string
}

export interface PlatformAuditApiEntry {
  id?: string | number
  occurredAt?: string
  actor?: string
  action?: string
  entity?: string
  status?: string
  summary?: string
}

export interface PlatformAuditApiPayload {
  items?: PlatformAuditApiEntry[]
}
