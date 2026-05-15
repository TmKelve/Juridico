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
    apiClient<unknown[]>(`/processes/${processId}/prazos`),

  createPrazo: (processId: number, data: { title: string; dueDate: string; priority?: string }) =>
    apiClient(`/processes/${processId}/prazos`, { method: 'POST', body: data }),

  getDocumentos: (processId: number) =>
    apiClient<unknown[]>(`/processes/${processId}/documentos`),

  createDocumento: (processId: number, data: { title: string; description: string }) =>
    apiClient(`/processes/${processId}/documentos`, { method: 'POST', body: data }),

  getAtendimentos: (processId: number) =>
    apiClient<unknown[]>(`/processes/${processId}/atendimentos`),

  createAtendimento: (processId: number, data: { title: string; description: string }) =>
    apiClient(`/processes/${processId}/atendimentos`, { method: 'POST', body: data }),
};
