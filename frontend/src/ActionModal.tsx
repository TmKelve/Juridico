import { useEffect, useRef, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { api } from './api';
import './ActionModal.css';

export type ActionModalType = 'andamento' | 'prazo' | 'documento' | 'atendimento';

interface ActionModalProps {
  type: ActionModalType;
  processId: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const MODAL_META: Record<ActionModalType, { title: string; titleLabel: string; descLabel: string; descPlaceholder: string; hasDate?: boolean }> = {
  andamento: {
    title: 'Registrar Andamento',
    titleLabel: 'Titulo do andamento',
    descLabel: 'Descricao',
    descPlaceholder: 'Descreva o andamento processual registrado...',
  },
  prazo: {
    title: 'Criar Prazo',
    titleLabel: 'Titulo do prazo',
    descLabel: 'Data de vencimento',
    descPlaceholder: '',
    hasDate: true,
  },
  documento: {
    title: 'Registrar Documento',
    titleLabel: 'Titulo do documento',
    descLabel: 'Descricao / instrucoes',
    descPlaceholder: 'Descreva o documento ou oriente o responsavel...',
  },
  atendimento: {
    title: 'Registrar Atendimento',
    titleLabel: 'Titulo do atendimento',
    descLabel: 'Resumo',
    descPlaceholder: 'Descreva o que foi discutido ou acordado...',
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
      <div className="action-modal" role="dialog" aria-modal="true" aria-labelledby="action-modal-title">
        <header className="action-modal-header">
          <h2 id="action-modal-title">{meta.title}</h2>
          <button className="action-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSubmit} noValidate>
          <div className="action-modal-body">
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
                placeholder="Digite o titulo..."
                autoComplete="off"
              />
            </div>

            {type === 'prazo' ? (
              <>
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
              </>
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
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar'}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}
