import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileUp,
  Filter,
  FolderOpen,
  Grid3X3,
  List,
  MoreHorizontal,
  RefreshCw,
  Save,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { api } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import './Documents.css';

interface DocumentsProps {
  user: { id: number; email: string; role: string };
}

interface ProcessRecord {
  id: number;
  title: string;
  client: string;
  phase: string;
  status: string;
  ownerId: number;
  owner?: { id: number; email: string; role: string };
}

type DocumentStatus = 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
type ViewMode = 'lista' | 'grade';
type VersionFilter = 'todas' | 'mais_recente' | 'historicas';
type SortField = 'data' | 'versao' | 'status';
type SortDirection = 'asc' | 'desc';

type DocOrigin = 'upload' | 'cliente' | 'publicacao' | 'interno';
type DocCategory = 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';

interface DocumentItem {
  id: string;
  name: string;
  processId: number;
  processLabel: string;
  processTitle: string;
  client: string;
  category: DocCategory;
  status: DocumentStatus;
  version: number;
  isLatestVersion: boolean;
  origin: DocOrigin;
  uploadedAt: string;
  owner: string;
  notes: string;
  requiredChecklist: boolean;
  pendingForAdvance: boolean;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg' | 'application/octet-stream';
  previewUrl?: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  required: boolean;
  received: boolean;
  linkedDocumentId: string | null;
}

interface DocumentFilters {
  query: string;
  client: string;
  process: string;
  category: string;
  status: string;
  version: VersionFilter;
  origin: string;
  period: string;
  pendingOnly: boolean;
  requiredOnly: boolean;
}

const CATEGORIES: DocCategory[] = ['Peticao', 'Contrato', 'Prova', 'Financeiro', 'Checklist'];
const ORIGINS: DocOrigin[] = ['upload', 'cliente', 'publicacao', 'interno'];
const EMPTY_FILTERS: DocumentFilters = {
  query: '',
  client: '',
  process: '',
  category: '',
  status: '',
  version: 'todas',
  origin: '',
  period: '',
  pendingOnly: false,
  requiredOnly: false,
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function mapDocuments(processes: ProcessRecord[], userEmail: string) {
  const base = new Date();

  return processes.flatMap((process, index) => {
    const owner = process.owner?.email || userEmail;

    const primary: DocumentItem = {
      id: `doc-${process.id}-1`,
      name: `Peticao inicial - ${process.client}`,
      processId: process.id,
      processLabel: `#${process.id}`,
      processTitle: process.title,
      client: process.client,
      category: CATEGORIES[(process.id + index) % CATEGORIES.length],
      status: ((process.id + index) % 4 === 0 ? 'pendente' : (process.id + index) % 3 === 0 ? 'aguardando_validacao' : 'validado') as DocumentStatus,
      version: 2,
      isLatestVersion: true,
      origin: ORIGINS[(process.id + index) % ORIGINS.length],
      uploadedAt: toIsoDate(addDays(base, -((process.id + index) % 15))),
      owner,
      notes: 'Documento usado na fase atual e validado para audiencia.',
      requiredChecklist: true,
      pendingForAdvance: (process.id + index) % 5 === 0,
      mimeType: (process.id + index) % 2 === 0 ? 'application/pdf' : 'image/png',
      previewUrl: (process.id + index) % 2 === 0
        ? 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzIFszIDAgUl0vQ291bnQgMT4+CmVuZG9iagozIDAgb2JqCjw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDMwMCAxNDRdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQzPj5zdHJlYW0KQlQgL0YxIDEyIFRmIDUwIDEwMCBUZCAoUHJldmlldyBQREYpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjYgMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAowMDAwMDAwMjIxIDAwMDAwIG4gCjAwMDAwMDAzMTQgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgozOTYKJSVFT0Y='
        : '/lexora-logo.svg',
    };

    const historical: DocumentItem = {
      ...primary,
      id: `doc-${process.id}-0`,
      version: 1,
      isLatestVersion: false,
      uploadedAt: toIsoDate(addDays(base, -((process.id + index) % 20) - 10)),
      notes: 'Versao historica mantida para rastreabilidade.',
      status: 'validado',
      mimeType: 'application/octet-stream',
      previewUrl: undefined,
    };

    return [primary, historical];
  });
}

export function Documents({ user }: DocumentsProps) {
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [sortBy, setSortBy] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    { id: 'chk-1', title: 'Documento de identidade', required: true, received: false, linkedDocumentId: null },
    { id: 'chk-2', title: 'Comprovante de custas', required: true, received: false, linkedDocumentId: null },
    { id: 'chk-3', title: 'Procuração assinada', required: true, received: false, linkedDocumentId: null },
    { id: 'chk-4', title: 'Contrato social atualizado', required: false, received: false, linkedDocumentId: null },
  ]);

  const isAdv = user.role === 'ADV';
  const itemsPerPage = 10;

  useEffect(() => {
    trackPageView('documents', { role: user.role });
    loadDocuments();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, sortDirection]);

  async function loadDocuments() {
    setLoading(true);
    setError('');

    try {
      const res = await api.getProcesses();
      if (res.status !== 200 || !Array.isArray(res.data)) {
        setError(res.error || 'Nao foi possivel carregar documentos.');
        setLoading(false);
        return;
      }

      const scoped = isAdv
        ? (res.data as ProcessRecord[]).filter((process) => process.ownerId === user.id)
        : (res.data as ProcessRecord[]);

      const mapped = mapDocuments(scoped, user.email);
      setDocuments(mapped);
      trackEvent('documents_loaded', { count: mapped.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar documentos');
      captureException(err as Error, { context: 'loadDocuments' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_documents_saved_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function uploadDocumentMock() {
    setSuccess('Upload iniciado. Documento em processamento.');
  }

  function requestDocumentMock() {
    setSuccess('Solicitacao de documento enviada ao cliente.');
  }

  function exportCsv(items: DocumentItem[]) {
    const header = ['Documento', 'Cliente', 'Processo', 'Categoria', 'Status', 'Versao', 'Origem', 'Data'];
    const rows = items.map((item) => [
      item.name,
      item.client,
      item.processLabel,
      item.category,
      item.status,
      `v${item.version}`,
      item.origin,
      formatDate(item.uploadedAt),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'documentos-advogado.csv';
    link.click();
    URL.revokeObjectURL(url);

    trackEvent('documents_exported', { count: items.length });
  }

  function validateDocument(id: string) {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status: 'validado' } : doc)));
    setSuccess('Documento validado.');
    setOpenMenuId(null);
  }

  function rejectDocument(id: string) {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status: 'rejeitado' } : doc)));
    setSuccess('Documento rejeitado para ajuste.');
    setOpenMenuId(null);
  }

  function createNewVersion(id: string) {
    setDocuments((prev) => {
      const target = prev.find((doc) => doc.id === id);
      if (!target) return prev;

      const nextVersion = target.version + 1;
      const newDoc: DocumentItem = {
        ...target,
        id: `${target.processId}-${target.category.toLowerCase()}-v${nextVersion}-${Date.now()}`,
        version: nextVersion,
        isLatestVersion: true,
        status: 'aguardando_validacao',
        uploadedAt: toIsoDate(new Date()),
        notes: 'Nova versao criada para revisao.',
      };

      return prev.map((doc) => (doc.id === id ? { ...doc, isLatestVersion: false } : doc)).concat(newDoc);
    });

    setSuccess('Nova versao criada.');
    setOpenMenuId(null);
  }

  function toggleChecklistReceived(itemId: string) {
    setChecklist((prev) => prev.map((item) => (item.id === itemId ? { ...item, received: !item.received } : item)));
  }

  function linkChecklistDocument(itemId: string, documentId: string) {
    setChecklist((prev) => prev.map((item) => (item.id === itemId ? { ...item, linkedDocumentId: documentId || null } : item)));
  }

  const clients = useMemo(() => Array.from(new Set(documents.map((doc) => doc.client))), [documents]);
  const processes = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((doc) => map.set(String(doc.processId), `${doc.processLabel} · ${doc.processTitle}`));
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (filters.query) {
        const query = filters.query.toLowerCase();
        const source = `${doc.name} ${doc.client} ${doc.processTitle} ${doc.category} ${doc.notes}`.toLowerCase();
        if (!source.includes(query)) return false;
      }

      if (filters.client && doc.client !== filters.client) return false;
      if (filters.process && String(doc.processId) !== filters.process) return false;
      if (filters.category && doc.category !== filters.category) return false;
      if (filters.status && doc.status !== filters.status) return false;
      if (filters.origin && doc.origin !== filters.origin) return false;

      if (filters.version === 'mais_recente' && !doc.isLatestVersion) return false;
      if (filters.version === 'historicas' && doc.isLatestVersion) return false;
      if (filters.pendingOnly && doc.status !== 'pendente') return false;
      if (filters.requiredOnly && !doc.requiredChecklist) return false;

      if (filters.period) {
        const docDate = new Date(`${doc.uploadedAt}T00:00:00`);
        const now = new Date();
        const periodDays = Number(filters.period);
        const delta = Math.ceil((now.getTime() - docDate.getTime()) / (1000 * 60 * 60 * 24));
        if (!Number.isNaN(periodDays) && delta > periodDays) return false;
      }

      return true;
    });
  }, [documents, filters]);

  const sortedDocuments = useMemo(() => {
    const statusOrder: Record<DocumentStatus, number> = {
      pendente: 0,
      aguardando_validacao: 1,
      rejeitado: 2,
      validado: 3,
    };

    const sorted = [...filteredDocuments].sort((a, b) => {
      if (sortBy === 'data') {
        return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      if (sortBy === 'versao') {
        return a.version - b.version;
      }
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [filteredDocuments, sortBy, sortDirection]);

  const pageCount = Math.max(1, Math.ceil(sortedDocuments.length / itemsPerPage));
  const pagedDocuments = sortedDocuments.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const kpis = useMemo(() => {
    const now = new Date();

    return {
      total: documents.length,
      pending: documents.filter((doc) => doc.status === 'pendente').length,
      waitingValidation: documents.filter((doc) => doc.status === 'aguardando_validacao').length,
      recentSent: documents.filter((doc) => {
        const delta = Math.ceil((now.getTime() - new Date(`${doc.uploadedAt}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24));
        return delta <= 3;
      }).length,
      missingChecklist: checklist.filter((item) => item.required && !item.received).length,
    };
  }, [documents, checklist]);

  const hasActiveFilter = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters]
  );

  const emptyWithoutData = !loading && !error && documents.length === 0;
  const emptyWithFilter = !loading && !error && documents.length > 0 && sortedDocuments.length === 0;

  function statusBadge(status: DocumentStatus) {
    const labels: Record<DocumentStatus, string> = {
      pendente: 'Pendente',
      aguardando_validacao: 'Aguardando validacao',
      validado: 'Validado',
      rejeitado: 'Rejeitado',
    };

    return <span className={`doc-badge status-${status}`}>{labels[status]}</span>;
  }

  function renderPreview(doc: DocumentItem) {
    if ((doc.mimeType === 'application/pdf') && doc.previewUrl) {
      return <iframe title={`Preview ${doc.name}`} src={doc.previewUrl} className="doc-preview-frame" />;
    }

    if ((doc.mimeType === 'image/png' || doc.mimeType === 'image/jpeg') && doc.previewUrl) {
      return <img src={doc.previewUrl} alt={`Preview ${doc.name}`} className="doc-preview-image" />;
    }

    return (
      <div className="doc-preview-fallback" role="status">
        <FolderOpen size={24} aria-hidden="true" />
        <p>Preview indisponivel para este arquivo.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <section className="documents-page" aria-label="Documentos">
        <div className="documents-loading" role="status">
          <RefreshCw size={16} className="spin" aria-hidden="true" />
          <p>Carregando documentos...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="documents-page" aria-label="Documentos">
      <header className="documents-header-card">
        <div>
          <p className="documents-eyebrow">Gestao documental</p>
          <h2>Documentos</h2>
          <p className="documents-subtitle">
            Organize, valide e versione os documentos da sua carteira com rastreabilidade e foco operacional.
          </p>
        </div>
        <div className="documents-header-actions">
          <button className="btn-primary" onClick={uploadDocumentMock} aria-label="Upload de documento">
            <Upload size={16} aria-hidden="true" />
            Upload de Documento
          </button>
          <button className="btn-secondary" onClick={requestDocumentMock} aria-label="Solicitar documento">
            <FileUp size={16} aria-hidden="true" />
            Solicitar Documento
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sortedDocuments)} aria-label="Exportar documentos">
            <Download size={16} aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      <section className="documents-kpis" aria-label="Indicadores documentais">
        <article className="document-kpi-card"><p>Total de documentos</p><strong>{kpis.total}</strong></article>
        <article className="document-kpi-card warning"><p>Pendentes</p><strong>{kpis.pending}</strong></article>
        <article className="document-kpi-card info"><p>Aguardando validacao</p><strong>{kpis.waitingValidation}</strong></article>
        <article className="document-kpi-card success"><p>Enviados recentemente</p><strong>{kpis.recentSent}</strong></article>
        <article className="document-kpi-card danger"><p>Faltantes por checklist</p><strong>{kpis.missingChecklist}</strong></article>
      </section>

      {error && (
        <div className="documents-alert error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
          <button className="btn-ghost" onClick={loadDocuments}>Retry</button>
        </div>
      )}

      {success && (
        <div className="documents-alert success" role="status">
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>{success}</span>
        </div>
      )}

      <section className="documents-filters" aria-label="Busca e filtros de documentos">
        <div className="documents-filters-grid-top">
          <label className="documents-field search">
            <span>Busca</span>
            <div className="input-icon-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Nome, cliente, processo, categoria ou observacao"
              />
            </div>
          </label>

          <label className="documents-field">
            <span>Cliente</span>
            <select value={filters.client} onChange={(event) => updateFilter('client', event.target.value)}>
              <option value="">Todos</option>
              {clients.map((client) => <option key={client} value={client}>{client}</option>)}
            </select>
          </label>

          <label className="documents-field">
            <span>Processo</span>
            <select value={filters.process} onChange={(event) => updateFilter('process', event.target.value)}>
              <option value="">Todos</option>
              {processes.map((process) => <option key={process.id} value={process.id}>{process.label}</option>)}
            </select>
          </label>

          <label className="documents-field">
            <span>Categoria</span>
            <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">Todas</option>
              {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>

          <label className="documents-field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="aguardando_validacao">Aguardando validacao</option>
              <option value="validado">Validado</option>
              <option value="rejeitado">Rejeitado</option>
            </select>
          </label>
        </div>

        <div className="documents-filters-grid-bottom">
          <label className="documents-field">
            <span>Versao</span>
            <select value={filters.version} onChange={(event) => updateFilter('version', event.target.value as VersionFilter)}>
              <option value="todas">Todas</option>
              <option value="mais_recente">Mais recente</option>
              <option value="historicas">Historicas</option>
            </select>
          </label>

          <label className="documents-field">
            <span>Origem</span>
            <select value={filters.origin} onChange={(event) => updateFilter('origin', event.target.value)}>
              <option value="">Todas</option>
              {ORIGINS.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
            </select>
          </label>

          <label className="documents-field">
            <span>Periodo</span>
            <select value={filters.period} onChange={(event) => updateFilter('period', event.target.value)}>
              <option value="">Qualquer periodo</option>
              <option value="3">Ultimos 3 dias</option>
              <option value="7">Ultimos 7 dias</option>
              <option value="15">Ultimos 15 dias</option>
              <option value="30">Ultimos 30 dias</option>
            </select>
          </label>

          <label className="documents-checkline">
            <input
              type="checkbox"
              checked={filters.pendingOnly}
              onChange={(event) => updateFilter('pendingOnly', event.target.checked)}
            />
            Apenas pendentes
          </label>

          <label className="documents-checkline">
            <input
              type="checkbox"
              checked={filters.requiredOnly}
              onChange={(event) => updateFilter('requiredOnly', event.target.checked)}
            />
            Checklist obrigatorio
          </label>

          <label className="documents-field">
            <span>Ordenar por</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortField)}>
              <option value="data">Data</option>
              <option value="versao">Versao</option>
              <option value="status">Status</option>
            </select>
          </label>

          <label className="documents-field">
            <span>Direcao</span>
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </label>

          <div className="documents-filter-actions">
            <button className="btn-ghost" onClick={clearFilters}><Filter size={14} aria-hidden="true" />Limpar filtros</button>
            <button className="btn-ghost" onClick={saveFilters}><Save size={14} aria-hidden="true" />Salvar filtro</button>
            <button className="btn-ghost" onClick={() => setViewMode((prev) => (prev === 'lista' ? 'grade' : 'lista'))}>
              {viewMode === 'lista' ? <Grid3X3 size={14} aria-hidden="true" /> : <List size={14} aria-hidden="true" />}
              {viewMode === 'lista' ? 'Lista / Grade' : 'Grade / Lista'}
            </button>
          </div>
        </div>

        <div className="documents-filter-summary">
          <strong>{sortedDocuments.length}</strong> documento(s) na visualizacao atual.
          {hasActiveFilter && <span className="active-filter-chip">Filtro ativo</span>}
        </div>
      </section>

      <section className="documents-checklist-shell" aria-label="Checklist documental">
        <header>
          <h3>Checklist documental / documentos faltantes</h3>
          <span>{checklist.filter((item) => item.required && !item.received).length} faltante(s)</span>
        </header>
        <div className="documents-checklist-grid">
          {checklist.map((item) => (
            <article key={item.id} className={`checklist-item ${item.required ? 'required' : ''}`}>
              <div className="checklist-head">
                <label>
                  <input
                    type="checkbox"
                    checked={item.received}
                    onChange={() => toggleChecklistReceived(item.id)}
                  />
                  {item.title}
                </label>
                <span className={`checklist-state ${item.received ? 'ok' : 'pending'}`}>
                  {item.received ? 'Recebido' : 'Faltante'}
                </span>
              </div>
              <label className="checklist-link">
                Vincular documento
                <select
                  value={item.linkedDocumentId || ''}
                  onChange={(event) => linkChecklistDocument(item.id, event.target.value)}
                >
                  <option value="">Nao vinculado</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.name} ({doc.processLabel})</option>
                  ))}
                </select>
              </label>
            </article>
          ))}
        </div>
      </section>

      {emptyWithoutData && (
        <div className="documents-empty" role="status">
          <h3>Nenhum documento na carteira</h3>
          <p>Inicie enviando o primeiro documento para estruturar seu acervo processual.</p>
          <button className="btn-primary" onClick={uploadDocumentMock}>Upload de Documento</button>
        </div>
      )}

      {emptyWithFilter && (
        <div className="documents-empty" role="status">
          <h3>Nenhum documento encontrado com os filtros atuais</h3>
          <p>Ajuste os filtros para visualizar mais resultados.</p>
          <button className="btn-secondary" onClick={clearFilters}>Limpar filtros</button>
        </div>
      )}

      {!emptyWithoutData && !emptyWithFilter && viewMode === 'lista' && (
        <section className="documents-table-shell" aria-label="Tabela de documentos">
          <table className="documents-table">
            <thead>
              <tr>
                <th scope="col">Documento</th>
                <th scope="col">Cliente</th>
                <th scope="col">Processo</th>
                <th scope="col">Categoria</th>
                <th scope="col">Status</th>
                <th scope="col">Versao</th>
                <th scope="col">Origem</th>
                <th scope="col">Data</th>
                <th scope="col">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {pagedDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhe rapido do documento ${doc.name}`}
                  onClick={() => {
                    setSelectedDocument(doc);
                    setOpenMenuId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedDocument(doc);
                      setOpenMenuId(null);
                    }
                  }}
                >
                  <td>
                    <div className="doc-primary">
                      <strong>{doc.name}</strong>
                      <small>{doc.requiredChecklist ? 'Obrigatorio no checklist' : 'Opcional'}</small>
                    </div>
                  </td>
                  <td>{doc.client}</td>
                  <td>{doc.processLabel}</td>
                  <td>{doc.category}</td>
                  <td>{statusBadge(doc.status)}</td>
                  <td>
                    <span className={`doc-badge version ${doc.isLatestVersion ? 'latest' : 'history'}`}>
                      v{doc.version} {doc.isLatestVersion ? 'Atual' : 'Hist.'}
                    </span>
                  </td>
                  <td>{doc.origin}</td>
                  <td>{formatDate(doc.uploadedAt)}</td>
                  <td>
                    <div className="doc-row-actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        className="icon-action"
                        aria-label={`Abrir menu de acoes do documento ${doc.name}`}
                        onClick={() => setOpenMenuId((prev) => (prev === doc.id ? null : doc.id))}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                      {openMenuId === doc.id && (
                        <div className="doc-row-menu" role="menu" aria-label="Menu de acoes">
                          <button onClick={() => setSelectedDocument(doc)}>Detalhe rapido</button>
                          <button onClick={() => validateDocument(doc.id)}>Validar</button>
                          <button onClick={() => rejectDocument(doc.id)}>Rejeitar</button>
                          <button onClick={() => createNewVersion(doc.id)}>Versionar</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageCount > 1 && (
            <div className="documents-pagination">
              <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Anterior</button>
              <span>Pagina {page} de {pageCount}</span>
              <button className="btn-secondary" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}>Proxima</button>
            </div>
          )}
        </section>
      )}

      {!emptyWithoutData && !emptyWithFilter && viewMode === 'grade' && (
        <section className="documents-grid-shell" aria-label="Grade de documentos">
          {sortedDocuments.map((doc) => (
            <article key={doc.id} className="document-card">
              <button
                className="document-card-preview"
                onClick={() => setSelectedDocument(doc)}
                aria-label={`Abrir detalhe rapido de ${doc.name}`}
              >
                {doc.mimeType === 'application/pdf' ? <span className="preview-kind">PDF</span> : doc.mimeType.startsWith('image/') ? <span className="preview-kind">IMG</span> : <span className="preview-kind">ARQ</span>}
              </button>
              <div className="document-card-body">
                <strong>{doc.name}</strong>
                <small>{doc.processLabel} · {doc.client}</small>
                <div className="document-card-meta">
                  {statusBadge(doc.status)}
                  <span className={`doc-badge version ${doc.isLatestVersion ? 'latest' : 'history'}`}>v{doc.version}</span>
                </div>
                <p>{formatDate(doc.uploadedAt)}</p>
                <button className="btn-ghost" onClick={() => setSelectedDocument(doc)}>
                  <Eye size={14} aria-hidden="true" />
                  Abrir detalhe
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {selectedDocument && (
        <>
          <button className="documents-drawer-backdrop" onClick={() => setSelectedDocument(null)} aria-label="Fechar detalhe rapido" />
          <aside className="documents-drawer" role="dialog" aria-modal="true" aria-labelledby="documents-drawer-title">
            <header>
              <div>
                <small>Detalhe rapido</small>
                <h3 id="documents-drawer-title">{selectedDocument.name}</h3>
              </div>
              <button className="icon-action" onClick={() => setSelectedDocument(null)} aria-label="Fechar drawer">
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <div className="documents-drawer-body">
              <div className="doc-preview-shell">
                {renderPreview(selectedDocument)}
              </div>

              <dl className="documents-detail-list">
                <div><dt>Cliente</dt><dd>{selectedDocument.client}</dd></div>
                <div><dt>Processo</dt><dd>{selectedDocument.processLabel} · {selectedDocument.processTitle}</dd></div>
                <div><dt>Categoria</dt><dd>{selectedDocument.category}</dd></div>
                <div><dt>Status</dt><dd>{statusBadge(selectedDocument.status)}</dd></div>
                <div><dt>Versao</dt><dd>v{selectedDocument.version}</dd></div>
                <div><dt>Origem</dt><dd>{selectedDocument.origin}</dd></div>
                <div><dt>Data de upload</dt><dd>{formatDate(selectedDocument.uploadedAt)}</dd></div>
                <div><dt>Observacoes</dt><dd>{selectedDocument.notes}</dd></div>
              </dl>

              <div className="documents-drawer-actions">
                <button className="btn-primary"><Eye size={14} aria-hidden="true" />Visualizar</button>
                <button className="btn-secondary"><Download size={14} aria-hidden="true" />Baixar</button>
                <button className="btn-secondary" onClick={() => validateDocument(selectedDocument.id)}>Validar</button>
                <button className="btn-secondary" onClick={() => rejectDocument(selectedDocument.id)}>Rejeitar</button>
                <button className="btn-secondary" onClick={() => createNewVersion(selectedDocument.id)}>Versionar</button>
                <button className="btn-secondary" onClick={() => navigate(`/processos/${selectedDocument.processId}`)}>Abrir processo</button>
                <button className="btn-secondary" onClick={requestDocumentMock}>Solicitar reenvio</button>
              </div>
            </div>
          </aside>
        </>
      )}
    </section>
  );
}
