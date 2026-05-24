/**
 * API Client Configuration
 * 
 * Usage:
 * const response = await apiClient('/auth/login', {
 *   method: 'POST',
 *   body: { email, password }
 * })
 */

const configuredApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const API_URL = configuredApiUrl || 'http://localhost:3000';
type ApiBody = Record<string, unknown>;

export interface ApiUser {
  id: number;
  email: string;
  role: string;
}

export type ApiFinancePermission =
  | 'finance:view'
  | 'finance:entry'
  | 'finance:billing'
  | 'finance:settlement'
  | 'finance:reconciliation'
  | 'finance:export';

export interface ApiFinanceCategory {
  code: string;
  label: string;
  type: 'receivable' | 'payable';
  active: boolean;
  sortOrder: number;
}

export interface ApiFinanceEntry {
  id: number;
  type: 'receivable' | 'payable';
  status: 'open' | 'overdue' | 'paid' | 'cancelled' | 'partially_paid' | 'reconciled';
  description: string;
  amountCents: number;
  settledAmountCents: number;
  dueDate: string;
  settlementDate: string | null;
  paymentMethod: 'manual' | 'pix' | 'boleto' | 'link' | 'bank_transfer' | 'cash' | null;
  currency: string;
  clientId: number | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  processId: number | null;
  processTitle?: string | null;
  processNumber?: string | null;
  categoryCode: string;
  categoryLabel: string;
  responsibleUserId: number | null;
  chargeStatus: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | null;
  billingMethod: 'boleto' | 'pix' | 'payment_link' | null;
  installmentPlanId?: number | null;
  installmentNumber?: number | null;
  installmentTotal?: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFinanceCharge {
  id: number;
  entryId: number;
  method: 'boleto' | 'pix' | 'payment_link';
  status: 'draft' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired';
  provider: string;
  externalId: string;
  paymentUrl: string | null;
  pixCode: string | null;
  boletoBarcode: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  amountCents: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFinanceAuditEvent {
  id: string;
  scope: string;
  entityType: 'entry' | 'charge' | 'reconciliation' | 'collection' | 'report' | 'permission' | 'installment_plan';
  entityId: string | null;
  action: string;
  status: 'success' | 'warning' | 'error';
  summary: string;
  details: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface ApiFinanceAgingBucket {
  label: '0-30' | '31-60' | '61-90' | '90+';
  count: number;
  amountCents: number;
}

export interface ApiFinanceAgingReport {
  referenceDate: string;
  buckets: ApiFinanceAgingBucket[];
  summary: {
    totalCount: number;
    totalAmountCents: number;
  };
  indicators: {
    totalReceivablesCents: number;
    overdueAmountCents: number;
    overdueCount: number;
    currentAmountCents: number;
    oldestDaysPastDue: number;
    overdueRatePercent: number;
  };
}

export interface ApiFinanceCashflowReport {
  totals: {
    inflowCents: number;
    outflowCents: number;
    netCents: number;
  };
  series: Array<{
    date: string;
    inflowCents: number;
    outflowCents: number;
    netCents: number;
  }>;
}

export interface ApiFinanceDelinquencyContact {
  id: string;
  clientId: number | null;
  clientName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  processId: number | null;
  processTitle: string | null;
  processNumber: string | null;
  overdueEntriesCount: number;
  overdueInstallmentsCount: number;
  overdueAmountCents: number;
  oldestDaysPastDue: number;
  nextActionAt: string | null;
  lastCollectionChannel: 'email' | 'whatsapp' | 'sms' | 'phone' | 'manual' | null;
  lastCollectionOutcome: 'sent' | 'delivered' | 'paid' | 'failed' | 'no_response' | null;
  entries: ApiFinanceEntry[];
}

export interface ApiFinanceInstallment {
  entryId: number | null;
  installmentNumber: number;
  status: 'scheduled' | 'open' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';
  amountCents: number;
  dueDate: string;
  settlementDate: string | null;
  chargeStatus: ApiFinanceEntry['chargeStatus'];
}

export interface ApiFinanceInstallmentPlan {
  id: number;
  contractLabel: string;
  description: string;
  clientId: number | null;
  clientName: string;
  processId: number | null;
  processTitle: string | null;
  processNumber: string | null;
  categoryCode: string;
  dayOfMonth: number;
  firstDueDate: string;
  nextDueDate: string | null;
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  status: 'draft' | 'active' | 'completed' | 'defaulted' | 'cancelled';
  metrics: {
    paidCount: number;
    onTimeCount: number;
    overdueCount: number;
    openCount: number;
    remainingCount: number;
    overdueAmountCents: number;
    remainingAmountCents: number;
  };
  installments: ApiFinanceInstallment[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiProcess {
  id: number;
  title: string;
  processNumber?: string | null;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: ApiUser;
}

export interface ApiProcessLookup {
  found: boolean;
  alreadyRegistered: boolean;
  source?: 'registered' | 'external' | 'fallback';
  process: ApiProcess;
}

export interface ApiClientProcess {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: ApiUser;
  lastAttendanceAt: string | null;
  pendingDocumentsCount: number;
}

export interface ApiClient {
  id: number;
  name: string;
  type: 'PF' | 'PJ';
  cpfCnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: 'ativo' | 'inativo' | 'prospecto' | 'encerrado';
  legalArea: string | null;
  responsible: string | null;
  notes: string | null;
  createdAt: string;
  processes: ApiClientProcess[];
  metrics: {
    lastAttendanceAt: string | null;
    pendingDocumentsCount: number;
    pendingAttendance: boolean;
    pendingItems: number;
  };
}

export interface ApiClientPortalDocumentCard {
  documentId: number;
  processId: number;
  title: string;
  status: string;
  category: string;
  uploadedAt: string;
}

export interface ApiClientPortalPublicationCard {
  publicationId: number;
  processId: number;
  title: string;
  status: string;
  publishedAt: string;
  requiresAction: boolean;
}

export interface ApiClientPortalDeadlineCard {
  deadlineId: number;
  processId: number;
  title: string;
  status: string;
  dueDate: string;
  priority: string;
}

export interface ApiClientPortalTimelineItem {
  entityType: 'document' | 'publication' | 'deadline';
  entityId: number;
  processId: number;
  title: string;
  status: string;
  occurredAt: string;
  highlight: string;
}

export interface ApiClientPortal {
  clientId: number;
  summary: {
    activeProcesses: number;
    pendingDocuments: number;
    recentPublications: number;
  };
  cards: {
    client: {
      id: number;
      name: string;
      status: string;
    };
    documents: ApiClientPortalDocumentCard[];
    publications: ApiClientPortalPublicationCard[];
    deadlines: ApiClientPortalDeadlineCard[];
  };
  timeline: ApiClientPortalTimelineItem[];
}

export interface ApiClientConsent {
  clientId: number;
  consentVersion: number;
  preferences: {
    email: boolean;
    whatsapp: boolean;
    portal: boolean;
  };
  legalBasis: 'consentimento' | 'execucao_contrato' | 'legitimo_interesse';
  capturedAt?: string;
  capturedBy?: string;
  updatedAt: string;
}

export interface ApiClientCommunicationHistoryItem {
  communicationId: string;
  channel: 'email' | 'whatsapp' | 'portal';
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  sentAt: string | null;
  deliveredAt: string | null;
  summary: string;
}

export interface ApiClientCommunicationHistory {
  clientId: number;
  items: ApiClientCommunicationHistoryItem[];
}

export interface ApiClientCommunicationSendResult {
  communicationId: string;
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'failed';
  retryCount: number;
  idempotent: boolean;
}

export interface ApiAttendance {
  id: number;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  clientId: number | null;
  client: string;
  canal: 'whatsapp' | 'telefone' | 'email' | 'presencial' | 'portal' | 'interno';
  tipo: 'consulta' | 'urgencia' | 'rotina' | 'triagem' | 'acompanhamento';
  assunto: string;
  resumo: string;
  observacoes: string;
  status: 'aberto' | 'resolvido' | 'aguardando_cliente' | 'sem_resposta' | 'agendado';
  priority: 'alta' | 'media' | 'baixa';
  responsavel: string;
  area: string;
  dataHora: string;
  proximoPasso: string;
  retornoAgendado: string | null;
  critico: boolean;
  actorEmail: string;
  owner?: ApiUser;
}

export interface ApiTask {
  id: number;
  title: string;
  description: string;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  clientId: number | null;
  client: string;
  origin: 'processo' | 'prazo' | 'documento' | 'publicacao' | 'atendimento' | 'interno';
  dueDate: string;
  status: 'pendente' | 'em_andamento' | 'aguardando' | 'concluida' | 'atrasada';
  priority: 'baixa' | 'media' | 'alta' | 'critica';
  owner: string;
  createdBy: string;
  notes: string;
  linkedToDeadline: boolean;
  linkedToPublication: boolean;
  linkedToDocument: boolean;
  immediateAction: boolean;
}

export interface ApiAgendaEvent {
  id: number;
  title: string;
  type: 'audiencia' | 'prazo_calendario' | 'reuniao_cliente' | 'retorno_agendado' | 'compromisso_interno' | 'diligencia' | 'protocolo' | 'tarefa_horario' | 'evento_manual';
  status: 'agendado' | 'confirmado' | 'atencao' | 'realizado' | 'cancelado';
  priority: 'alta' | 'media' | 'baixa';
  date: string;
  startTime: string;
  endTime: string;
  clientId: number | null;
  client: string;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  responsible: string;
  locationOrChannel: string;
  notes: string;
  origin: 'processo' | 'publicacao' | 'atendimento' | 'manual';
  createdBy: string;
  attendanceId: number | null;
  taskId: number | null;
  isAudience: boolean;
  isReturn: boolean;
  isDeadline: boolean;
  requiresAttention: boolean;
}

export interface ApiDeadline {
  id: number;
  title: string;
  processId: number;
  processLabel: string;
  processTitle: string;
  clientId: number | null;
  client: string;
  origin: 'publicacao' | 'audiencia' | 'interno' | 'cliente';
  dueDate: string;
  status: 'aberto' | 'critico' | 'atrasado' | 'concluido';
  priority: 'baixa' | 'media' | 'alta';
  owner: string;
  area: string;
  notes: string;
  publicationId?: number | null;
  agendaEventId?: number | null;
  agendaSyncStatus?: string;
  completedAt: string | null;
  completedBy?: string;
  completionJustification?: string;
  risk?: {
    level: 'baixo' | 'normal' | 'atencao' | 'critico';
    score: number;
    reasons: Array<{ code: string; weight: number; message: string }>;
    computedAt: string;
  };
}

export interface ApiDocument {
  id: number;
  name: string;
  processId: number;
  processLabel: string;
  processTitle: string;
  clientId: number | null;
  client: string;
  category: 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';
  status: 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
  version: number;
  isLatestVersion: boolean;
  origin: 'upload' | 'cliente' | 'publicacao' | 'interno';
  uploadedAt: string;
  owner: string;
  notes: string;
  requiredChecklist: boolean;
  pendingForAdvance: boolean;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'application/octet-stream';
  previewUrl?: string;
  metadata?: Record<string, unknown>;
  storage?: Record<string, unknown>;
  approval?: {
    decision: string | null;
    reason: string | null;
    decidedAt: string | null;
    checklist?: unknown;
  } | null;
  links?: Array<{ entityType: string; entityId: number }>;
  artifacts?: Array<Record<string, unknown>>;
}

export interface ApiPublication {
  id: number;
  tipo: 'intimacao' | 'citacao' | 'despacho' | 'sentenca' | 'acordao' | 'edital' | 'outros';
  status: 'nova' | 'lida' | 'em_analise' | 'tratada' | 'ignorada';
  impacto: 'critico' | 'alto' | 'medio' | 'baixo' | 'informativo';
  processId: number;
  processLabel: string;
  processTitle: string;
  client: string;
  tribunal: string;
  origem: string;
  dataPublicacao: string;
  resumo: string;
  textoRelevante: string;
  exigeAcao: boolean;
  convertidaEmPrazo: boolean;
  prazoDerivedoLabel: string | null;
  derivedDeadlineId: number | null;
  observacoes: string;
  lida: boolean;
}

export interface ApiTemplateVersion {
  id: string;
  version: string;
  author: string;
  date: string;
  description: string;
  current: boolean;
}

export interface ApiTemplate {
  id: string;
  nome: string;
  area: string;
  tipoPeca: string;
  status: 'ativo' | 'revisao' | 'rascunho' | 'arquivado';
  oficial: boolean;
  favorito: boolean;
  autoFill: boolean;
  fase: string;
  autor: string;
  versao: string;
  ultimaAtualizacao: string;
  usoRecente: string | null;
  precisaRevisao: boolean;
  descricao: string;
  tags: string[];
  placeholders: string[];
  preview: string;
  versions: ApiTemplateVersion[];
}

export interface ApiTriageEvent {
  id: number;
  publicationId: number | null;
  title: string;
  summary: string;
  riskLevel: string;
  requiresAction: boolean;
  eventAt: string;
}

export interface ApiTriageDecision {
  id: number;
  decisionType: string;
  decisionReason: string;
  decisionNote: string;
  decidedBy: string;
  decidedAt: string;
  generatedTaskId: number | null;
  generatedDeadlineId: number | null;
  generatedLeadId: number | null;
  generatedOpportunityId: number | null;
}

export interface ApiTriageItem {
  id: number;
  queueType: 'critica' | 'normal' | 'tratados';
  status: 'pendente' | 'em_revisao_manual' | 'adiado' | 'confirmado' | 'descartado';
  suggestedAction: 'criar_prazo' | 'criar_tarefa' | 'criar_oportunidade' | 'criar_lead' | 'registrar_publicacao' | 'sem_acao';
  suggestedReason: string;
  aiConfidenceBand: 'alta' | 'media' | 'baixa';
  aiScoreRaw: number | null;
  postponeUntil: string | null;
  assignedQueue: string;
  handledBy: string | null;
  handledAt: string | null;
  discardReason: string | null;
  discardNote: string | null;
  sourceLabel: string;
  createdAt: string;
  updatedAt: string;
  priorityScore: number | null;
  priorityLabel: 'critica' | 'alta' | 'media' | 'baixa' | null;
  priorityReasons: string[];
  queueRank: number | null;
  agingHours: number | null;
  slaTargetAt: string | null;
  breached: boolean;
  operationalBucket: string | null;
  processId: number | null;
  processLabel: string;
  processTitle: string;
  clientId: number | null;
  client: string;
  crmLeadId: number | null;
  crmOpportunityId: number | null;
  capture: {
    id: number;
    sourceType: string;
    sourceReference: string;
    occurredAt: string;
    tribunal: string;
    processNumber: string;
    cpf: string;
    personName: string;
    normalizedText: string;
  };
  event: ApiTriageEvent | null;
  decisions?: ApiTriageDecision[];
  timeline?: Array<{
    id: number;
    title: string;
    summary: string;
    eventType: string;
    eventAt: string;
    riskLevel: string;
    requiresAction: boolean;
  }>;
  explanation?: {
    summary: string;
    appliedRules: string[];
    matchedSignals: string[];
    confidenceBand: 'alta' | 'media' | 'baixa';
    priorityReasons: string[];
  };
}

export interface ApiTriageJob {
  id: number;
  sourceType: string;
  scheduledFor: string;
  startedAt: string | null;
  finishedAt: string | null;
  status: 'pending' | 'running' | 'success' | 'partial_failure' | 'failed';
  itemsCaptured: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFlaggedCritical: number;
  itemsSentToCrm: number;
  errorLog: string | null;
}

export interface ApiCrmLead {
  id: number;
  cpf: string;
  personName: string;
  source: string;
  status: string;
  responsible: string;
  summary: string;
  clientId: number | null;
  client: string;
  triageCount: number;
  hasCriticalTriage: boolean;
  lastContactAt: string | null;
  nextContactAt: string | null;
  contactEvents: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCrmOpportunity {
  id: number;
  convertedProcessId: number | null;
  cpf: string;
  personName: string;
  source: string;
  status: string;
  responsible: string;
  summary: string;
  clientId: number | null;
  client: string;
  triageCount: number;
  hasCriticalTriage: boolean;
  lastContactAt: string | null;
  nextContactAt: string | null;
  contactEvents: Array<{
    id: number;
    kind: string;
    summary: string;
    createdBy: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCrmOpportunityDocument {
  id: number;
  opportunityId: number;
  documentId: number | null;
  title: string;
  category: string;
  status: string;
  mimeType: string;
  previewUrl: string | null;
  requiredChecklist: boolean;
  pendingForAdvance: boolean;
  uploadedAt: string;
  responsible: string;
  createdBy: string;
  externalDocumentId: string | null;
}

export interface ApiAuditEvent {
  id: string;
  scope: string;
  entityType: string;
  entityId: number | null;
  action: string;
  status: string;
  summary: string;
  details: Record<string, unknown>;
  actor: Record<string, unknown>;
  occurredAt: string;
  correlationId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
}

interface LoginResponse {
  user: ApiUser;
}

interface MeResponse {
  user: Partial<ApiUser> & { sub?: number };
}

interface ErrorPayload {
  message?: string;
}

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: ApiBody;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  error?: string;
}

/**
 * Make API request with auth token support
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const { method = 'GET', body, headers = {} } = options;

  const url = `${API_URL}${path}`;
  const fetchOptions: RequestInit = {
    method,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type') || '';
    let data: (T & ErrorPayload) | null = null;
    let fallbackText = '';

    if (contentType.includes('application/json')) {
      data = await response.json() as T & ErrorPayload;
    } else {
      fallbackText = await response.text();
    }

    const safeData = (data ?? ({} as T)) as T & ErrorPayload;
    const fallbackError = fallbackText
      ? fallbackText.replace(/\s+/g, ' ').trim().slice(0, 180)
      : response.statusText;

    return {
      status: response.status,
      data: safeData,
      error: !response.ok ? safeData?.message || fallbackError : undefined,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Connection error';
    return {
      status: 0,
      data: {} as T,
      error,
    };
  }
}

/**
 * Convenience methods
 */
export const api = {
  login: (email: string, password: string) =>
    apiClient<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  logout: () =>
    apiClient('/auth/logout', {
      method: 'POST',
    }),

  getMe: () =>
    apiClient<MeResponse>('/me'),

  getPermissions: () =>
    apiClient<string[]>('/permissions'),

  getUsers: () =>
    apiClient<ApiUser[]>('/users'),

  getClients: () =>
    apiClient<ApiClient[]>('/clients'),

  getClient: (id: number) =>
    apiClient<ApiClient>(`/clients/${id}`),

  getClientPortal: (id: number, options?: {
    includeDocuments?: boolean;
    includePublications?: boolean;
    includeDeadlines?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (options?.includeDocuments === false) params.set('includeDocuments', '0');
    if (options?.includePublications === false) params.set('includePublications', '0');
    if (options?.includeDeadlines === false) params.set('includeDeadlines', '0');
    const query = params.toString();
    return apiClient<ApiClientPortal>(query ? `/clients/${id}/portal?${query}` : `/clients/${id}/portal`);
  },

  getClientConsent: (id: number) =>
    apiClient<ApiClientConsent>(`/clients/${id}/consent`),

  updateClientConsent: (id: number, data: {
    preferences: {
      email: boolean;
      whatsapp: boolean;
      portal: boolean;
    };
    legalBasis: ApiClientConsent['legalBasis'];
    capturedAt?: string;
    capturedBy?: string;
  }) =>
    apiClient<ApiClientConsent>(`/clients/${id}/consent`, {
      method: 'PUT',
      body: data,
    }),

  getClientCommunications: (id: number, filters?: {
    channel?: 'email' | 'whatsapp' | 'portal' | 'all';
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.channel) params.set('channel', filters.channel);
    if (typeof filters?.limit === 'number') params.set('limit', String(filters.limit));
    const query = params.toString();
    return apiClient<ApiClientCommunicationHistory>(query ? `/clients/${id}/communications?${query}` : `/clients/${id}/communications`);
  },

  sendClientCommunication: (id: number, data: {
    channel: 'email' | 'whatsapp' | 'portal';
    subject?: string | null;
    message: string;
    templateCode?: string | null;
    contextEntityType: 'document' | 'triage' | 'process' | 'attendance' | 'crm';
    contextEntityId?: number | string | null;
    idempotencyKey?: string | null;
  }) =>
    apiClient<ApiClientCommunicationSendResult>(`/clients/${id}/communications`, {
      method: 'POST',
      body: {
        channel: data.channel,
        subject: data.subject ?? null,
        message: data.message,
        templateCode: data.templateCode ?? null,
        contextEntityType: data.contextEntityType,
        contextEntityId: data.contextEntityId ?? null,
      },
      headers: data.idempotencyKey ? { 'Idempotency-Key': data.idempotencyKey } : undefined,
    }),

  createClient: (data: {
    name: string;
    type: 'PF' | 'PJ';
    cpfCnpj?: string;
    phone?: string;
    email?: string;
    address?: string;
    status?: 'ativo' | 'inativo' | 'prospecto' | 'encerrado';
    legalArea?: string;
    responsible?: string;
    notes?: string;
  }) =>
    apiClient<ApiClient>('/clients', {
      method: 'POST',
      body: data,
    }),

  updateClient: (id: number, data: Partial<{
    name: string;
    type: 'PF' | 'PJ';
    cpfCnpj: string;
    phone: string;
    email: string;
    address: string;
    status: 'ativo' | 'inativo' | 'prospecto' | 'encerrado';
    legalArea: string;
    responsible: string;
    notes: string;
  }>) =>
    apiClient<ApiClient>(`/clients/${id}`, {
      method: 'PUT',
      body: data,
    }),

  getHome: () =>
    apiClient<{ profile: string; home: { menu: string[]; cards: string[] } }>('/home'),

  getFinanceCategories: (type?: 'receivable' | 'payable') =>
    apiClient<ApiFinanceCategory[]>(type ? `/finance/categories?type=${type}` : '/finance/categories'),

  getFinanceEntries: (filters?: { type?: 'receivable' | 'payable'; status?: ApiFinanceEntry['status'] }) => {
    const params = new URLSearchParams();
    if (filters?.type) params.set('type', filters.type);
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    return apiClient<ApiFinanceEntry[]>(query ? `/finance/entries?${query}` : '/finance/entries');
  },

  createFinanceEntry: (data: {
    type: 'receivable' | 'payable';
    description: string;
    amountCents: number;
    dueDate: string;
    clientId?: number | null;
    processId?: number | null;
    categoryCode: string;
    responsibleUserId?: number | null;
    notes?: string | null;
    idempotencyKey?: string | null;
  }) =>
    apiClient<{ entry: ApiFinanceEntry }>('/finance/entries', {
      method: 'POST',
      body: data,
    }),

  settleFinanceEntry: (id: number, data: {
    settlementDate: string;
    paymentMethod: NonNullable<ApiFinanceEntry['paymentMethod']>;
    notes?: string | null;
    idempotencyKey?: string | null;
  }) =>
    apiClient<{ entry: ApiFinanceEntry }>(`/finance/entries/${id}/settle`, {
      method: 'POST',
      body: data,
    }),

  generateFinanceBilling: (data: {
    entryId: number;
    method: ApiFinanceCharge['method'];
    expiresAt?: string | null;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    idempotencyKey?: string | null;
  }) =>
    apiClient<{ charge: ApiFinanceCharge; entry: ApiFinanceEntry }>('/finance/billing/generate', {
      method: 'POST',
      body: data,
    }),

  runFinanceReconciliation: (data: {
    referenceDate: string;
    lines: Array<{ externalId: string; occurredAt: string; amountCents: number; description: string }>;
    idempotencyKey?: string | null;
  }) =>
    apiClient('/finance/reconciliation/run', {
      method: 'POST',
      body: data,
    }),

  scheduleFinanceCollection: (data: {
    entryId: number;
    channel: 'email' | 'whatsapp' | 'sms';
    cadenceDays: number;
    maxAttempts: number;
    startsAt: string;
    idempotencyKey?: string | null;
  }) =>
    apiClient('/finance/collections/schedule', {
      method: 'POST',
      body: data,
    }),

  getFinanceCashflow: (filters: { from: string; to: string; groupBy?: 'day' | 'week' | 'month' }) => {
    const params = new URLSearchParams({
      from: filters.from,
      to: filters.to,
      groupBy: filters.groupBy ?? 'month',
    });
    return apiClient<ApiFinanceCashflowReport>(`/finance/reports/cashflow?${params.toString()}`);
  },

  getFinanceAging: (referenceDate: string) =>
    apiClient<ApiFinanceAgingReport>(`/finance/reports/aging?referenceDate=${encodeURIComponent(referenceDate)}`),

  getFinanceAudit: (filters?: { entityType?: string; entityId?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.entityType) params.set('entityType', filters.entityType);
    if (filters?.entityId) params.set('entityId', filters.entityId);
    if (typeof filters?.limit === 'number') params.set('limit', String(filters.limit));
    const query = params.toString();
    return apiClient<ApiFinanceAuditEvent[]>(query ? `/finance/audit?${query}` : '/finance/audit');
  },

  getFinanceDelinquencyContacts: (filters?: {
    referenceDate?: string;
    status?: 'open' | 'overdue' | 'all';
    clientId?: number;
    processId?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.referenceDate) params.set('referenceDate', filters.referenceDate);
    if (filters?.status) params.set('status', filters.status);
    if (typeof filters?.clientId === 'number') params.set('clientId', String(filters.clientId));
    if (typeof filters?.processId === 'number') params.set('processId', String(filters.processId));
    const query = params.toString();
    return apiClient<ApiFinanceDelinquencyContact[]>(query ? `/finance/delinquency/contacts?${query}` : '/finance/delinquency/contacts');
  },

  getFinanceInstallmentPlans: (filters?: {
    status?: ApiFinanceInstallmentPlan['status'];
    clientId?: number;
    processId?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (typeof filters?.clientId === 'number') params.set('clientId', String(filters.clientId));
    if (typeof filters?.processId === 'number') params.set('processId', String(filters.processId));
    const query = params.toString();
    return apiClient<ApiFinanceInstallmentPlan[]>(query ? `/finance/installment-plans?${query}` : '/finance/installment-plans');
  },

  createFinanceInstallmentPlan: (data: {
    description: string;
    contractLabel: string;
    clientId: number;
    processId?: number | null;
    categoryCode: string;
    firstDueDate: string;
    dayOfMonth: number;
    installmentCount: number;
    installmentAmountCents: number;
    totalAmountCents?: number;
    responsibleUserId?: number | null;
    notes?: string | null;
    idempotencyKey?: string | null;
  }) =>
    apiClient<{ plan: ApiFinanceInstallmentPlan }>('/finance/installment-plans', {
      method: 'POST',
      body: {
        ...data,
        dueDay: data.dayOfMonth,
      },
    }),

  getProcesses: () =>
    apiClient<ApiProcess[]>('/processes'),

  getProcess: (id: number) =>
    apiClient<ApiProcess>(`/processes/${id}`),

  lookupProcess: (number: string) =>
    apiClient<ApiProcessLookup>(`/processes/lookup?number=${encodeURIComponent(number)}`),

  createProcess: (data: { title: string; processNumber?: string; client: string; phase: string; status: string }) =>
    apiClient('/processes', {
      method: 'POST',
      body: data,
    }),

  updateProcess: (id: number, data: Partial<{ title: string; processNumber: string; client: string; phase: string; status: string }>) =>
    apiClient(`/processes/${id}`, {
      method: 'PUT',
      body: data,
    }),

  deleteProcess: (id: number) =>
    apiClient(`/processes/${id}`, {
      method: 'DELETE',
    }),

  getAndamentos: (processId: number) =>
    apiClient<unknown[]>(`/processes/${processId}/andamentos`),

  createAndamento: (processId: number, data: { title: string; description: string }) =>
    apiClient(`/processes/${processId}/andamentos`, { method: 'POST', body: data }),

  getPrazos: (processId: number) =>
    apiClient<ApiDeadline[]>(`/processes/${processId}/prazos`),

  createPrazo: (processId: number, data: { title: string; dueDate: string; priority?: string; status?: string; origin?: string; responsible?: string; notes?: string }) =>
    apiClient(`/processes/${processId}/prazos`, { method: 'POST', body: data }),

  getDeadlines: () =>
    apiClient<ApiDeadline[]>('/deadlines'),

  getDeadline: (id: number) =>
    apiClient<ApiDeadline>(`/deadlines/${id}`),

  createDeadline: (data: {
    title: string;
    processId: number;
    dueDate: string;
    priority?: 'baixa' | 'media' | 'alta';
    status?: 'aberto' | 'critico' | 'atrasado' | 'concluido';
    origin?: 'publicacao' | 'audiencia' | 'interno' | 'cliente';
    responsible?: string;
    notes?: string;
  }) =>
    apiClient<ApiDeadline>('/deadlines', { method: 'POST', body: data }),

  updateDeadline: (id: number, data: Partial<{
    title: string;
    dueDate: string;
    priority: 'baixa' | 'media' | 'alta';
    status: 'aberto' | 'critico' | 'atrasado' | 'concluido';
    origin: 'publicacao' | 'audiencia' | 'interno' | 'cliente';
    responsible: string;
    notes: string;
    completionJustification: string;
  }>) =>
    apiClient<ApiDeadline>(`/deadlines/${id}`, { method: 'PUT', body: data }),

  getDocumentos: (processId: number) =>
    apiClient<ApiDocument[]>(`/processes/${processId}/documentos`),

  createDocumento: (processId: number, data: {
    title: string;
    description: string;
    status?: string;
    category?: string;
    origin?: string;
    responsible?: string;
    requiredChecklist?: boolean;
    pendingForAdvance?: boolean;
    mimeType?: string;
    previewUrl?: string;
  }) =>
    apiClient(`/processes/${processId}/documentos`, { method: 'POST', body: data }),

  getDocuments: () =>
    apiClient<ApiDocument[]>('/documents'),

  getDocument: (id: number) =>
    apiClient<ApiDocument>(`/documents/${id}`),

  createDocument: (data: {
    title: string;
    processId: number;
    category?: 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';
    status?: 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
    origin?: 'upload' | 'cliente' | 'publicacao' | 'interno';
    responsible?: string;
    notes?: string;
    requiredChecklist?: boolean;
    pendingForAdvance?: boolean;
    mimeType?: 'application/pdf' | 'image/png' | 'image/jpeg' | 'application/octet-stream';
    previewUrl?: string;
    metadata?: Record<string, unknown>;
    file?: {
      fileName: string;
      contentBase64: string;
      mimeType?: string;
      sizeInBytes?: number;
    };
  }) =>
    apiClient<ApiDocument>('/documents', { method: 'POST', body: data }),

  updateDocument: (id: number, data: Partial<{
    title: string;
    status: 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
    category: 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';
    origin: 'upload' | 'cliente' | 'publicacao' | 'interno';
    responsible: string;
    notes: string;
    requiredChecklist: boolean;
    pendingForAdvance: boolean;
    mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'application/octet-stream';
    previewUrl: string;
    createNewVersion: boolean;
    metadata: Record<string, unknown>;
    approvalReason: string;
  }>) =>
    apiClient<ApiDocument>(`/documents/${id}`, { method: 'PUT', body: data }),

  getAttendances: () =>
    apiClient<ApiAttendance[]>('/attendances'),

  getPublications: () =>
    apiClient<ApiPublication[]>('/publications'),

  getPublication: (id: number) =>
    apiClient<ApiPublication>(`/publications/${id}`),

  createPublication: (data: {
    processId: number;
    tipo: ApiPublication['tipo'];
    impacto?: ApiPublication['impacto'];
    status?: ApiPublication['status'];
    tribunal: string;
    origem: string;
    dataPublicacao: string;
    resumo: string;
    textoRelevante: string;
    exigeAcao?: boolean;
    observacoes?: string;
  }) =>
    apiClient<ApiPublication>('/publications', { method: 'POST', body: data }),

  updatePublication: (id: number, data: Partial<{
    status: ApiPublication['status'];
    impacto: ApiPublication['impacto'];
    exigeAcao: boolean;
    convertidaEmPrazo: boolean;
    prazoDerivedoLabel: string | null;
    derivedDeadlineId: number | null;
    observacoes: string;
    lida: boolean;
  }>) =>
    apiClient<ApiPublication>(`/publications/${id}`, { method: 'PUT', body: data }),

  createDeadlineFromPublication: (id: number, data?: Partial<{
    title: string;
    dueDate: string;
    priority: ApiDeadline['priority'];
    status: ApiDeadline['status'];
    responsible: string;
    notes: string;
  }>) =>
    apiClient<{ publication: ApiPublication; deadline: ApiDeadline }>(`/publications/${id}/create-deadline`, {
      method: 'POST',
      body: data ?? {},
    }),

  getTemplates: () =>
    apiClient<ApiTemplate[]>('/templates'),

  getTemplate: (id: string) =>
    apiClient<ApiTemplate>(`/templates/${id}`),

  createTemplate: (data: {
    nome: string;
    area: string;
    tipoPeca: string;
    status?: ApiTemplate['status'];
    oficial?: boolean;
    favorito?: boolean;
    autoFill?: boolean;
    fase: string;
    autor?: string;
    versao?: string;
    precisaRevisao?: boolean;
    descricao: string;
    tags: string[];
    placeholders: string[];
    preview: string;
    versions: ApiTemplateVersion[];
  }) =>
    apiClient<ApiTemplate>('/templates', { method: 'POST', body: data }),

  updateTemplate: (id: string, data: Partial<{
    nome: string;
    area: string;
    tipoPeca: string;
    status: ApiTemplate['status'];
    oficial: boolean;
    favorito: boolean;
    autoFill: boolean;
    fase: string;
    autor: string;
    versao: string;
    usoRecente: string | null;
    precisaRevisao: boolean;
    descricao: string;
    tags: string[];
    placeholders: string[];
    preview: string;
    versions: ApiTemplateVersion[];
  }>) =>
    apiClient<ApiTemplate>(`/templates/${id}`, { method: 'PUT', body: data }),

  generateTemplateDocument: (id: string, data: {
    processId: number;
    title: string;
    fields: Array<{ key: string; label: string; value: string }>;
  }) =>
    apiClient<{ document: ApiDocument; templateLastUsedAt: string }>(`/templates/${id}/generate-document`, {
      method: 'POST',
      body: data,
    }),

  getAttendance: (id: number) =>
    apiClient<ApiAttendance>(`/attendances/${id}`),

  createAttendance: (data: {
    processId?: number;
    clientId?: number;
    client?: string;
    canal: ApiAttendance['canal'];
    tipo?: ApiAttendance['tipo'];
    assunto: string;
    resumo?: string;
    observacoes?: string;
    status?: ApiAttendance['status'];
    priority?: ApiAttendance['priority'];
    responsavel?: string;
    proximoPasso?: string;
    retornoAgendado?: string;
    dataHora?: string;
    critical?: boolean;
  }) =>
    apiClient<ApiAttendance>('/attendances', { method: 'POST', body: data }),

  updateAttendance: (id: number, data: Partial<{
    canal: ApiAttendance['canal'];
    tipo: ApiAttendance['tipo'];
    assunto: string;
    resumo: string;
    observacoes: string;
    status: ApiAttendance['status'];
    priority: ApiAttendance['priority'];
    responsavel: string;
    proximoPasso: string;
    retornoAgendado: string | null;
    dataHora: string;
    critical: boolean;
  }>) =>
    apiClient<ApiAttendance>(`/attendances/${id}`, { method: 'PUT', body: data }),

  getAtendimentos: (processId: number) =>
    apiClient<ApiAttendance[]>(`/processes/${processId}/atendimentos`),

  createAtendimento: (processId: number, data: { title: string; description: string }) =>
    apiClient<ApiAttendance>(`/processes/${processId}/atendimentos`, { method: 'POST', body: data }),

  getTasks: () =>
    apiClient<ApiTask[]>('/tasks'),

  getTask: (id: number) =>
    apiClient<ApiTask>(`/tasks/${id}`),

  createTask: (data: {
    title: string;
    description?: string;
    processId?: number;
    client?: string;
    origin?: ApiTask['origin'];
    owner?: string;
    priority?: ApiTask['priority'];
    dueDate?: string;
    status?: ApiTask['status'];
    notes?: string;
    immediateAction?: boolean;
  }) =>
    apiClient<ApiTask>('/tasks', { method: 'POST', body: data }),

  updateTask: (id: number, data: Partial<{
    title: string;
    description: string;
    owner: string;
    priority: ApiTask['priority'];
    dueDate: string;
    status: ApiTask['status'];
    notes: string;
    immediateAction: boolean;
  }>) =>
    apiClient<ApiTask>(`/tasks/${id}`, { method: 'PUT', body: data }),

  getAgenda: () =>
    apiClient<ApiAgendaEvent[]>('/agenda'),

  getAgendaEvent: (id: number) =>
    apiClient<ApiAgendaEvent>(`/agenda/${id}`),

  createAgendaEvent: (data: {
    title?: string;
    type?: ApiAgendaEvent['type'];
    status?: ApiAgendaEvent['status'];
    priority?: ApiAgendaEvent['priority'];
    date?: string;
    startTime?: string;
    endTime?: string;
    processId?: number;
    clientId?: number;
    client?: string;
    responsible?: string;
    locationOrChannel?: string;
    notes?: string;
    origin?: ApiAgendaEvent['origin'];
    attendanceId?: number;
    taskId?: number;
  }) =>
    apiClient<ApiAgendaEvent>('/agenda', { method: 'POST', body: data }),

  updateAgendaEvent: (id: number, data: Partial<{
    title: string;
    status: ApiAgendaEvent['status'];
    priority: ApiAgendaEvent['priority'];
    date: string;
    startTime: string;
    endTime: string;
    responsible: string;
    locationOrChannel: string;
    notes: string;
  }>) =>
    apiClient<ApiAgendaEvent>(`/agenda/${id}`, { method: 'PUT', body: data }),

  getTriage: (params?: { queueType?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.queueType) query.set('queueType', params.queueType);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    return apiClient<ApiTriageItem[]>(`/triage${query.size ? `?${query.toString()}` : ''}`);
  },

  getTriageItem: (id: number) =>
    apiClient<ApiTriageItem>(`/triage/${id}`),

  getTriageJobs: () =>
    apiClient<ApiTriageJob[]>('/triage/jobs'),

  runTriageJob: (source: 'cnj' | 'cpf' | 'diario' | 'oab') =>
    apiClient(`/triage/jobs/run-${source}`, { method: 'POST' }),

  getCrmLeads: () =>
    apiClient<ApiCrmLead[]>('/crm/leads'),

  getCrmOpportunities: () =>
    apiClient<ApiCrmOpportunity[]>('/crm/opportunities'),

  createCrmOpportunity: (data: {
    clientId?: number | null;
    clientName?: string;
    personName: string;
    cpf?: string;
    source?: string;
    status?: string;
    responsible?: string;
    summary: string;
    nextContactAt?: string | null;
  }) =>
    apiClient<ApiCrmOpportunity>('/crm/opportunities', { method: 'POST', body: data }),

  updateCrmLead: (id: number, data: Partial<Pick<ApiCrmLead, 'status' | 'summary' | 'personName' | 'responsible' | 'nextContactAt'>>) =>
    apiClient<ApiCrmLead>(`/crm/leads/${id}`, { method: 'PUT', body: data }),

  updateCrmOpportunity: (id: number, data: Partial<Pick<ApiCrmOpportunity, 'status' | 'summary' | 'personName' | 'responsible' | 'nextContactAt'>>) =>
    apiClient<ApiCrmOpportunity>(`/crm/opportunities/${id}`, { method: 'PUT', body: data }),

  convertCrmLead: (id: number, data?: Partial<{ personName: string; status: string; summary: string }>) =>
    apiClient<{ lead: ApiCrmLead; opportunity: ApiCrmOpportunity }>(`/crm/leads/${id}/convert`, { method: 'POST', body: data ?? {} }),

  convertCrmOpportunity: (id: number, data: {
    clientId?: number | null;
    clientName: string;
    processTitle: string;
    processNumber?: string;
    processPhase: string;
    processStatus: string;
    summary?: string;
    confirmConversion?: boolean;
  }) =>
    apiClient<{
      opportunity: ApiCrmOpportunity;
      client: { id: number; name: string; cpfCnpj: string; status: string; responsible: string };
      process: { id: number; title: string; processNumber: string; phase: string; status: string; clientId: number | null; client: string };
    }>(`/crm/opportunities/${id}/convert`, { method: 'POST', body: data }),

  addCrmLeadContactEvent: (id: number, data: { kind?: string; summary: string; nextContactAt?: string | null }) =>
    apiClient<ApiCrmLead>(`/crm/leads/${id}/contact-events`, { method: 'POST', body: data }),

  addCrmOpportunityContactEvent: (id: number, data: { kind?: string; summary: string; nextContactAt?: string | null }) =>
    apiClient<ApiCrmOpportunity>(`/crm/opportunities/${id}/contact-events`, { method: 'POST', body: data }),

  linkCrmOpportunityProcess: (id: number, data: {
    processId: number;
    confirmLink: boolean;
    summary?: string;
  }) =>
    apiClient<{
      opportunity: ApiCrmOpportunity;
      process: {
        id: number;
        title: string;
        processNumber: string;
        phase: string;
        status: string;
        clientId: number | null;
        client: string;
      };
      outcome: 'linked' | 'already_linked';
      idempotent: boolean;
    }>(`/crm/opportunities/${id}/link-process`, { method: 'POST', body: data }),

  getCrmOpportunityDocuments: (id: number) =>
    apiClient<ApiCrmOpportunityDocument[]>(`/crm/opportunities/${id}/documents`),

  attachCrmOpportunityDocument: (id: number, data: {
    title: string;
    description?: string;
    category?: string;
    mimeType?: string;
    previewUrl?: string;
    responsible?: string;
    origin?: string;
    uploadedAt?: string;
    requiredChecklist?: boolean;
    pendingForAdvance?: boolean;
    externalDocumentId?: string;
  }) =>
    apiClient<{
      mode: 'created' | 'replayed';
      idempotencyKey: string | null;
      data: {
        document: ApiCrmOpportunityDocument;
        auditEvent: ApiAuditEvent;
      };
    }>(`/crm/opportunities/${id}/documents`, { method: 'POST', body: data }),

  getCrmOpportunityAudit: (id: number) =>
    apiClient<ApiAuditEvent[]>(`/crm/opportunities/${id}/audit`),

  updateTriageItem: (id: number, data: Partial<{
    status: ApiTriageItem['status'];
    postponeUntil: string | null;
    assignedQueue: string;
  }>) =>
    apiClient<ApiTriageItem>(`/triage/${id}`, { method: 'PUT', body: data }),

  decideTriageItem: (id: number, data: {
    decisionType: 'confirmado' | 'descartado' | 'revisao_manual' | 'adiado' | 'reatribuido';
    decisionReason?: string;
    decisionNote?: string;
    postponeUntil?: string;
    assignedQueue?: string;
    deadlineTitle?: string;
    dueDate?: string;
    deadlinePriority?: ApiDeadline['priority'];
    taskTitle?: string;
    taskDueDate?: string;
    taskPriority?: ApiTask['priority'];
    taskOwner?: string;
    taskDescription?: string;
    crmPersonName?: string;
    crmSummary?: string;
    }) =>
    apiClient<{ item: ApiTriageItem; decision: ApiTriageDecision }>(`/triage/${id}/decision`, { method: 'POST', body: data }),

  bulkDeadlineAction: (data: {
    action:
      | { type: 'complete'; deadlineIds: number[]; reason?: string | null }
      | { type: 'reopen'; deadlineIds: number[]; reason?: string | null }
      | { type: 'reprioritize'; deadlineIds: number[]; priority: string }
      | { type: 'reassign'; deadlineIds: number[]; responsible: string }
      | { type: 'reschedule'; deadlineIds: number[]; dueDate: string };
  }) =>
    apiClient<{
      summary: { requested: number; updated: number; skipped: number; failed: number };
      items: Array<{ deadlineId: number; status: 'updated' | 'skipped' | 'failed'; reason?: string; deadline: ApiDeadline | null }>;
      auditEvents: Array<Record<string, unknown>>;
      agendaEvents: Array<Record<string, unknown>>;
      idempotency: { key: string; status: 'completed' | 'replayed'; replayed: boolean };
    }>('/deadlines/bulk-action', { method: 'POST', body: data }),
};
