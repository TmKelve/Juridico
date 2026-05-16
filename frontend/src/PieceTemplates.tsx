import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FilePlus2,
  Filter,
  LayoutGrid,
  List,
  MoreHorizontal,
  PenSquare,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Star,
  Tag,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import { api, type ApiProcess, type ApiTemplate } from './api';
import { captureException, trackEvent, trackPageView } from './monitoring';
import { ProcessCombobox } from './ProcessCombobox';
import './PieceTemplates.css';

interface PieceTemplatesProps {
  user: { id: number; email: string; role: string };
}

type TemplateStatus = 'ativo' | 'revisao' | 'rascunho' | 'arquivado';
type ViewMode = 'lista' | 'cards';
type SortField = 'nome' | 'atualizacao' | 'versao' | 'uso';

type TemplateModel = ApiTemplate;

interface TemplateFilters {
  query: string;
  area: string;
  tipoPeca: string;
  status: string;
  oficialOuRascunho: string;
  favorito: boolean;
  autoFill: boolean;
  fase: string;
  autor: string;
  versao: string;
}

interface GenerationState {
  open: boolean;
  step: 1 | 2 | 3 | 4;
  templateId: string;
  processId: string;
  client: string;
  draftTitle: string;
  fields: Array<{ key: string; label: string; value: string }>;
}

const AREAS = ['Trabalhista', 'Cível', 'Tributário', 'Empresarial', 'Previdenciário'];
const TIPOS = ['Petição Inicial', 'Contestação', 'Réplica', 'Recurso', 'Embargos', 'Manifestação', 'Parecer'];
const FASES = ['Conhecimento', 'Saneamento', 'Instrução', 'Recursal', 'Execução'];
const STATUS_CFG: Record<TemplateStatus, { label: string; variant: string }> = {
  ativo: { label: 'Ativo', variant: 'success' },
  revisao: { label: 'Revisão', variant: 'warning' },
  rascunho: { label: 'Rascunho', variant: 'muted' },
  arquivado: { label: 'Arquivado', variant: 'neutral' },
};

const EMPTY_FILTERS: TemplateFilters = {
  query: '',
  area: '',
  tipoPeca: '',
  status: '',
  oficialOuRascunho: '',
  favorito: false,
  autoFill: false,
  fase: '',
  autor: '',
  versao: '',
};

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'Nunca';
  const diff = Math.floor((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 864e5);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias`;
  if (diff < 30) return `${Math.floor(diff / 7)} sem`;
  return formatDate(iso);
}

function StatusBadge({ status }: { status: TemplateStatus }) {
  const cfg = STATUS_CFG[status];
  return <span className={`tpl-badge tpl-badge--${cfg.variant}`}>{cfg.label}</span>;
}

function AutoFillBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`tpl-autofill${enabled ? ' tpl-autofill--on' : ''}`}>
      <Sparkles size={11} aria-hidden="true" />
      {enabled ? 'Apto' : 'Manual'}
    </span>
  );
}

function PieceTemplates({ user }: PieceTemplatesProps) {
  const [models, setModels] = useState<TemplateModel[]>([]);
  const [processes, setProcesses] = useState<ApiProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [filters, setFilters] = useState<TemplateFilters>(EMPTY_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  const [sortBy, setSortBy] = useState<SortField>('atualizacao');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TemplateModel | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [generation, setGeneration] = useState<GenerationState>({
    open: false,
    step: 1,
    templateId: '',
    processId: '',
    client: '',
    draftTitle: '',
    fields: [],
  });

  const PER_PAGE = 12;

  useEffect(() => {
    trackPageView('modelos_pecas', { role: user.role });
    loadData();
  }, [user.role]);

  useEffect(() => {
    setPage(1);
  }, [filters, viewMode, sortBy, sortDesc]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [processRes, templateRes] = await Promise.all([api.getProcesses(), api.getTemplates()]);
      if (processRes.status !== 200 || !Array.isArray(processRes.data) || templateRes.status !== 200 || !Array.isArray(templateRes.data)) {
        setError(processRes.error || templateRes.error || 'Não foi possível carregar modelos de peças.');
        return;
      }
      setProcesses(processRes.data as ApiProcess[]);
      setModels(templateRes.data as TemplateModel[]);
      trackEvent('templates_loaded', { count: (templateRes.data as TemplateModel[]).length });
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar modelos.');
      captureException(err as Error, { context: 'loadTemplates' });
    } finally {
      setLoading(false);
    }
  }

  function updateFilter<K extends keyof TemplateFilters>(k: K, v: TemplateFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }));
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setSuccess('Filtros limpos.');
  }

  function saveFilters() {
    localStorage.setItem('lexora_tpl_filter', JSON.stringify(filters));
    setSuccess('Filtro salvo.');
  }

  async function syncTemplate(id: string, data: Partial<ApiTemplate>) {
    const response = await api.updateTemplate(id, data);
    if (response.status !== 200 || !response.data) {
      setError(response.error || 'Não foi possível atualizar o modelo.');
      return null;
    }
    const updated = response.data as TemplateModel;
    setModels((prev) => prev.map((m) => (m.id === id ? updated : m)));
    if (selected?.id === id) setSelected(updated);
    return updated;
  }

  async function toggleFavorite(id: string) {
    const model = models.find((m) => m.id === id);
    if (!model) return;
    await syncTemplate(id, { favorito: !model.favorito });
    setOpenMenuId(null);
  }

  async function duplicateTemplate(id: string) {
    const model = models.find((m) => m.id === id);
    if (!model) return;
    const response = await api.createTemplate({
      nome: `${model.nome} (Cópia)`,
      area: model.area,
      tipoPeca: model.tipoPeca,
      status: 'rascunho',
      oficial: false,
      favorito: false,
      autoFill: model.autoFill,
      fase: model.fase,
      autor: user.email.split('@')[0],
      versao: 'v1.0',
      precisaRevisao: true,
      descricao: model.descricao,
      tags: model.tags,
      placeholders: model.placeholders,
      preview: model.preview,
      versions: [
        {
          id: `dup-${Date.now()}`,
          version: 'v1.0',
          author: user.email.split('@')[0],
          date: toIsoDate(new Date()),
          description: 'Cópia criada a partir de modelo existente.',
          current: true,
        },
      ],
    });
    if (response.status !== 201 || !response.data) {
      setError(response.error || 'Não foi possível duplicar o modelo.');
      return;
    }
    setModels((prev) => [response.data as TemplateModel, ...prev]);
    setSelected(response.data as TemplateModel);
    setOpenMenuId(null);
    setSuccess('Modelo duplicado.');
  }

  async function createNewVersion(id: string) {
    const model = models.find((m) => m.id === id);
    if (!model) return;
    const [major, minor] = model.versao.replace('v', '').split('.').map((n) => Number(n));
    const nextVersion = `v${major}.${(minor || 0) + 1}`;
    const nextDate = toIsoDate(new Date());
    const newHistory = model.versions.map((v) => ({ ...v, current: false }));
    newHistory.unshift({
      id: `${id}-${Date.now()}`,
      version: nextVersion,
      author: user.email.split('@')[0],
      date: nextDate,
      description: 'Nova versão gerada com atualização de estrutura e placeholders.',
      current: true,
    });
    await syncTemplate(id, {
      versao: nextVersion,
      ultimaAtualizacao: nextDate,
      status: 'revisao',
      precisaRevisao: true,
      versions: newHistory,
    });
    setOpenMenuId(null);
    setSuccess('Nova versão criada.');
  }

  async function markUsed(id: string) {
    const nextDate = toIsoDate(new Date());
    await syncTemplate(id, { usoRecente: nextDate });
  }

  function openGenerateFlow(templateId?: string) {
    const template = templateId ? models.find((m) => m.id === templateId) : null;
    const defaultProcess = processes[0];
    const fields = template
      ? template.placeholders.slice(0, 6).map((ph) => ({
          key: ph,
          label: ph.replace(/_/g, ' '),
          value: ph === 'nome_cliente' ? defaultProcess?.client ?? '' : '',
        }))
      : [];

    setGeneration({
      open: true,
      step: 1,
      templateId: template?.id ?? '',
      processId: defaultProcess ? String(defaultProcess.id) : '',
      client: defaultProcess?.client ?? '',
      draftTitle: template ? `${template.tipoPeca} - ${defaultProcess?.client ?? 'Novo Cliente'}` : '',
      fields,
    });
  }

  function closeGenerateFlow() {
    setGeneration((prev) => ({ ...prev, open: false }));
  }

  function nextGenStep() {
    setGeneration((prev) => ({ ...prev, step: Math.min(4, (prev.step + 1) as 4) as 1 | 2 | 3 | 4 }));
  }

  function prevGenStep() {
    setGeneration((prev) => ({ ...prev, step: Math.max(1, (prev.step - 1) as 1) as 1 | 2 | 3 | 4 }));
  }

  function confirmGeneratePiece() {
    const selectedModel = models.find((m) => m.id === generation.templateId);
    if (selectedModel) {
      void markUsed(selectedModel.id);
      setSuccess(`Peça gerada a partir de ${selectedModel.nome}. Rascunho aberto no editor.`);
      trackEvent('piece_generated_from_template', {
        templateId: selectedModel.id,
        processId: generation.processId,
      });
    }
    closeGenerateFlow();
  }

  function exportCsv(items: TemplateModel[]) {
    const header = ['Modelo', 'Área', 'Tipo', 'Status', 'Versão', 'Última atualização', 'Autofill', 'Uso recente'];
    const rows = items.map((m) => [
      m.nome,
      m.area,
      m.tipoPeca,
      STATUS_CFG[m.status].label,
      m.versao,
      formatDate(m.ultimaAtualizacao),
      m.autoFill ? 'Sim' : 'Não',
      m.usoRecente ? formatDate(m.usoRecente) : 'Nunca',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelos-pecas.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const kpis = useMemo(() => {
    const total = models.length;
    const oficiais = models.filter((m) => m.oficial).length;
    const favoritos = models.filter((m) => m.favorito).length;
    const usadosRecentes = models.filter((m) => m.usoRecente && Number(formatRelative(m.usoRecente).replace(/\D/g, '')) <= 14).length;
    const revisao = models.filter((m) => m.precisaRevisao).length;
    return { total, oficiais, favoritos, usadosRecentes, revisao };
  }, [models]);

  const uniqueAutores = useMemo(() => [...new Set(models.map((m) => m.autor))].sort(), [models]);

  const filtered = useMemo(() => {
    return models.filter((m) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const hay = `${m.nome} ${m.area} ${m.tipoPeca} ${m.tags.join(' ')} ${m.autor}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.area && m.area !== filters.area) return false;
      if (filters.tipoPeca && m.tipoPeca !== filters.tipoPeca) return false;
      if (filters.status && m.status !== filters.status) return false;
      if (filters.oficialOuRascunho === 'oficial' && !m.oficial) return false;
      if (filters.oficialOuRascunho === 'rascunho' && m.status !== 'rascunho') return false;
      if (filters.favorito && !m.favorito) return false;
      if (filters.autoFill && !m.autoFill) return false;
      if (filters.fase && m.fase !== filters.fase) return false;
      if (filters.autor && m.autor !== filters.autor) return false;
      if (filters.versao && m.versao !== filters.versao) return false;
      return true;
    });
  }, [models, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'nome') cmp = a.nome.localeCompare(b.nome);
      else if (sortBy === 'versao') cmp = a.versao.localeCompare(b.versao);
      else if (sortBy === 'uso') cmp = (a.usoRecente ?? '').localeCompare(b.usoRecente ?? '');
      else cmp = a.ultimaAtualizacao.localeCompare(b.ultimaAtualizacao);
      return sortDesc ? -cmp : cmp;
    });
    return arr;
  }, [filtered, sortBy, sortDesc]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pageItems = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const hasActiveFilters = Object.values(filters).some((v) => (typeof v === 'boolean' ? v : v !== ''));

  function renderRow(m: TemplateModel) {
    const isOpen = openMenuId === m.id;
    return (
      <tr
        key={m.id}
        className={`tpl-row${m.oficial ? ' tpl-row--official' : ''}`}
        onClick={() => setSelected(m)}
        tabIndex={0}
        role="button"
        aria-label={`Modelo ${m.nome}`}
        onKeyDown={(e) => e.key === 'Enter' && setSelected(m)}
      >
        <td className="tpl-col-modelo">
          <div className="tpl-modelo-head">
            <strong>{m.nome}</strong>
            {m.favorito && <Star size={12} className="tpl-star-on" aria-label="Favorito" />}
            {m.oficial && <span className="tpl-chip-official">Oficial</span>}
          </div>
          <span className="tpl-modelo-tags">{m.tags.map((t) => `#${t}`).join(' • ')}</span>
        </td>
        <td>{m.area}</td>
        <td>{m.tipoPeca}</td>
        <td><StatusBadge status={m.status} /></td>
        <td>{m.versao}</td>
        <td>{formatDate(m.ultimaAtualizacao)}</td>
        <td><AutoFillBadge enabled={m.autoFill} /></td>
        <td>{formatRelative(m.usoRecente)}</td>
        <td className="tpl-col-actions" onClick={(e) => e.stopPropagation()}>
          <div className="tpl-menu-wrap">
            <button
              className="tpl-menu-trigger"
              onClick={() => setOpenMenuId(isOpen ? null : m.id)}
              aria-label={`Ações de ${m.nome}`}
              aria-expanded={isOpen}
              aria-haspopup="true"
            >
              <MoreHorizontal size={15} />
            </button>
            {isOpen && (
              <ul className="tpl-ctx-menu" role="menu">
                <li role="none">
                  <button role="menuitem" onClick={() => { openGenerateFlow(m.id); setOpenMenuId(null); }}>
                    <FilePlus2 size={13} /> Gerar peça
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => { setSelected(m); setOpenMenuId(null); }}>
                    <Eye size={13} /> Visualizar
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => duplicateTemplate(m.id)}>
                    <Copy size={13} /> Duplicar
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => createNewVersion(m.id)}>
                    <RefreshCw size={13} /> Versionar
                  </button>
                </li>
                <li role="none">
                  <button role="menuitem" onClick={() => toggleFavorite(m.id)}>
                    <Star size={13} /> {m.favorito ? 'Desfavoritar' : 'Favoritar'}
                  </button>
                </li>
              </ul>
            )}
          </div>
        </td>
      </tr>
    );
  }

  const selectedModel = generation.templateId ? models.find((m) => m.id === generation.templateId) : null;
  const selectedProcess = generation.processId ? processes.find((p) => String(p.id) === generation.processId) : null;
  const processOptions = useMemo(
    () => processes.map((p) => ({ value: String(p.id), label: `#${p.id} • ${p.title}`, searchText: `${p.client} ${p.phase}` })),
    [processes],
  );

  return (
    <div className="tpl-page" onClick={() => { if (openMenuId) setOpenMenuId(null); }}>
      <div className="tpl-header-card">
        <div>
          <p className="tpl-eyebrow">Biblioteca Jurídica</p>
          <h2>Modelos de Peças</h2>
          <p className="tpl-subtitle">Encontre, versione e reutilize modelos oficiais para gerar novas peças com autopreenchimento seguro.</p>
        </div>
        <div className="tpl-header-actions">
          <button className="btn-primary" onClick={() => setSuccess('Fluxo de novo modelo iniciado.')} aria-label="Criar novo modelo">
            <Plus size={14} /> Novo Modelo
          </button>
          <button className="btn-secondary" onClick={() => openGenerateFlow()} aria-label="Gerar nova peça a partir de modelo">
            <WandSparkles size={14} /> Nova Peça a partir de Modelo
          </button>
          <button className="btn-secondary" onClick={() => setSuccess('Importação de modelo iniciada.')} aria-label="Importar modelo">
            <Upload size={14} /> Importar Modelo
          </button>
        </div>
      </div>

      {error && (
        <div className="tpl-alert tpl-alert--error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={loadData} aria-label="Tentar novamente">
            <RefreshCw size={14} /> Tentar novamente
          </button>
        </div>
      )}
      {success && (
        <div className="tpl-alert tpl-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <div className="tpl-kpis" aria-label="Indicadores de modelos">
        <div className="tpl-kpi-card"><p>Total de modelos</p><strong>{loading ? '—' : kpis.total}</strong></div>
        <div className="tpl-kpi-card tpl-kpi-card--official"><p>Modelos oficiais</p><strong>{loading ? '—' : kpis.oficiais}</strong></div>
        <div className="tpl-kpi-card tpl-kpi-card--fav"><p>Favoritos</p><strong>{loading ? '—' : kpis.favoritos}</strong></div>
        <div className="tpl-kpi-card"><p>Usados recentemente</p><strong>{loading ? '—' : kpis.usadosRecentes}</strong></div>
        <div className="tpl-kpi-card tpl-kpi-card--review"><p>Precisando revisão</p><strong>{loading ? '—' : kpis.revisao}</strong></div>
      </div>

      <div className="tpl-filters">
        <div className="tpl-filters-top">
          <div className="tpl-field tpl-field--search">
            <label htmlFor="tpl-search" className="sr-only">Buscar modelo</label>
            <span className="tpl-input-wrap">
              <Search size={14} aria-hidden="true" />
              <input
                id="tpl-search"
                type="search"
                value={filters.query}
                onChange={(e) => updateFilter('query', e.target.value)}
                placeholder="Buscar por nome, área, tipo, tags ou responsável..."
              />
            </span>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-area">Área jurídica</label>
            <select id="tpl-area" value={filters.area} onChange={(e) => updateFilter('area', e.target.value)}>
              <option value="">Todas</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-tipo">Tipo de peça</label>
            <select id="tpl-tipo" value={filters.tipoPeca} onChange={(e) => updateFilter('tipoPeca', e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-status">Status</label>
            <select id="tpl-status" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">Todos</option>
              {(Object.entries(STATUS_CFG) as Array<[TemplateStatus, { label: string }]>).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-oficial">Oficial / Rascunho</label>
            <select id="tpl-oficial" value={filters.oficialOuRascunho} onChange={(e) => updateFilter('oficialOuRascunho', e.target.value)}>
              <option value="">Todos</option>
              <option value="oficial">Oficial</option>
              <option value="rascunho">Rascunho</option>
            </select>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-fase">Fase processual</label>
            <select id="tpl-fase" value={filters.fase} onChange={(e) => updateFilter('fase', e.target.value)}>
              <option value="">Todas</option>
              {FASES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="tpl-field">
            <label htmlFor="tpl-autor">Autor</label>
            <select id="tpl-autor" value={filters.autor} onChange={(e) => updateFilter('autor', e.target.value)}>
              <option value="">Todos</option>
              {uniqueAutores.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="tpl-filters-bottom">
          <label className="tpl-checkline">
            <input type="checkbox" checked={filters.favorito} onChange={(e) => updateFilter('favorito', e.target.checked)} />
            Favorito
          </label>
          <label className="tpl-checkline">
            <input type="checkbox" checked={filters.autoFill} onChange={(e) => updateFilter('autoFill', e.target.checked)} />
            Com autopreenchimento
          </label>

          <div className="tpl-filter-actions">
            {hasActiveFilters && (
              <span className="tpl-filter-summary"><Filter size={12} /><strong>{filtered.length}</strong> de {models.length}</span>
            )}
            <button className="btn-ghost" onClick={clearFilters} aria-label="Limpar filtros"><X size={13} /> Limpar</button>
            <button className="btn-ghost" onClick={saveFilters} aria-label="Salvar filtro"><Save size={13} /> Salvar filtro</button>
          </div>

          <div className="tpl-view-toggle" role="group" aria-label="Modo de visualização">
            <button className={`tpl-view-btn${viewMode === 'lista' ? ' tpl-view-btn--active' : ''}`} onClick={() => setViewMode('lista')} aria-pressed={viewMode === 'lista'}>
              <List size={13} /> Lista
            </button>
            <button className={`tpl-view-btn${viewMode === 'cards' ? ' tpl-view-btn--active' : ''}`} onClick={() => setViewMode('cards')} aria-pressed={viewMode === 'cards'}>
              <LayoutGrid size={13} /> Cards
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="tpl-loading" aria-live="polite" aria-busy="true">
          <RefreshCw size={20} className="tpl-spin" />
          <span>Carregando modelos...</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {models.length === 0 && (
            <div className="tpl-empty">
              <Tag size={32} />
              <h3>Nenhum modelo cadastrado</h3>
              <p>Crie o primeiro modelo para iniciar sua biblioteca de peças.</p>
              <button className="btn-primary" onClick={() => setSuccess('Fluxo de novo modelo iniciado.')}>
                <Plus size={14} /> Novo Modelo
              </button>
            </div>
          )}

          {models.length > 0 && filtered.length === 0 && (
            <div className="tpl-empty">
              <Filter size={32} />
              <h3>Nenhum modelo encontrado</h3>
              <p>Ajuste os critérios de busca ou limpe os filtros.</p>
              <button className="btn-secondary" onClick={clearFilters}>
                <X size={13} /> Limpar filtros
              </button>
            </div>
          )}

          {filtered.length > 0 && viewMode === 'lista' && (
            <div className="tpl-table-card">
              <div className="tpl-table-header">
                <span className="tpl-count-badge">{filtered.length} modelo{filtered.length !== 1 ? 's' : ''}</span>
                <div className="tpl-sort-controls">
                  <label htmlFor="tpl-sort" className="sr-only">Ordenar por</label>
                  <select id="tpl-sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortField)}>
                    <option value="atualizacao">Última atualização</option>
                    <option value="nome">Nome</option>
                    <option value="versao">Versão</option>
                    <option value="uso">Uso recente</option>
                  </select>
                  <button className="btn-ghost tpl-sort-dir" onClick={() => setSortDesc((d) => !d)} aria-label="Inverter ordem">
                    {sortDesc ? '↓' : '↑'}
                  </button>
                  <button className="btn-ghost" onClick={() => exportCsv(sorted)} aria-label="Exportar lista">
                    <Download size={13} /> Exportar
                  </button>
                </div>
              </div>

              <div className="tpl-table-wrap">
                <table className="tpl-table" aria-label="Lista de modelos de peças">
                  <thead>
                    <tr>
                      <th scope="col">Modelo</th>
                      <th scope="col">Área</th>
                      <th scope="col">Tipo de peça</th>
                      <th scope="col">Status</th>
                      <th scope="col">Versão</th>
                      <th scope="col">Última atualização</th>
                      <th scope="col">Preenchimento automático</th>
                      <th scope="col">Uso recente</th>
                      <th scope="col"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody>{pageItems.map((m) => renderRow(m))}</tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="tpl-pagination" aria-label="Paginação">
                  <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior">Anterior</button>
                  <span aria-live="polite">{page} / {totalPages}</span>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página">Próximo</button>
                </div>
              )}
            </div>
          )}

          {filtered.length > 0 && viewMode === 'cards' && (
            <div className="tpl-cards-grid" aria-label="Modelos em cards">
              {pageItems.map((m) => (
                <article
                  key={m.id}
                  className="tpl-card"
                  onClick={() => setSelected(m)}
                  tabIndex={0}
                  role="button"
                  aria-label={`Detalhe do modelo ${m.nome}`}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(m)}
                >
                  <div className="tpl-card-head">
                    <strong>{m.nome}</strong>
                    <div className="tpl-card-head-actions">
                      {m.favorito && <Star size={13} className="tpl-star-on" />}
                      {m.oficial && <span className="tpl-chip-official">Oficial</span>}
                    </div>
                  </div>
                  <div className="tpl-card-meta">
                    <span>{m.tipoPeca}</span>
                    <span>{m.area}</span>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="tpl-card-row">
                    <span>{m.versao}</span>
                    <span>{formatDate(m.ultimaAtualizacao)}</span>
                  </div>
                  <div className="tpl-card-row">
                    <AutoFillBadge enabled={m.autoFill} />
                    <span className="tpl-usage">Uso: {formatRelative(m.usoRecente)}</span>
                  </div>
                  <div className="tpl-card-actions">
                    <button className="btn-primary" onClick={(e) => { e.stopPropagation(); openGenerateFlow(m.id); }}>
                      <FilePlus2 size={13} /> Gerar peça
                    </button>
                    <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); toggleFavorite(m.id); }}>
                      <Star size={13} /> {m.favorito ? 'Favorito' : 'Favoritar'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <>
          <div className="tpl-drawer-overlay" onClick={() => setSelected(null)} aria-hidden="true" />
          <aside className="tpl-drawer tpl-drawer--open" role="complementary" aria-label={`Detalhe do modelo ${selected.nome}`}>
            <div className="tpl-drawer-top">
              <div>
                <h3>{selected.nome}</h3>
                <div className="tpl-drawer-head-meta">
                  <StatusBadge status={selected.status} />
                  {selected.oficial && <span className="tpl-chip-official">Oficial</span>}
                  <AutoFillBadge enabled={selected.autoFill} />
                </div>
              </div>
              <button className="tpl-close" onClick={() => setSelected(null)} aria-label="Fechar detalhe"><X size={16} /></button>
            </div>

            <div className="tpl-drawer-body">
              <div className="tpl-drawer-row2">
                <div><span className="tpl-label">Tipo de peça</span><span className="tpl-value">{selected.tipoPeca}</span></div>
                <div><span className="tpl-label">Área jurídica</span><span className="tpl-value">{selected.area}</span></div>
              </div>

              <div className="tpl-drawer-row2">
                <div><span className="tpl-label">Versão atual</span><span className="tpl-value">{selected.versao}</span></div>
                <div><span className="tpl-label">Última atualização</span><span className="tpl-value">{formatDate(selected.ultimaAtualizacao)}</span></div>
              </div>

              <div><span className="tpl-label">Autor / responsável</span><span className="tpl-value">{selected.autor}</span></div>
              <div><span className="tpl-label">Descrição</span><p className="tpl-description">{selected.descricao}</p></div>

              <div>
                <span className="tpl-label">Tags</span>
                <div className="tpl-tags">
                  {selected.tags.map((t) => <span key={t} className="tpl-tag">#{t}</span>)}
                </div>
              </div>

              <div>
                <span className="tpl-label">Placeholders suportados</span>
                <div className="tpl-placeholders">
                  {selected.placeholders.map((ph) => <span key={ph} className="tpl-placeholder">{`{{${ph}}}`}</span>)}
                </div>
              </div>

              <div>
                <span className="tpl-label">Preview resumido</span>
                <pre className="tpl-preview">{selected.preview}</pre>
                <div className="tpl-preview-hint">
                  <Sparkles size={13} aria-hidden="true" />
                  {selected.autoFill ? 'Template apto para autopreenchimento.' : 'Template depende de preenchimento manual.'}
                </div>
              </div>

              <div>
                <span className="tpl-label">Histórico de versões</span>
                <div className="tpl-versions">
                  {selected.versions.map((v) => (
                    <div key={v.id} className={`tpl-version-row${v.current ? ' tpl-version-row--current' : ''}`}>
                      <div>
                        <strong>{v.version}</strong>
                        {v.current && <span className="tpl-current-pill">Atual</span>}
                      </div>
                      <span>{v.author} • {formatDate(v.date)}</span>
                      <p>{v.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="tpl-drawer-actions">
              <button className="btn-primary" onClick={() => openGenerateFlow(selected.id)}>
                <FilePlus2 size={13} /> Gerar peça
              </button>
              <button className="btn-secondary" onClick={() => setSuccess('Pré-visualização completa aberta.')}>
                <Eye size={13} /> Visualizar completo
              </button>
              <button className="btn-secondary" onClick={() => setSuccess('Edição de modelo iniciada.')}>
                <PenSquare size={13} /> Editar
              </button>
              <button className="btn-secondary" onClick={() => duplicateTemplate(selected.id)}>
                <Copy size={13} /> Duplicar
              </button>
              <button className="btn-secondary" onClick={() => createNewVersion(selected.id)}>
                <RefreshCw size={13} /> Versionar
              </button>
              <button className="btn-ghost" onClick={() => toggleFavorite(selected.id)}>
                <Star size={13} /> {selected.favorito ? 'Desfavoritar' : 'Favoritar'}
              </button>
            </div>
          </aside>
        </>
      )}

      {generation.open && (
        <>
          <div className="tpl-modal-overlay" onClick={closeGenerateFlow} aria-hidden="true" />
          <div className="tpl-modal" role="dialog" aria-modal="true" aria-labelledby="tpl-gen-title">
            <div className="tpl-modal-header">
              <h3 id="tpl-gen-title">Geração de Peça por Modelo</h3>
              <button onClick={closeGenerateFlow} aria-label="Fechar fluxo"><X size={16} /></button>
            </div>

            <div className="tpl-gen-steps" aria-label="Etapas da geração">
              {[1, 2, 3, 4].map((step) => (
                <span key={step} className={`tpl-step${generation.step === step ? ' tpl-step--active' : ''}`}>
                  {step}
                </span>
              ))}
            </div>

            <div className="tpl-modal-body">
              {generation.step === 1 && (
                <div className="tpl-gen-section">
                  <label htmlFor="gen-template">Escolher modelo</label>
                  <select
                    id="gen-template"
                    value={generation.templateId}
                    onChange={(e) => {
                      const model = models.find((m) => m.id === e.target.value);
                      setGeneration((prev) => ({
                        ...prev,
                        templateId: e.target.value,
                        draftTitle: model ? `${model.tipoPeca} - ${prev.client || 'Cliente'}` : '',
                        fields: model
                          ? model.placeholders.slice(0, 6).map((ph) => ({ key: ph, label: ph.replace(/_/g, ' '), value: '' }))
                          : [],
                      }));
                    }}
                  >
                    <option value="">Selecione um modelo</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {generation.step === 2 && (
                <div className="tpl-gen-section tpl-gen-grid">
                  <div>
                    <label htmlFor="gen-process">Escolher processo</label>
                    <ProcessCombobox
                      id="gen-process"
                      value={generation.processId}
                      onChange={(value) => {
                        const p = processes.find((pr) => String(pr.id) === value);
                        setGeneration((prev) => ({
                          ...prev,
                          processId: value,
                          client: p?.client ?? '',
                          draftTitle: selectedModel ? `${selectedModel.tipoPeca} - ${p?.client ?? 'Cliente'}` : prev.draftTitle,
                        }));
                      }}
                      options={processOptions}
                      placeholder="Pesquisar processo"
                      emptyLabel="Selecione um processo"
                    />
                  </div>

                  <div>
                    <label htmlFor="gen-client">Cliente</label>
                    <input id="gen-client" value={generation.client} onChange={(e) => setGeneration((prev) => ({ ...prev, client: e.target.value }))} />
                  </div>
                </div>
              )}

              {generation.step === 3 && (
                <div className="tpl-gen-section">
                  <label htmlFor="gen-title">Título do rascunho</label>
                  <input id="gen-title" value={generation.draftTitle} onChange={(e) => setGeneration((prev) => ({ ...prev, draftTitle: e.target.value }))} />

                  <div className="tpl-gen-fields">
                    {generation.fields.map((f, idx) => (
                      <div key={f.key} className="tpl-gen-field-row">
                        <label htmlFor={`gen-field-${idx}`}>{f.label}</label>
                        <input
                          id={`gen-field-${idx}`}
                          value={f.value}
                          onChange={(e) => {
                            setGeneration((prev) => {
                              const clone = [...prev.fields];
                              clone[idx] = { ...clone[idx], value: e.target.value };
                              return { ...prev, fields: clone };
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {generation.step === 4 && (
                <div className="tpl-gen-section">
                  <div className="tpl-gen-summary">
                    <h4>Revisão final</h4>
                    <p><strong>Modelo:</strong> {selectedModel?.nome || 'Não selecionado'}</p>
                    <p><strong>Processo:</strong> {selectedProcess ? `#${selectedProcess.id} • ${selectedProcess.title}` : 'Não selecionado'}</p>
                    <p><strong>Cliente:</strong> {generation.client || 'Não informado'}</p>
                    <p><strong>Rascunho:</strong> {generation.draftTitle || 'Sem título'}</p>
                    <p><strong>Autopreenchimento:</strong> {selectedModel?.autoFill ? 'Apto' : 'Parcial/manual'}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="tpl-modal-actions">
              <button className="btn-secondary" onClick={generation.step === 1 ? closeGenerateFlow : prevGenStep}>
                {generation.step === 1 ? 'Cancelar' : 'Voltar'}
              </button>
              {generation.step < 4 ? (
                <button
                  className="btn-primary"
                  onClick={nextGenStep}
                  disabled={(generation.step === 1 && !generation.templateId) || (generation.step === 2 && !generation.processId)}
                >
                  Próximo
                </button>
              ) : (
                <button className="btn-primary" onClick={confirmGeneratePiece}>
                  <FilePlus2 size={14} /> Gerar peça e abrir rascunho
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export { PieceTemplates };
