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
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: ApiUser;
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

  createProcess: (data: { title: string; client: string; phase: string; status: string }) =>
    apiClient('/processes', {
      method: 'POST',
      body: data,
    }),

  updateProcess: (id: number, data: Partial<{ title: string; client: string; phase: string; status: string }>) =>
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
};
