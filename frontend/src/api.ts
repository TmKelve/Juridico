/**
 * API Client Configuration
 * 
 * Usage:
 * const response = await apiClient('/auth/login', {
 *   method: 'POST',
 *   body: { email, password }
 * })
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
type ApiBody = Record<string, unknown>;

export interface ApiUser {
  id: number;
  email: string;
  role: string;
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
  completedAt: string | null;
}

export interface ApiDocument {
  id: number;
  name: string;
  processId: number;
  processLabel: string;
  processTitle: string;
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
    const data = await response.json() as T & ErrorPayload;

    return {
      status: response.status,
      data,
      error: !response.ok ? data?.message || response.statusText : undefined,
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
    apiClient('/permissions'),

  getUsers: () =>
    apiClient<ApiUser[]>('/users'),

  getClients: () =>
    apiClient<ApiClient[]>('/clients'),

  getClient: (id: number) =>
    apiClient<ApiClient>(`/clients/${id}`),

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
};
