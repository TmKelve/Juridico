import React, { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
  Save,
  Search,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { api, type ApiDocument, type ApiProcess } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessDocumentModal } from './ProcessDocumentModal';
import { deriveArea } from './checklistTemplates';
import './Dashboard.css';
import './Documents.css';

interface DocumentsProps {
  user: { id: number; email: string; role: string };
}

type DocumentStatus = 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
type ViewMode = 'lista' | 'grade';
type VersionFilter = 'todas' | 'mais_recente' | 'historicas';
type SortField = 'data' | 'versao' | 'status';
type SortDirection = 'asc' | 'desc';

type DocOrigin = 'upload' | 'cliente' | 'publicacao' | 'interno';
type DocCategory = 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';

type DocumentItem = ApiDocument;

interface ChecklistTemplateItem {
  id: string;
  title: string;
  required: boolean;   // obrigatório para o processo
  blocking: boolean;   // bloqueia andamento sem ele
  category: DocCategory;
}

interface ChecklistItem extends ChecklistTemplateItem {
  status: 'faltante' | 'aguardando_validacao' | 'validado' | 'rejeitado';
  linkedDocumentId: number | null;
}

// ── TEMPLATES POR ÁREA ─────────────────────────────────────────────────────
const CHECKLIST_TEMPLATES: Record<string, ChecklistTemplateItem[]> = {
  Trabalhista: [
    { id: 'trb-1', title: 'Procuração assinada',            required: true,  blocking: true,  category: 'Contrato'    },
    { id: 'trb-2', title: 'Documento de identidade (RG/CPF)', required: true, blocking: true,  category: 'Checklist'   },
    { id: 'trb-3', title: 'Carteira de Trabalho (CTPS)',    required: true,  blocking: false, category: 'Prova'       },
    { id: 'trb-4', title: 'Contrato de trabalho / rescisão',required: true,  blocking: false, category: 'Contrato'    },
    { id: 'trb-5', title: 'Holerites (últimos 3 meses)',    required: true,  blocking: false, category: 'Prova'       },
    { id: 'trb-6', title: 'Comprovante de residência',      required: false, blocking: false, category: 'Checklist'   },
    { id: 'trb-7', title: 'Termo de rescisão / TRCT',       required: false, blocking: false, category: 'Contrato'    },
  ],
  Civel: [
    { id: 'civ-1', title: 'Procuração assinada',            required: true,  blocking: true,  category: 'Contrato'    },
    { id: 'civ-2', title: 'Documento de identidade (RG/CPF)', required: true, blocking: true,  category: 'Checklist'   },
    { id: 'civ-3', title: 'Contrato ou documento base da ação', required: true, blocking: false, category: 'Contrato'  },
    { id: 'civ-4', title: 'Comprovante de dano / prova dos fatos', required: true, blocking: false, category: 'Prova'  },
    { id: 'civ-5', title: 'Comprovante de residência',      required: false, blocking: false, category: 'Checklist'   },
    { id: 'civ-6', title: 'Laudos / perícias (se aplicável)', required: false, blocking: false, category: 'Prova'     },
  ],
  Tributario: [
    { id: 'tri-1', title: 'Procuração assinada',            required: true,  blocking: true,  category: 'Contrato'    },
    { id: 'tri-2', title: 'CNPJ / Contrato social',         required: true,  blocking: true,  category: 'Checklist'   },
    { id: 'tri-3', title: 'Certidão de débitos (CND/PGFN)',  required: true,  blocking: false, category: 'Checklist'   },
    { id: 'tri-4', title: 'Guias de recolhimento contestadas', required: true, blocking: false, category: 'Financeiro' },
    { id: 'tri-5', title: 'Balanço / DRE (último exercício)',required: false, blocking: false, category: 'Financeiro'  },
    { id: 'tri-6', title: 'Declarações fiscais (SPED/ECF)',  required: false, blocking: false, category: 'Financeiro'  },
  ],
  Empresarial: [
    { id: 'emp-1', title: 'Procuração / ata de representação', required: true, blocking: true,  category: 'Contrato'  },
    { id: 'emp-2', title: 'Contrato social consolidado',     required: true,  blocking: true,  category: 'Contrato'    },
    { id: 'emp-3', title: 'CNPJ atualizado',                 required: true,  blocking: false, category: 'Checklist'   },
    { id: 'emp-4', title: 'Certidão de registro na Junta',   required: true,  blocking: false, category: 'Checklist'   },
    { id: 'emp-5', title: 'Documento base do litígio',       required: true,  blocking: false, category: 'Prova'       },
    { id: 'emp-6', title: 'Atas societárias relevantes',     required: false, blocking: false, category: 'Contrato'    },
  ],
  Previdenciario: [
    { id: 'prv-1', title: 'Procuração assinada',             required: true,  blocking: true,  category: 'Contrato'   },
    { id: 'prv-2', title: 'Documento de identidade (RG/CPF)', required: true, blocking: true,  category: 'Checklist'  },
    { id: 'prv-3', title: 'Extrato CNIS',                    required: true,  blocking: true,  category: 'Prova'      },
    { id: 'prv-4', title: 'Laudos médicos (se incapacidade)', required: true, blocking: false, category: 'Prova'      },
    { id: 'prv-5', title: 'Carteira de trabalho (CTPS)',     required: true,  blocking: false, category: 'Prova'      },
    { id: 'prv-6', title: 'Declaração de IR (últimos 2 anos)', required: false, blocking: false, category: 'Financeiro'},
    { id: 'prv-7', title: 'Comprovante de residência',       required: false, blocking: false, category: 'Checklist'  },
  ],
  _default: [
    { id: 'def-1', title: 'Procuração assinada',             required: true,  blocking: true,  category: 'Contrato'   },
    { id: 'def-2', title: 'Documento de identidade (RG/CPF)', required: true, blocking: true,  category: 'Checklist'  },
    { id: 'def-3', title: 'Documentos da causa',             required: true,  blocking: false, category: 'Prova'      },
  ],
};

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

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

export function Documents({ user }: DocumentsProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [processesList, setProcessesList] = useState<ApiProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [sortBy, setSortBy] = useState<SortField>('data');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedDocument, setSelectedDocument] = useState<DocumentItem | null>(null);
  const [selectedProcessForModal, setSelectedProcessForModal] = useState<ApiProcess | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [checklistStateByProcess, setChecklistStateByProcess] = useState<Record<string, ChecklistItem[]>>({});
  const checklistUploadRef = useRef<HTMLInputElement | null>(null);
  // Stores the full item + processId so handleChecklistItemUpload doesn't need to re-derive it
  const [pendingChecklistUpload, setPendingChecklistUpload] = useState<{ processId: number; item: ChecklistItem } | null>(null);

  const itemsPerPage = 10;
  const loadDocumentsOnMount = useEffectEvent(loadDocuments);

  useEffect(() => {
    trackPageView('documents', { role: user.role });
    loadDocumentsOnMount();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, sortBy, sortDirection]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q')?.trim() ?? '';
    const client = params.get('client')?.trim() ?? '';
    const processId = params.get('processId')?.trim() ?? '';
    if (!query && !client && !processId) return;

    setFilters((prev) => ({
      ...prev,
      query: query || prev.query,
      client: client || prev.client,
      process: processId || prev.process,
    }));
  }, [location.search]);

  async function loadDocuments() {
    setLoading(true);
    setError('');

    try {
      const [docRes, procRes] = await Promise.all([
        api.getDocuments(),
        api.getProcesses()
      ]);

      if (docRes.status !== 200 || !Array.isArray(docRes.data)) {
        setError(docRes.error || 'Nao foi possivel carregar documentos.');
        setLoading(false);
        return;
      }

      if (procRes.status !== 200 || !Array.isArray(procRes.data)) {
        setError(procRes.error || 'Nao foi possivel carregar processos.');
        setLoading(false);
        return;
      }

      const loadedDocuments = docRes.data as ApiDocument[];
      const loadedProcesses = procRes.data as ApiProcess[];
      
      setDocuments(loadedDocuments);
      setProcessesList(loadedProcesses);
      trackEvent('documents_loaded', { count: loadedDocuments.length, role: user.role });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar documentos e processos');
      captureException(err as Error, { context: 'loadDocuments' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof DocumentFilters>(key: K, value: DocumentFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function removeFilterChip(key: keyof DocumentFilters) {
    updateFilter(key as never, EMPTY_FILTERS[key] as never);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_documents_saved_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  function resolveUploadProcessId() {
    if (selectedDocument?.processId) return selectedDocument.processId;
    if (filters.process) return Number(filters.process);
    const uniqueProcesses = new Set(filteredDocuments.map(d => d.processId));
    if (uniqueProcesses.size === 1) return Array.from(uniqueProcesses)[0];
    return null;
  }

  function uploadDocumentMock() {
    const processId = resolveUploadProcessId();
    if (!processId) {
      setError('Selecione um documento, um processo no filtro ou deixe apenas um processo no recorte antes do upload.');
      return;
    }

    uploadInputRef.current?.click();
  }

  async function handleUploadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const processId = resolveUploadProcessId();
    if (!processId) {
      setError('Não foi possível identificar o processo do upload.');
      return;
    }

    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo.'));
      reader.readAsDataURL(file);
    });

    const res = await api.createDocument({
      title: file.name,
      processId,
      category: 'Checklist',
      status: 'pendente',
      origin: 'upload',
      notes: `Upload real via painel documental em ${new Date().toLocaleString('pt-BR')}.`,
      mimeType: (file.type as DocumentItem['mimeType']) || 'application/octet-stream',
      metadata: {
        fileName: file.name,
        documentType: 'procuracao',
        proceduralType: 'default',
        tags: ['upload-real', 'epic-g'],
      },
      file: {
        fileName: file.name,
        contentBase64,
        mimeType: file.type || 'application/octet-stream',
        sizeInBytes: file.size,
      },
    });

    if (res.status !== 201 || !res.data) {
      setError(res.error || 'Nao foi possivel concluir o upload.');
      return;
    }

    setDocuments((prev) => [res.data!, ...prev]);
    setSelectedDocument(res.data);
    setSuccess('Upload concluído com persistência real.');
    trackEvent('documents_uploaded', { processId, mimeType: file.type || 'application/octet-stream' });
  }

  function requestDocumentMock() {
    if (!selectedDocument) {
      setSuccess('Abra um documento para encaminhar a solicitação de reenvio.');
      return;
    }

    if (selectedDocument.clientId) {
      navigate(`/clientes?clientId=${selectedDocument.clientId}`);
      setSuccess('Abrindo o cliente vinculado para registrar a comunicação.');
      return;
    }

    setSuccess('Documento sem clientId no payload atual. Use a carteira de clientes para registrar a solicitação.');
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

  async function validateDocument(id: number) {
    const res = await api.updateDocument(id, { status: 'validado' });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Nao foi possivel validar o documento.');
      return;
    }

    setDocuments((prev) => prev.map((doc) => (doc.id === id ? res.data : doc)));
    setSelectedDocument((prev) => (prev?.id === id ? res.data : prev));
    setSuccess('Documento validado.');
    setOpenMenuId(null);
  }

  async function rejectDocument(id: number) {
    const res = await api.updateDocument(id, { status: 'rejeitado' });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Nao foi possivel rejeitar o documento.');
      return;
    }

    setDocuments((prev) => prev.map((doc) => (doc.id === id ? res.data : doc)));
    setSelectedDocument((prev) => (prev?.id === id ? res.data : prev));
    setSuccess('Documento rejeitado para ajuste.');
    setOpenMenuId(null);
  }

  async function createNewVersion(id: number) {
    const target = documents.find((doc) => doc.id === id);
    if (!target) return;

    const res = await api.updateDocument(id, {
      createNewVersion: true,
      status: 'aguardando_validacao',
      notes: 'Nova versao criada para revisao.',
    });
    if (res.status !== 200 || !res.data) {
      setError(res.error || 'Nao foi possivel criar nova versao.');
      return;
    }

    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, isLatestVersion: false } : doc)).concat(res.data));
    setSelectedDocument(res.data);
    setSuccess('Nova versao criada.');
    setOpenMenuId(null);
  }

  // ── CHECKLIST HELPERS ──────────────────────────────────────────────────────

  async function handleChecklistItemUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !pendingChecklistUpload) return;

    const { processId, item } = pendingChecklistUpload;

    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        resolve(result.includes(',') ? result.split(',')[1] ?? '' : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler arquivo.'));
      reader.readAsDataURL(file);
    });

    const res = await api.createDocument({
      title: item.title,
      processId,
      category: item.category,
      status: 'aguardando_validacao',
      origin: 'upload',
      notes: `Checklist: ${item.title} — upload por ${user.email}`,
      mimeType: (file.type as DocumentItem['mimeType']) || 'application/octet-stream',
      metadata: {
        fileName: file.name,
        documentType: item.id,
        proceduralType: 'checklist',
        tags: ['checklist', item.id],
      },
      file: {
        fileName: file.name,
        contentBase64,
        mimeType: file.type || 'application/octet-stream',
        sizeInBytes: file.size,
      },
    });

    if (res.status !== 201 || !res.data) {
      setError(res.error || 'Não foi possível fazer upload do documento de checklist.');
      setPendingChecklistUpload(null);
      return;
    }

    setDocuments((prev) => [res.data!, ...prev]);
    setChecklistStateByProcess((prev) => {
      const procIdStr = String(processId);
      const currentList = prev[procIdStr] ?? [];
      const updatedItem: ChecklistItem = {
        ...item,
        status: 'aguardando_validacao',
        linkedDocumentId: res.data!.id,
      };
      const idx = currentList.findIndex((i) => i.id === item.id);
      if (idx >= 0) {
        const newList = [...currentList];
        newList[idx] = updatedItem;
        return { ...prev, [procIdStr]: newList };
      }
      return { ...prev, [procIdStr]: [...currentList, updatedItem] };
    });
    setSuccess(`"${item.title}" enviado para validação.`);
    setPendingChecklistUpload(null);
    trackEvent('checklist_item_uploaded', { processId, itemId: item.id });
  }

  const clients = useMemo(() => Array.from(new Set(documents.map((doc) => doc.client))), [documents]);
  const processes = useMemo(() => {
    const map = new Map<string, { label: string; area: string }>();
    const areaMap: Record<string, string> = {
      TRB: 'Trabalhista',
      CIV: 'Civel',
      TRI: 'Tributario',
      EMP: 'Empresarial',
      PRV: 'Previdenciario',
    };
    documents.forEach((doc) => {
      if (!map.has(String(doc.processId))) {
        const prefix = doc.processLabel.split('-')[0]?.toUpperCase() ?? '';
        map.set(String(doc.processId), {
          label: `${doc.processLabel} · ${doc.processTitle}`,
          area: areaMap[prefix] ?? '_default',
        });
      }
    });
    return Array.from(map.entries()).map(([id, { label, area }]) => ({ id, label, area }));
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

  const groupedProcesses = useMemo(() => {
    const map = new Map<number, { process: ApiProcess | undefined; docs: DocumentItem[] }>();
    processesList.forEach((p) => map.set(p.id, { process: p, docs: [] }));
    sortedDocuments.forEach((doc) => {
      if (!map.has(doc.processId)) map.set(doc.processId, { process: undefined, docs: [] });
      map.get(doc.processId)!.docs.push(doc);
    });
    return Array.from(map.values()).filter((g) => {
      if (g.docs.length > 0) return true;
      if (filters.process && String(g.process?.id) === filters.process) return true;
      if (!filters.query && !filters.process && !filters.status && !filters.pendingOnly && !filters.requiredOnly) return true;
      return false;
    });
  }, [processesList, sortedDocuments, filters]);

  const pageCount = Math.max(1, Math.ceil(groupedProcesses.length / itemsPerPage));
  const pagedGroups = groupedProcesses.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const activeChecklistProcess = useMemo(
    () => (filters.process ? processes.find((process) => process.id === filters.process) ?? null : null),
    [filters.process, processes],
  );
  const scopedChecklistDocuments = useMemo(
    () => (filters.process ? documents.filter((doc) => String(doc.processId) === filters.process) : []),
    [documents, filters.process],
  );
  const activeChecklist = useMemo((): ChecklistItem[] => {
    if (!activeChecklistProcess) return [];
    const area = activeChecklistProcess.area ?? '_default';
    const template = CHECKLIST_TEMPLATES[area as keyof typeof CHECKLIST_TEMPLATES] ?? CHECKLIST_TEMPLATES._default;
    const saved = checklistStateByProcess[activeChecklistProcess.id];
    if (saved) return saved;
    // Derive initial state from template + auto-match against validated docs in scope
    return template.map((tpl) => {
      const linkedDoc = scopedChecklistDocuments.find(
        (d) =>
          d.requiredChecklist &&
          d.status === 'validado' &&
          tpl.title
            .toLowerCase()
            .split(' ')
            .slice(0, 3)
            .some((word) => word.length > 4 && d.name.toLowerCase().includes(word)),
      );
      return {
        ...tpl,
        status: linkedDoc ? ('validado' as const) : ('faltante' as const),
        linkedDocumentId: linkedDoc?.id ?? null,
      };
    });
  }, [activeChecklistProcess, checklistStateByProcess, scopedChecklistDocuments]);
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
      missingChecklist: activeChecklistProcess ? activeChecklist.filter((item) => item.required && item.status === 'faltante').length : 0,
    };
  }, [activeChecklistProcess, documents, activeChecklist]);

  const hasActiveFilter = useMemo(
    () => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS),
    [filters]
  );
  const activeFilterChips = useMemo(() => {
    const chips: Array<{ key: keyof DocumentFilters; label: string }> = [];
    if (filters.query) chips.push({ key: 'query', label: `Busca: ${filters.query}` });
    if (filters.client) chips.push({ key: 'client', label: `Cliente: ${filters.client}` });
    if (filters.process) chips.push({ key: 'process', label: `Processo: ${filters.process}` });
    if (filters.category) chips.push({ key: 'category', label: `Categoria: ${filters.category}` });
    if (filters.status) chips.push({ key: 'status', label: `Status: ${filters.status}` });
    if (filters.origin) chips.push({ key: 'origin', label: `Origem: ${filters.origin}` });
    if (filters.period) chips.push({ key: 'period', label: `Período: ${filters.period}d` });
    if (filters.version !== 'todas') chips.push({ key: 'version', label: `Versão: ${filters.version}` });
    if (filters.pendingOnly) chips.push({ key: 'pendingOnly', label: 'Apenas pendentes' });
    if (filters.requiredOnly) chips.push({ key: 'requiredOnly', label: 'Checklist obrigatório' });
    return chips;
  }, [filters]);

  const emptyWithoutData = !loading && !error && documents.length === 0;
  const emptyWithFilter = !loading && !error && documents.length > 0 && sortedDocuments.length === 0;
  const visiblePendingCount = sortedDocuments.filter((doc) => doc.status === 'pendente').length;
  const visibleValidationCount = sortedDocuments.filter((doc) => doc.status === 'aguardando_validacao').length;
  const visibleChecklistGapCount = activeChecklistProcess
    ? activeChecklist.filter((item) => item.required && item.status === 'faltante').length
    : 0;
  const focusDocument = sortedDocuments.find((doc) => doc.status === 'pendente')
    ?? sortedDocuments.find((doc) => doc.status === 'aguardando_validacao')
    ?? sortedDocuments[0]
    ?? null;
  const focusTone = focusDocument?.status === 'pendente'
    ? 'warning'
    : focusDocument?.status === 'aguardando_validacao'
      ? 'info'
      : 'neutral';
  const headerSummaryItems = [
    { label: 'Em exibição', value: sortedDocuments.length, tone: 'neutral' },
    { label: 'Pendentes', value: visiblePendingCount, tone: visiblePendingCount > 0 ? 'warning' : 'neutral' },
    { label: 'Em validação', value: visibleValidationCount, tone: visibleValidationCount > 0 ? 'info' : 'neutral' },
    { label: 'Checklist aberto', value: visibleChecklistGapCount, tone: visibleChecklistGapCount > 0 ? 'danger' : 'neutral' },
  ] as const;

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
      <input
        ref={uploadInputRef}
        type="file"
        hidden
        onChange={handleUploadFile}
        aria-hidden="true"
      />
      <input
        ref={checklistUploadRef}
        type="file"
        hidden
        onChange={handleChecklistItemUpload}
        aria-hidden="true"
      />
      {/* ── HERO ── */}
      <header className="documents-header-card">
        <div className="documents-header-main">
          <p className="documents-eyebrow">Gestão Documental</p>
          <h2>Documentos</h2>
          <p className="documents-subtitle">
            Organize, valide e versione os documentos da sua carteira com rastreabilidade e foco operacional.
          </p>
        </div>
        <div className="documents-header-actions">
          <button className="btn-primary" onClick={uploadDocumentMock} aria-label="Upload de documento">
            <Upload size={15} aria-hidden="true" />
            Upload
          </button>
          <button className="btn-secondary" onClick={requestDocumentMock} aria-label="Solicitar documento">
            <FileUp size={15} aria-hidden="true" />
            Solicitar
          </button>
          <button className="btn-secondary" onClick={() => exportCsv(sortedDocuments)} aria-label="Exportar documentos">
            <Download size={15} aria-hidden="true" />
            Exportar
          </button>
        </div>
      </header>

      {/* ── KPI STRIP ── */}
      <section className="documents-kpis" aria-label="Indicadores documentais">
        <button
          type="button"
          className="metric-card"
          data-kpi-color="primary"
          onClick={() => updateFilter('status', '')}
          aria-label={`Total de documentos: ${kpis.total}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.total}</p>
            <div className="metric-icon" aria-hidden="true"><FolderOpen size={16} /></div>
          </div>
          <p className="metric-label">Total</p>
          <p className="metric-microtext">Documentos na carteira</p>
        </button>

        <button
          type="button"
          className="metric-card"
          data-kpi-color="warning"
          onClick={() => updateFilter('status', 'pendente')}
          aria-label={`Pendentes: ${kpis.pending}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.pending}</p>
            <div className="metric-icon" aria-hidden="true"><AlertTriangle size={16} /></div>
          </div>
          <p className="metric-label">Pendentes</p>
          <p className="metric-microtext">Aguardam ação</p>
        </button>

        <button
          type="button"
          className="metric-card"
          data-kpi-color="info"
          onClick={() => updateFilter('status', 'aguardando_validacao')}
          aria-label={`Aguardando validação: ${kpis.waitingValidation}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : kpis.waitingValidation}</p>
            <div className="metric-icon" aria-hidden="true"><Eye size={16} /></div>
          </div>
          <p className="metric-label">Aguardando validação</p>
          <p className="metric-microtext">Na fila de revisão</p>
        </button>

        <button
          type="button"
          className="metric-card"
          data-kpi-color={kpis.missingChecklist > 0 ? 'error' : 'success'}
          onClick={() => updateFilter('requiredOnly', !filters.requiredOnly)}
          aria-label={`Checklist no contexto: ${activeChecklistProcess ? kpis.missingChecklist : '—'}`}
        >
          <div className="metric-top-row">
            <p className="metric-value">{loading ? '—' : activeChecklistProcess ? kpis.missingChecklist : '—'}</p>
            <div className="metric-icon" aria-hidden="true"><CheckCircle2 size={16} /></div>
          </div>
          <p className="metric-label">Checklist no contexto</p>
          <p className="metric-microtext">{activeChecklistProcess ? 'Itens faltando no processo' : 'Filtre um processo'}</p>
        </button>
      </section>

      {/* ── PRÓXIMA MELHOR AÇÃO (contextual strip) ── */}
      {focusDocument && (
        <div className="documents-focus-strip" data-tone={focusTone} aria-label="Próxima melhor ação">
          <div className="documents-focus-strip-icon">
            <Zap size={14} aria-hidden="true" />
          </div>
          <div className="documents-focus-strip-body">
            <span className="documents-focus-strip-eyebrow">Próxima melhor ação</span>
            <strong>{focusDocument.name}</strong>
            <p>{focusDocument.processTitle} · {focusDocument.client} · v{focusDocument.version} · {formatDate(focusDocument.uploadedAt)}</p>
          </div>
          <button className="btn-secondary documents-focus-strip-cta" onClick={() => setSelectedDocument(focusDocument)}>
            Ver documento
          </button>
        </div>
      )}

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

        {/* ── ROW 1: busca ── */}
        <div className="documents-search-row">
          <div className="documents-search-wrap">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => updateFilter('query', event.target.value)}
              placeholder="Buscar por nome, cliente, processo ou observação…"
            />
          </div>
        </div>

        {/* ── ROW 2: chips de status + dropdowns + ações ── */}
        <div className="documents-filter-row">
          <div className="documents-status-chips">
            <button
              className={`doc-status-chip ${filters.status === '' ? 'is-active' : ''}`}
              onClick={() => updateFilter('status', '')}
            >
              Todos
              <span className="doc-status-chip-badge">{kpis.total}</span>
            </button>
            <button
              className={`doc-status-chip doc-status-chip--warning ${filters.status === 'pendente' ? 'is-active' : ''}`}
              onClick={() => updateFilter('status', 'pendente')}
            >
              Pendentes
              {kpis.pending > 0 && <span className="doc-status-chip-badge">{kpis.pending}</span>}
            </button>
            <button
              className={`doc-status-chip doc-status-chip--info ${filters.status === 'aguardando_validacao' ? 'is-active' : ''}`}
              onClick={() => updateFilter('status', 'aguardando_validacao')}
            >
              Em validação
              {kpis.waitingValidation > 0 && <span className="doc-status-chip-badge">{kpis.waitingValidation}</span>}
            </button>
            <button
              className={`doc-status-chip doc-status-chip--success ${filters.status === 'validado' ? 'is-active' : ''}`}
              onClick={() => updateFilter('status', 'validado')}
            >
              Validados
            </button>
          </div>

          <div className="documents-filter-dropdowns">
            <select value={filters.client} onChange={(event) => updateFilter('client', event.target.value)}>
              <option value="">Cliente</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filters.process} onChange={(event) => updateFilter('process', event.target.value)}>
              <option value="">Processo</option>
              {processes.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select value={filters.category} onChange={(event) => updateFilter('category', event.target.value)}>
              <option value="">Categoria</option>
              {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="documents-filter-tools">
            <button className="btn-ghost" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
              <Filter size={13} aria-hidden="true" />
              {showAdvancedFilters ? 'Menos' : 'Avançado'}
              {showAdvancedFilters ? <ChevronUp size={13} aria-hidden="true" /> : <ChevronDown size={13} aria-hidden="true" />}
            </button>
            {hasActiveFilter && (
              <button className="btn-ghost" onClick={clearFilters}>
                <X size={13} aria-hidden="true" />
                Limpar
              </button>
            )}
            <button className="btn-ghost" onClick={saveFilters}><Save size={13} aria-hidden="true" /></button>
            <button className="btn-ghost" onClick={() => setViewMode((prev) => (prev === 'lista' ? 'grade' : 'lista'))}>
              {viewMode === 'lista' ? <Grid3X3 size={13} aria-hidden="true" /> : <List size={13} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {showAdvancedFilters ? (
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
          </div>
        ) : null}

        {activeFilterChips.length > 0 ? (
          <div className="documents-active-filters">
            {activeFilterChips.map((chip) => (
              <button key={`${chip.key}-${chip.label}`} type="button" className="active-filter-chip active-filter-chip--dismiss" onClick={() => removeFilterChip(chip.key)}>
                {chip.label}
                <X size={12} aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}

        <div className="documents-filter-summary">
          <strong>{sortedDocuments.length}</strong> documento(s) na visualizacao atual.
          {hasActiveFilter && <span className="active-filter-chip">Filtro ativo</span>}
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
                <th scope="col">Data</th>
                <th scope="col" className="col-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagedGroups.map(({ process, docs }) => (
                <React.Fragment key={process?.id || docs[0]?.processId || Math.random()}>
                  {process && (
                    <tr
                      className="documents-process-row"
                      role="button"
                      tabIndex={0}
                      aria-label={`Abrir dossiê do processo ${process.title}`}
                      onClick={() => setSelectedProcessForModal(process)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedProcessForModal(process);
                        }
                      }}
                    >
                      <td colSpan={7}>
                        <div className="doc-process-header">
                          <FolderOpen size={16} aria-hidden="true" />
                          <strong>{process.processNumber || `PRC-${process.id}`} · {process.title}</strong>
                          <span className="doc-badge phase-badge">Fase: {process.phase}</span>
                          <span className="doc-badge count-badge">{docs.length} docs</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {docs.map((doc) => (
                    <tr
                      key={String(doc.id)}
                      className="documents-child-row"
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
                          <div className="doc-child-connector" aria-hidden="true" />
                          <strong>{doc.name}</strong>
                          <div className="doc-primary-meta">
                            <span className={`doc-badge version ${doc.isLatestVersion ? 'latest' : 'history'}`}>
                              v{doc.version}{doc.isLatestVersion ? ' · atual' : ''}
                            </span>
                            <span className="doc-origin-tag">{doc.origin}</span>
                            {doc.requiredChecklist && <span className="doc-required-tag">Obrigatório</span>}
                          </div>
                        </div>
                      </td>
                      <td>{doc.client}</td>
                      <td>{doc.processLabel}</td>
                      <td>{doc.category}</td>
                      <td>{statusBadge(doc.status)}</td>
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
                              <button onClick={() => void validateDocument(doc.id)}>Validar</button>
                              <button onClick={() => void rejectDocument(doc.id)}>Rejeitar</button>
                              <button onClick={() => void createNewVersion(doc.id)}>Versionar</button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="documents-mobile-list" aria-label="Lista mobile de documentos">
            {pagedGroups.map(({ process, docs }) => (
              <React.Fragment key={process?.id || docs[0]?.processId || Math.random()}>
                {process && (
                  <article className="document-mobile-card process-group-card" onClick={() => setSelectedProcessForModal(process)}>
                    <div className="process-group-header">
                      <FolderOpen size={16} aria-hidden="true" />
                      <strong>{process.processNumber || `PRC-${process.id}`}</strong>
                      <span>{process.title}</span>
                    </div>
                    <div className="process-group-meta">
                      <span className="doc-badge phase-badge">{process.phase}</span>
                      <span className="doc-badge count-badge">{docs.length} docs</span>
                    </div>
                  </article>
                )}
                {docs.map((doc) => (
                  <article key={`mobile-${doc.id}`} className="document-mobile-card document-child-card">
                    <button
                      type="button"
                      className="document-mobile-main"
                      onClick={() => {
                        setSelectedDocument(doc);
                        setOpenMenuId(null);
                      }}
                      aria-label={`Abrir detalhe do documento ${doc.name}`}
                    >
                      <div className="doc-child-connector-mobile" aria-hidden="true" />
                      <strong>{doc.name}</strong>
                      <span>{doc.client}</span>
                    </button>
                    <div className="document-mobile-badges">
                      {statusBadge(doc.status)}
                      <span className={`doc-badge version ${doc.isLatestVersion ? 'latest' : 'history'}`}>
                        {doc.isLatestVersion ? 'Versão atual' : `v${doc.version}`}
                      </span>
                    </div>
                    <div className="document-mobile-actions">
                      <button className="btn-primary" onClick={() => setSelectedDocument(doc)}>
                        <Eye size={14} aria-hidden="true" /> Detalhe
                      </button>
                    </div>
                  </article>
                ))}
              </React.Fragment>
            ))}
          </div>

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
            <article key={String(doc.id)} className="document-card">
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
                <div><dt>Aprovacao</dt><dd>{selectedDocument.approval?.decision ? `${selectedDocument.approval.decision} · ${selectedDocument.approval.reason || 'sem motivo'}` : 'Sem decisão formal'}</dd></div>
                <div><dt>Vinculos</dt><dd>{selectedDocument.links?.length ? selectedDocument.links.map((link) => `${link.entityType} #${link.entityId}`).join(', ') : 'Sem vínculos adicionais'}</dd></div>
              </dl>

              <div className="documents-drawer-actions">
                <button className="btn-primary"><Eye size={14} aria-hidden="true" />Visualizar</button>
                <button className="btn-secondary"><Download size={14} aria-hidden="true" />Baixar</button>
                <button className="btn-secondary" onClick={() => void validateDocument(selectedDocument.id)}>Validar</button>
                <button className="btn-secondary" onClick={() => void rejectDocument(selectedDocument.id)}>Rejeitar</button>
                <button className="btn-secondary" onClick={() => void createNewVersion(selectedDocument.id)}>Versionar</button>
                <button className="btn-secondary" onClick={() => navigate(`/processos/${selectedDocument.processId}`)}>Abrir processo</button>
                <button className="btn-secondary" onClick={requestDocumentMock}>Solicitar reenvio</button>
              </div>
            </div>
          </aside>
        </>
      )}

      {selectedProcessForModal && (() => {
        // Derive area from the documents belonging to this process (fallback to processNumber prefix)
        const modalDocs = documents.filter((d) => d.processId === selectedProcessForModal.id);
        const modalArea = modalDocs.length > 0
          ? deriveArea(modalDocs[0].processLabel)
          : deriveArea(selectedProcessForModal.processNumber ?? `PRC-${selectedProcessForModal.id}`);

        return (
          <ProcessDocumentModal
            processId={selectedProcessForModal.id}
            processLabel={selectedProcessForModal.processNumber ?? `PRC-${selectedProcessForModal.id}`}
            processTitle={selectedProcessForModal.title}
            client={selectedProcessForModal.client}
            area={modalArea}
            currentPhase={selectedProcessForModal.phase}
            documents={modalDocs}
            checklistStateByProcess={checklistStateByProcess}
            onClose={() => setSelectedProcessForModal(null)}
            onSaveChecklistItem={(procId, item) => {
              setChecklistStateByProcess((prev) => {
                const currentList = prev[procId] ?? [];
                const idx = currentList.findIndex((i) => i.id === item.id);
                if (idx >= 0) {
                  const newList = [...currentList];
                  newList[idx] = item;
                  return { ...prev, [procId]: newList };
                }
                return { ...prev, [procId]: [...currentList, item] };
              });
            }}
            onValidateDocument={validateDocument}
            onRejectDocument={rejectDocument}
            onRequestUploadForItem={(procId, item) => {
              // Store the full item so handleChecklistItemUpload doesn't need to re-derive it
              setPendingChecklistUpload({ processId: Number(procId), item });
              checklistUploadRef.current?.click();
            }}
          />
        );
      })()}
    </section>
  );
}
