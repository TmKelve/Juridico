import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  FileText,
  Handshake,
  MessageSquarePlus,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { api } from './api';
import './ActionModal.css';

export type ActionModalType = 'andamento' | 'prazo' | 'documento' | 'atendimento';

interface ActionModalProps {
  type: ActionModalType;
  processId: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const MODAL_META: Record<ActionModalType, {
  title: string;
  subtitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descLabel: string;
  descPlaceholder: string;
  primaryAction: string;
  icon: LucideIcon;
  accentClass: string;
  hasDate?: boolean;
}> = {
  andamento: {
    title: 'Registrar Andamento',
    subtitle: 'Atualize o historico do caso com um registro claro e consultavel.',
    titleLabel: 'Titulo do andamento',
    titlePlaceholder: 'Ex.: Peticao protocolada no tribunal',
    descLabel: 'Descricao',
    descPlaceholder: 'Descreva o andamento processual registrado...',
    primaryAction: 'Registrar andamento',
    icon: MessageSquarePlus,
    accentClass: 'is-andamento',
  },
  prazo: {
    title: 'Criar Prazo',
    subtitle: 'Cadastre um prazo com vencimento e prioridade para manter a execucao sob controle.',
    titleLabel: 'Titulo do prazo',
    titlePlaceholder: 'Ex.: Manifestacao final',
    descLabel: 'Data de vencimento',
    descPlaceholder: '',
    primaryAction: 'Criar prazo',
    icon: CalendarDays,
    accentClass: 'is-prazo',
    hasDate: true,
  },
  documento: {
    title: 'Registrar Documento',
    subtitle: 'Estruture o registro do documento e deixe a proxima acao clara para a equipe.',
    titleLabel: 'Titulo do documento',
    titlePlaceholder: 'Ex.: Comprovante de custas',
    descLabel: 'Descricao / instrucoes',
    descPlaceholder: 'Descreva o documento ou oriente o responsavel...',
    primaryAction: 'Registrar documento',
    icon: FileText,
    accentClass: 'is-documento',
  },
  atendimento: {
    title: 'Registrar Atendimento',
    subtitle: 'Consolide o contato com cliente ou parte e preserve o contexto da conversa.',
    titleLabel: 'Titulo do atendimento',
    titlePlaceholder: 'Ex.: Alinhamento com cliente',
    descLabel: 'Resumo',
    descPlaceholder: 'Descreva o que foi discutido ou acordado...',
    primaryAction: 'Registrar atendimento',
    icon: Handshake,
    accentClass: 'is-atendimento',
  },
};

const PRIORITY_OPTIONS = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
];

const SUCCESS_LABELS: Record<ActionModalType, string> = {
  andamento: 'Andamento registrado com sucesso.',
  prazo: 'Prazo criado com sucesso.',
  documento: 'Documento registrado com sucesso.',
  atendimento: 'Atendimento registrado com sucesso.',
};

export function ActionModal({ type, processId, onClose, onSuccess }: ActionModalProps) {
  const meta = MODAL_META[type];
  const Icon = meta.icon;
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('media');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');

  useEffect(() => {
    firstInputRef.current?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError('');

    if (!title.trim()) { setFieldError('Preencha o titulo.'); return; }
    if (type === 'prazo' && !dueDate) { setFieldError('Informe a data de vencimento.'); return; }
    if (type !== 'prazo' && !description.trim()) { setFieldError('Preencha a descricao.'); return; }

    setSubmitting(true);
    try {
      let res;
      if (type === 'andamento') res = await api.createAndamento(processId, { title: title.trim(), description: description.trim() });
      else if (type === 'prazo') res = await api.createPrazo(processId, { title: title.trim(), dueDate, priority });
      else if (type === 'documento') res = await api.createDocumento(processId, { title: title.trim(), description: description.trim() });
      else res = await api.createAtendimento(processId, { title: title.trim(), description: description.trim() });

      if (res.status === 201) {
        onSuccess(SUCCESS_LABELS[type]);
      } else {
        setFieldError(res.error || 'Erro ao salvar. Tente novamente.');
      }
    } catch {
      setFieldError('Erro de conexao com o servidor.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="action-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className={`action-modal ${meta.accentClass}`} role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
        <header className="action-modal-header">
          <div className="action-modal-header-main">
            <div className="action-modal-header-icon" aria-hidden="true">
              <Icon size={18} />
            </div>
            <div>
              <p className="action-modal-eyebrow">Operacao juridica</p>
              <h2 id="action-modal-title">{meta.title}</h2>
              <p className="action-modal-subtitle">{meta.subtitle}</p>
            </div>
          </div>
          <button className="action-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="action-modal-body">
            <section className="action-modal-context" aria-label="Resumo rapido do registro">
              <div className="action-modal-context-chip" aria-hidden="true">
                <Sparkles size={14} />
                Registro rapido
              </div>
              <div className="action-modal-context-copy">
                <strong>Processo #{processId}</strong>
                <span>O registro sera vinculado diretamente ao fluxo operacional deste processo.</span>
              </div>
            </section>

            {fieldError && (
              <div className="action-modal-error" role="alert">
                <AlertCircle size={14} aria-hidden="true" />
                {fieldError}
              </div>
            )}

            <div className="action-modal-field">
              <label htmlFor="am-title">{meta.titleLabel}</label>
              <input
                id="am-title"
                ref={firstInputRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={meta.titlePlaceholder}
                autoComplete="off"
              />
            </div>

            {type === 'prazo' ? (
              <div className="action-modal-split-fields">
                <div className="action-modal-field">
                  <label htmlFor="am-due">Data de vencimento</label>
                  <input
                    id="am-due"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="action-modal-field">
                  <label htmlFor="am-priority">Prioridade</label>
                  <select id="am-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="action-modal-field">
                <label htmlFor="am-desc">{meta.descLabel}</label>
                <textarea
                  id="am-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={meta.descPlaceholder}
                  rows={4}
                />
              </div>
            )}
          </div>

          <footer className="action-modal-footer">
            <p className="action-modal-footer-note">Os dados ficam disponiveis na timeline e no contexto rapido do processo.</p>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Salvando...' : meta.primaryAction}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
