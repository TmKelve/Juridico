import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileUp,
  FolderOpen,
  MessageSquare,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type { ApiDocument } from './api';
import {
  AREA_LABELS,
  PHASE_LABELS,
  PHASES_ORDER,
  type ChecklistItem,
  getChecklistForPhase,
  normalizePhase,
} from './checklistTemplates';
import './ProcessDocumentModal.css';

interface ProcessDocumentModalProps {
  processId: number;
  processLabel: string;
  processTitle: string;
  client: string;
  area: string;
  currentPhase: string;
  documents: ApiDocument[];
  checklistStateByProcess: Record<string, ChecklistItem[]>;
  onClose: () => void;
  onSaveChecklistItem: (processId: string, item: ChecklistItem) => void;
  onValidateDocument: (id: number) => Promise<void>;
  onRejectDocument: (id: number) => Promise<void>;
  onRequestUploadForItem: (processId: string, item: ChecklistItem) => void;
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');
}

type DocStatus = 'pendente' | 'aguardando_validacao' | 'validado' | 'rejeitado';
const STATUS_LABELS: Record<DocStatus, string> = {
  pendente: 'Pendente',
  aguardando_validacao: 'Em validação',
  validado: 'Validado',
  rejeitado: 'Rejeitado',
};

export function ProcessDocumentModal({
  processId,
  processLabel,
  processTitle,
  client,
  area,
  currentPhase,
  documents,
  checklistStateByProcess,
  onClose,
  onSaveChecklistItem,
  onValidateDocument,
  onRejectDocument,
  onRequestUploadForItem,
}: ProcessDocumentModalProps) {
  const initialPhaseIdx = Math.max(0, PHASES_ORDER.indexOf(normalizePhase(currentPhase)));
  const [selectedPhaseIdx, setSelectedPhaseIdx] = useState(initialPhaseIdx);
  const [docsExpanded, setDocsExpanded] = useState(true);

  const selectedPhase = PHASES_ORDER[selectedPhaseIdx];

  // Merge template with saved state for the selected phase
  const checklistItems = useMemo((): ChecklistItem[] => {
    const template = getChecklistForPhase(area, selectedPhase);
    const saved = checklistStateByProcess[String(processId)] ?? [];

    return template.map((tpl) => {
      const savedItem = saved.find((s) => s.id === tpl.id);
      if (savedItem) return savedItem;

      // Auto-match from validated documents for this process
      const linkedDoc = documents.find(
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
  }, [area, selectedPhase, processId, checklistStateByProcess, documents]);

  const blockingItems  = checklistItems.filter((i) => i.blocking);
  const requiredItems  = checklistItems.filter((i) => !i.blocking && i.required);
  const optionalItems  = checklistItems.filter((i) => !i.blocking && !i.required);

  const validatedCount = checklistItems.filter((i) => i.status === 'validado').length;
  const totalCount     = checklistItems.length;
  const progress       = totalCount > 0 ? Math.round((validatedCount / totalCount) * 100) : 0;
  const missingRequired = checklistItems.filter((i) => (i.blocking || i.required) && i.status === 'faltante').length;

  const pendingDocText = checklistItems
    .filter((i) => i.status === 'faltante')
    .map((i) => `• ${i.title}`)
    .join('\n');

  function buildWhatsAppAll() {
    const text = `Olá! Preciso dos seguintes documentos para o processo *${processLabel} – ${processTitle}*:\n\n${pendingDocText}\n\nPor favor, envie o quanto antes. Obrigado!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  function buildWhatsAppItem(item: ChecklistItem) {
    const text = `Olá! Preciso do documento *${item.title}* para o processo *${processLabel} – ${processTitle}*. Por favor, envie o quanto antes. Obrigado!`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  function handleItemValidate(item: ChecklistItem) {
    const updated: ChecklistItem = { ...item, status: 'validado' };
    onSaveChecklistItem(String(processId), updated);
    if (item.linkedDocumentId) void onValidateDocument(item.linkedDocumentId);
  }

  function handleItemReject(item: ChecklistItem) {
    const updated: ChecklistItem = { ...item, status: 'rejeitado' };
    onSaveChecklistItem(String(processId), updated);
    if (item.linkedDocumentId) void onRejectDocument(item.linkedDocumentId);
  }

  function handleItemMarkMissing(item: ChecklistItem) {
    const updated: ChecklistItem = { ...item, status: 'faltante', linkedDocumentId: null };
    onSaveChecklistItem(String(processId), updated);
  }

  const docsByStatus = {
    pendente: documents.filter((d) => d.status === 'pendente'),
    aguardando_validacao: documents.filter((d) => d.status === 'aguardando_validacao'),
    validado: documents.filter((d) => d.status === 'validado'),
    rejeitado: documents.filter((d) => d.status === 'rejeitado'),
  };

  return (
    <>
      <button
        className="pdm-backdrop"
        onClick={onClose}
        aria-label="Fechar modal"
      />

      <div
        className="pdm-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdm-title"
      >
        {/* ── HEADER ── */}
        <header className="pdm-header">
          <div className="pdm-header-meta">
            <span className={`pdm-area-badge pdm-area--${area.toLowerCase()}`}>
              {AREA_LABELS[area] ?? area}
            </span>
            <div className="pdm-header-title-group">
              <h2 id="pdm-title" className="pdm-process-label">{processLabel}</h2>
              <p className="pdm-process-title">{processTitle}</p>
            </div>
            <span className="pdm-client-tag">{client}</span>
          </div>
          <button className="pdm-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        {/* ── PHASE STEPPER ── */}
        <div className="pdm-phase-nav" aria-label="Navegação de fases">
          <button
            className="pdm-phase-arrow"
            disabled={selectedPhaseIdx === 0}
            onClick={() => setSelectedPhaseIdx((i) => Math.max(0, i - 1))}
            aria-label="Fase anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <ol className="pdm-phase-steps">
            {PHASES_ORDER.map((phase, idx) => {
              const isPast     = idx < initialPhaseIdx;
              const isCurrent  = idx === initialPhaseIdx;
              const isSelected = idx === selectedPhaseIdx;
              const isFuture   = idx > initialPhaseIdx;

              return (
                <li key={phase}>
                  <button
                    className={[
                      'pdm-phase-step',
                      isSelected  ? 'is-selected'  : '',
                      isCurrent   ? 'is-current'   : '',
                      isPast      ? 'is-past'       : '',
                      isFuture    ? 'is-future'     : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => setSelectedPhaseIdx(idx)}
                    aria-current={isSelected ? 'step' : undefined}
                    title={isCurrent ? 'Fase atual do processo' : isPast ? 'Fase concluída' : 'Fase futura'}
                  >
                    <span className="pdm-step-dot" aria-hidden="true" />
                    <span className="pdm-step-label">{PHASE_LABELS[phase]}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <button
            className="pdm-phase-arrow"
            disabled={selectedPhaseIdx === PHASES_ORDER.length - 1}
            onClick={() => setSelectedPhaseIdx((i) => Math.min(PHASES_ORDER.length - 1, i + 1))}
            aria-label="Próxima fase"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* ── BODY ── */}
        <div className="pdm-body">

          {/* ── CHECKLIST SECTION ── */}
          <section className="pdm-checklist-section" aria-label="Checklist documental">

            {/* Progress bar */}
            <div className="pdm-checklist-summary">
              <div className="pdm-checklist-progress-row">
                <span className="pdm-checklist-phase-label">
                  {PHASE_LABELS[selectedPhase]}
                  {selectedPhaseIdx === initialPhaseIdx && (
                    <span className="pdm-current-tag">fase atual</span>
                  )}
                </span>
                <span className="pdm-checklist-fraction">{validatedCount}/{totalCount}</span>
              </div>
              <div className="pdm-progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <div className="pdm-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              {missingRequired > 0 && (
                <p className="pdm-missing-alert">
                  <AlertTriangle size={12} aria-hidden="true" />
                  {missingRequired} item(s) obrigatório(s) faltando
                </p>
              )}
            </div>

            {/* Blocking items */}
            {blockingItems.length > 0 && (
              <div className="pdm-checklist-group">
                <h3 className="pdm-group-label pdm-group-label--blocking">
                  <AlertTriangle size={13} aria-hidden="true" />
                  Bloqueantes ({blockingItems.filter((i) => i.status !== 'validado').length} pendentes)
                </h3>
                <ul className="pdm-checklist-list">
                  {blockingItems.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      item={item}
                      processId={String(processId)}
                      processLabel={processLabel}
                      documents={documents}
                      onValidate={() => handleItemValidate(item)}
                      onReject={() => handleItemReject(item)}
                      onMarkMissing={() => handleItemMarkMissing(item)}
                      onUpload={() => onRequestUploadForItem(String(processId), item)}
                      whatsappUrl={buildWhatsAppItem(item)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Required items */}
            {requiredItems.length > 0 && (
              <div className="pdm-checklist-group">
                <h3 className="pdm-group-label pdm-group-label--required">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  Obrigatórios ({requiredItems.filter((i) => i.status !== 'validado').length} pendentes)
                </h3>
                <ul className="pdm-checklist-list">
                  {requiredItems.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      item={item}
                      processId={String(processId)}
                      processLabel={processLabel}
                      documents={documents}
                      onValidate={() => handleItemValidate(item)}
                      onReject={() => handleItemReject(item)}
                      onMarkMissing={() => handleItemMarkMissing(item)}
                      onUpload={() => onRequestUploadForItem(String(processId), item)}
                      whatsappUrl={buildWhatsAppItem(item)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* Optional items */}
            {optionalItems.length > 0 && (
              <div className="pdm-checklist-group">
                <h3 className="pdm-group-label pdm-group-label--optional">
                  <FolderOpen size={13} aria-hidden="true" />
                  Opcionais
                </h3>
                <ul className="pdm-checklist-list">
                  {optionalItems.map((item) => (
                    <ChecklistRow
                      key={item.id}
                      item={item}
                      processId={String(processId)}
                      processLabel={processLabel}
                      documents={documents}
                      onValidate={() => handleItemValidate(item)}
                      onReject={() => handleItemReject(item)}
                      onMarkMissing={() => handleItemMarkMissing(item)}
                      onUpload={() => onRequestUploadForItem(String(processId), item)}
                      whatsappUrl={buildWhatsAppItem(item)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ── DOCUMENTS LIST ── */}
          <section className="pdm-docs-section" aria-label="Documentos do processo">
            <button
              className="pdm-docs-toggle"
              onClick={() => setDocsExpanded((v) => !v)}
              aria-expanded={docsExpanded}
            >
              <FolderOpen size={14} aria-hidden="true" />
              <span>Documentos cadastrados ({documents.length})</span>
              <ChevronLeft
                size={14}
                className={`pdm-docs-chevron ${docsExpanded ? 'is-open' : ''}`}
                aria-hidden="true"
              />
            </button>

            {docsExpanded && (
              <div className="pdm-docs-list">
                {documents.length === 0 && (
                  <p className="pdm-docs-empty">Nenhum documento cadastrado para este processo.</p>
                )}

                {/* Group by status for display */}
                {(['pendente', 'aguardando_validacao', 'rejeitado', 'validado'] as DocStatus[]).map((status) => {
                  const group = docsByStatus[status];
                  if (group.length === 0) return null;
                  return (
                    <div key={status} className="pdm-docs-group">
                      <p className="pdm-docs-group-label">
                        {STATUS_LABELS[status]} ({group.length})
                      </p>
                      {group.map((doc) => (
                        <div key={doc.id} className={`pdm-doc-row pdm-doc-row--${status}`}>
                          <div className="pdm-doc-row-main">
                            <strong className="pdm-doc-name">{doc.name}</strong>
                            <span className="pdm-doc-meta">
                              v{doc.version}{doc.isLatestVersion ? ' · atual' : ''} · {doc.origin} · {doc.category}
                            </span>
                          </div>
                          <div className="pdm-doc-row-aside">
                            <span className="pdm-doc-date">{formatDate(doc.uploadedAt)}</span>
                            <div className="pdm-doc-actions">
                              {doc.status === 'aguardando_validacao' && (
                                <>
                                  <button
                                    className="pdm-doc-action pdm-doc-action--validate"
                                    onClick={() => void onValidateDocument(doc.id)}
                                    title="Validar"
                                  >
                                    <CheckCircle2 size={14} />
                                  </button>
                                  <button
                                    className="pdm-doc-action pdm-doc-action--reject"
                                    onClick={() => void onRejectDocument(doc.id)}
                                    title="Rejeitar"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                              <button className="pdm-doc-action" title="Visualizar">
                                <Eye size={14} />
                              </button>
                              <button className="pdm-doc-action" title="Baixar">
                                <Download size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ── FOOTER ── */}
        <footer className="pdm-footer">
          <div className="pdm-footer-summary">
            <span className="pdm-footer-stat">
              <CheckCircle2 size={13} aria-hidden="true" />
              {documents.filter((d) => d.status === 'validado').length} validados
            </span>
            <span className="pdm-footer-stat pdm-footer-stat--warn">
              <Clock size={13} aria-hidden="true" />
              {documents.filter((d) => d.status === 'pendente' || d.status === 'aguardando_validacao').length} em andamento
            </span>
            {missingRequired > 0 && (
              <span className="pdm-footer-stat pdm-footer-stat--danger">
                <AlertTriangle size={13} aria-hidden="true" />
                {missingRequired} doc(s) faltando no checklist
              </span>
            )}
          </div>

          <div className="pdm-footer-actions">
            {pendingDocText && (
              <a
                href={buildWhatsAppAll()}
                target="_blank"
                rel="noopener noreferrer"
                className="pdm-whatsapp-btn"
                aria-label="Solicitar todos os documentos pendentes via WhatsApp"
              >
                <MessageSquare size={15} aria-hidden="true" />
                Solicitar todos os pendentes via WhatsApp
              </a>
            )}
            <button className="btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── ChecklistRow sub-component ────────────────────────────────────────────────

interface ChecklistRowProps {
  item: ChecklistItem;
  processId: string;
  processLabel: string;
  documents: ApiDocument[];
  onValidate: () => void;
  onReject: () => void;
  onMarkMissing: () => void;
  onUpload: () => void;
  whatsappUrl: string;
}

function ChecklistRow({
  item,
  documents,
  onValidate,
  onReject,
  onMarkMissing,
  onUpload,
  whatsappUrl,
}: ChecklistRowProps) {
  const linkedDoc = item.linkedDocumentId
    ? documents.find((d) => d.id === item.linkedDocumentId)
    : null;

  const statusIcon = {
    validado:             <CheckCircle2 size={15} className="pdm-item-icon pdm-item-icon--validado" />,
    aguardando_validacao: <Clock        size={15} className="pdm-item-icon pdm-item-icon--aguardando" />,
    rejeitado:            <XCircle      size={15} className="pdm-item-icon pdm-item-icon--rejeitado" />,
    faltante:             <AlertTriangle size={15} className="pdm-item-icon pdm-item-icon--faltante" />,
  }[item.status];

  return (
    <li className={`pdm-checklist-row pdm-checklist-row--${item.status}`}>
      <span className="pdm-item-icon-wrap" aria-hidden="true">{statusIcon}</span>

      <div className="pdm-item-body">
        <span className="pdm-item-title">{item.title}</span>
        <div className="pdm-item-meta">
          <span className={`pdm-item-cat pdm-item-cat--${item.category.toLowerCase()}`}>{item.category}</span>
          {linkedDoc && (
            <span className="pdm-item-linked">
              <FolderOpen size={11} aria-hidden="true" />
              {linkedDoc.name}
            </span>
          )}
        </div>
      </div>

      <div className="pdm-item-actions">
        {item.status !== 'validado' && (
          <button className="pdm-item-btn pdm-item-btn--upload" onClick={onUpload} title="Upload de arquivo">
            <Upload size={13} />
          </button>
        )}

        {item.status !== 'validado' && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="pdm-item-btn pdm-item-btn--whatsapp"
            title="Solicitar via WhatsApp"
          >
            <MessageSquare size={13} />
          </a>
        )}

        {(item.status === 'aguardando_validacao' || item.status === 'faltante') && (
          <button className="pdm-item-btn pdm-item-btn--validate" onClick={onValidate} title="Marcar como validado">
            <CheckCircle2 size={13} />
          </button>
        )}

        {item.status === 'aguardando_validacao' && (
          <button className="pdm-item-btn pdm-item-btn--reject" onClick={onReject} title="Rejeitar">
            <XCircle size={13} />
          </button>
        )}

        {item.status === 'validado' && (
          <button className="pdm-item-btn pdm-item-btn--undo" onClick={onMarkMissing} title="Desfazer validação">
            <FileUp size={13} />
          </button>
        )}
      </div>
    </li>
  );
}
