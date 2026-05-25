import { useEffect, useEffectEvent, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Mail, MessageSquare, RefreshCw, Send, ShieldCheck } from 'lucide-react';

import { api, type ApiClientCommunicationHistoryItem, type ApiClientConsent } from '@/api';
import { Badge, Button } from '@/components/ui';

import './ClientCommunicationPanel.css';

type HistoryChannel = 'email' | 'whatsapp' | 'portal' | 'all';
type ContextEntityType = 'document' | 'triage' | 'process' | 'attendance' | 'crm';

interface ClientCommunicationPanelProps {
  client: {
    id: number;
    nome: string;
    email: string;
    telefone: string;
    processos: Array<{
      id: number;
      title: string;
      status: string;
    }>;
  };
  userEmail: string;
  onOpenDocuments: (processId?: number) => void;
  onOpenProcess: (processId: number) => void;
}

interface ComposerForm {
  channel: 'email' | 'whatsapp' | 'portal';
  subject: string;
  message: string;
  templateCode: string;
  contextEntityType: ContextEntityType;
  contextEntityId: string;
}

interface ConsentForm {
  preferences: ApiClientConsent['preferences'];
  legalBasis: ApiClientConsent['legalBasis'];
  capturedBy: string;
}

const QUICK_TEMPLATES = [
  {
    label: 'Cobrar documento',
    subject: 'Documentos pendentes',
    message: 'Identificamos documentos pendentes no seu processo. Assim que possível, envie os anexos pelo portal para seguirmos com o andamento.',
    contextEntityType: 'document' as const,
  },
  {
    label: 'Atualização de processo',
    subject: 'Atualização do processo',
    message: 'Há uma atualização relevante no seu processo. Registramos os detalhes internamente e estamos acompanhando os próximos passos.',
    contextEntityType: 'process' as const,
  },
  {
    label: 'Lembrete de prazo',
    subject: 'Prazo próximo',
    message: 'Temos um prazo próximo relacionado ao seu caso. Nossa equipe está acompanhando e pode precisar de confirmação ou retorno seu.',
    contextEntityType: 'process' as const,
  },
];

const EMPTY_HISTORY: ApiClientCommunicationHistoryItem[] = [];

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapStatusLabel(status: ApiClientCommunicationHistoryItem['status']) {
  if (status === 'delivered') return 'Entregue';
  if (status === 'sent') return 'Enviada';
  if (status === 'failed') return 'Falhou';
  return 'Na fila';
}

function mapChannelLabel(channel: HistoryChannel) {
  if (channel === 'whatsapp') return 'WhatsApp';
  if (channel === 'portal') return 'Portal';
  if (channel === 'email') return 'E-mail';
  return 'Todos';
}

function mapAttemptKindLabel(attemptKind: ApiClientCommunicationHistoryItem['attemptKind']) {
  return attemptKind === 'retry' ? 'Retentativa' : 'Envio inicial';
}

export function ClientCommunicationPanel({
  client,
  userEmail,
  onOpenDocuments,
  onOpenProcess,
}: ClientCommunicationPanelProps) {
  const defaultContextType: ContextEntityType = client.processos[0] ? 'process' : 'crm';
  const defaultContextId = client.processos[0] ? String(client.processos[0].id) : '';

  const [historyChannel, setHistoryChannel] = useState<HistoryChannel>('all');
  const [historyItems, setHistoryItems] = useState<ApiClientCommunicationHistoryItem[]>(EMPTY_HISTORY);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [historyActionError, setHistoryActionError] = useState('');
  const [historyActionSuccess, setHistoryActionSuccess] = useState('');
  const [retryingCommunicationId, setRetryingCommunicationId] = useState<string | null>(null);

  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState<ComposerForm>({
    channel: client.email !== '—' ? 'email' : 'portal',
    subject: '',
    message: '',
    templateCode: '',
    contextEntityType: defaultContextType,
    contextEntityId: defaultContextId,
  });

  const [consent, setConsent] = useState<ConsentForm>({
    preferences: {
      email: client.email !== '—',
      whatsapp: client.telefone !== '—',
      portal: true,
    },
    legalBasis: 'consentimento',
    capturedBy: userEmail,
  });
  const [consentSnapshot, setConsentSnapshot] = useState<ApiClientConsent | null>(null);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [consentSuccess, setConsentSuccess] = useState('');

  const loadHistoryOnMount = useEffectEvent(loadHistory);
  const loadConsentOnMount = useEffectEvent(loadConsent);

  useEffect(() => {
    loadHistoryOnMount();
  }, [client.id, historyChannel]);

  useEffect(() => {
    loadConsentOnMount();
  }, [client.id]);

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const response = await api.getClientCommunications(client.id, { channel: historyChannel, limit: 12 });
      if (response.status !== 200) {
        setHistoryError(response.error || 'Não foi possível carregar o histórico de comunicação.');
        setHistoryItems(EMPTY_HISTORY);
        return;
      }
      setHistoryItems(response.data.items);
    } catch (err) {
      setHistoryError((err as Error).message || 'Não foi possível carregar o histórico de comunicação.');
      setHistoryItems(EMPTY_HISTORY);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function retryCommunication(item: ApiClientCommunicationHistoryItem) {
    if (item.status !== 'failed') return;

    setRetryingCommunicationId(item.communicationId);
    setHistoryActionError('');
    setHistoryActionSuccess('');

    try {
      const response = await api.retryClientCommunication(client.id, item.communicationId);
      if (response.status !== 200 && response.status !== 201) {
        setHistoryActionError(response.error || 'Não foi possível reenfileirar a comunicação.');
        return;
      }

      setHistoryActionSuccess(`Retentativa registrada como ${mapStatusLabel(response.data.deliveryStatus).toLowerCase()}.`);
      await loadHistory();
    } catch (err) {
      setHistoryActionError((err as Error).message || 'Não foi possível reenfileirar a comunicação.');
    } finally {
      setRetryingCommunicationId(null);
    }
  }

  async function loadConsent() {
    setConsentError('');
    setConsentSuccess('');

    try {
      const response = await api.getClientConsent(client.id);
      if (response.status === 404) {
        setConsentSnapshot(null);
        setConsent((prev) => ({
          ...prev,
          capturedBy: userEmail,
          legalBasis: 'consentimento',
          preferences: {
            email: client.email !== '—',
            whatsapp: client.telefone !== '—',
            portal: true,
          },
        }));
        return;
      }

      if (response.status !== 200 || !response.data) {
        setConsentError(response.error || 'Não foi possível carregar o consentimento atual.');
        return;
      }

      setConsentSnapshot(response.data);
      setConsent({
        preferences: response.data.preferences,
        legalBasis: response.data.legalBasis,
        capturedBy: response.data.capturedBy || userEmail,
      });
    } catch (err) {
      setConsentError((err as Error).message || 'Não foi possível carregar o consentimento atual.');
    }
  }

  async function submitCommunication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setSendError('');
    setSendSuccess('');

    const contextEntityId = composer.contextEntityId.trim();

    try {
      const response = await api.sendClientCommunication(client.id, {
        channel: composer.channel,
        subject: composer.subject.trim() || null,
        message: composer.message.trim(),
        templateCode: composer.templateCode.trim() || null,
        contextEntityType: composer.contextEntityType,
        contextEntityId: contextEntityId ? contextEntityId : null,
        idempotencyKey: `client-comm:${client.id}:${composer.channel}:${Date.now()}`,
      });

      if (response.status !== 200 && response.status !== 201) {
        setSendError(response.error || 'Não foi possível enviar a comunicação.');
        return;
      }

      setSendSuccess(`Comunicação ${mapStatusLabel(response.data.deliveryStatus)}.`);
      setComposer((prev) => ({
        ...prev,
        subject: '',
        message: '',
        templateCode: '',
      }));
      await loadHistory();
    } catch (err) {
      setSendError((err as Error).message || 'Não foi possível enviar a comunicação.');
    } finally {
      setSending(false);
    }
  }

  async function submitConsent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConsentSaving(true);
    setConsentError('');
    setConsentSuccess('');

    try {
      const response = await api.updateClientConsent(client.id, {
        preferences: consent.preferences,
        legalBasis: consent.legalBasis,
        capturedAt: new Date().toISOString(),
        capturedBy: consent.capturedBy.trim() || userEmail,
      });

      if (response.status !== 200) {
        setConsentError(response.error || 'Não foi possível registrar o consentimento.');
        return;
      }

      setConsentSnapshot(response.data);
      setConsentSuccess(`Consentimento atualizado na versão ${response.data.consentVersion}.`);
    } catch (err) {
      setConsentError((err as Error).message || 'Não foi possível registrar o consentimento.');
    } finally {
      setConsentSaving(false);
    }
  }

  function applyTemplate(template: typeof QUICK_TEMPLATES[number]) {
    setComposer((prev) => ({
      ...prev,
      subject: template.subject,
      message: template.message,
      contextEntityType: template.contextEntityType,
      contextEntityId: template.contextEntityType === 'process' ? defaultContextId : prev.contextEntityId,
    }));
  }

  const processOptions = useMemo(
    () => client.processos.map((processo) => ({
      id: String(processo.id),
      label: `${processo.title} (#${processo.id})`,
    })),
    [client.processos],
  );

  return (
    <div className="client-comm-panel">
      <section className="client-comm-card client-comm-card--hero">
        <div>
          <p className="client-comm-eyebrow">Comunicação operacional</p>
          <h4>{client.nome}</h4>
          <p className="client-comm-copy">
            Envie atualização, consulte o histórico e registre consentimento do canal sem sair da carteira.
          </p>
        </div>
        <div className="client-comm-targets">
          <Badge variant="neutral"><Mail size={12} aria-hidden="true" /> {client.email}</Badge>
          <Badge variant="neutral"><MessageSquare size={12} aria-hidden="true" /> {client.telefone}</Badge>
        </div>
      </section>

      <div className="client-comm-layout">
        <section className="client-comm-card">
          <div className="client-comm-section-head">
            <div>
              <h5><Send size={14} aria-hidden="true" /> Enviar comunicação</h5>
              <p>Use mensagens rápidas para documentos, retorno processual ou aviso pelo portal.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenDocuments()}>
              Abrir documentos
            </Button>
          </div>

          <div className="client-comm-template-row">
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                className="client-comm-template"
                onClick={() => applyTemplate(template)}
              >
                {template.label}
              </button>
            ))}
          </div>

          <form className="client-comm-form" onSubmit={submitCommunication}>
            <div className="client-comm-form-grid">
              <label>
                Canal
                <select
                  value={composer.channel}
                  onChange={(event) => setComposer((prev) => ({ ...prev, channel: event.target.value as ComposerForm['channel'] }))}
                >
                  <option value="email">E-mail</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="portal">Portal</option>
                </select>
              </label>

              <label>
                Template
                <input
                  type="text"
                  value={composer.templateCode}
                  placeholder="opcional"
                  onChange={(event) => setComposer((prev) => ({ ...prev, templateCode: event.target.value }))}
                />
              </label>

              <label>
                Contexto
                <select
                  value={composer.contextEntityType}
                  onChange={(event) => setComposer((prev) => ({ ...prev, contextEntityType: event.target.value as ContextEntityType }))}
                >
                  <option value="document">Documento</option>
                  <option value="process">Processo</option>
                  <option value="triage">Triagem</option>
                  <option value="attendance">Atendimento</option>
                  <option value="crm">CRM</option>
                </select>
              </label>

              <label>
                Referência
                <select
                  value={composer.contextEntityId}
                  onChange={(event) => setComposer((prev) => ({ ...prev, contextEntityId: event.target.value }))}
                >
                  <option value="">Sem vínculo específico</option>
                  {processOptions.map((process) => (
                    <option key={process.id} value={process.id}>{process.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Assunto
              <input
                type="text"
                value={composer.subject}
                placeholder="Assunto exibido ao cliente"
                onChange={(event) => setComposer((prev) => ({ ...prev, subject: event.target.value }))}
              />
            </label>

            <label>
              Mensagem
              <textarea
                rows={5}
                value={composer.message}
                placeholder="Escreva a comunicação ao cliente"
                onChange={(event) => setComposer((prev) => ({ ...prev, message: event.target.value }))}
                required
              />
            </label>

            {(sendError || sendSuccess) && (
              <div
                className={`client-comm-feedback${sendError ? ' client-comm-feedback--error' : ' client-comm-feedback--success'}`}
                role={sendError ? 'alert' : 'status'}
              >
                {sendError ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
                <span>{sendError || sendSuccess}</span>
              </div>
            )}

            <div className="client-comm-form-actions">
              <Button type="submit" disabled={sending || !composer.message.trim()}>
                <Send size={14} aria-hidden="true" /> {sending ? 'Enviando...' : 'Enviar comunicação'}
              </Button>
              {composer.contextEntityId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenProcess(Number(composer.contextEntityId))}
                >
                  Ver processo
                </Button>
              )}
            </div>
          </form>
        </section>

        <section className="client-comm-card">
          <div className="client-comm-section-head">
            <div>
              <h5><Clock3 size={14} aria-hidden="true" /> Histórico</h5>
              <p>Últimos envios e retentativas para o cliente, por canal.</p>
            </div>
            <select value={historyChannel} onChange={(event) => setHistoryChannel(event.target.value as HistoryChannel)}>
              <option value="all">Todos</option>
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="portal">Portal</option>
            </select>
          </div>

          {(historyActionError || historyActionSuccess) && (
            <div
              className={`client-comm-feedback${historyActionError ? ' client-comm-feedback--error' : ' client-comm-feedback--success'}`}
              role={historyActionError ? 'alert' : 'status'}
            >
              {historyActionError ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              <span>{historyActionError || historyActionSuccess}</span>
            </div>
          )}

          {historyLoading ? (
            <div className="client-comm-empty">Carregando histórico…</div>
          ) : historyError ? (
            <div className="client-comm-feedback client-comm-feedback--error" role="alert">
              <AlertTriangle size={14} aria-hidden="true" />
              <span>{historyError}</span>
            </div>
          ) : historyItems.length === 0 ? (
            <div className="client-comm-empty">Nenhuma comunicação em {mapChannelLabel(historyChannel).toLowerCase()}.</div>
          ) : (
            <div className="client-comm-history-list">
              {historyItems.map((item) => (
                <article key={item.communicationId} className="client-comm-history-item">
                  <div className="client-comm-history-head">
                    <div className="client-comm-history-tags">
                      <Badge variant="neutral">{mapChannelLabel(item.channel)}</Badge>
                      <Badge variant="neutral">{mapAttemptKindLabel(item.attemptKind)}</Badge>
                      <Badge
                        className={`client-comm-status client-comm-status--${item.status}`}
                        variant="neutral"
                      >
                        {mapStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <span>{formatDateTime(item.deliveredAt || item.sentAt)}</span>
                  </div>
                  <strong>{item.summary}</strong>
                  <div className="client-comm-history-meta">
                    <p>ID {item.communicationId}</p>
                    <p>Tentativa {item.retryCount + 1}</p>
                    {item.providerMessageId ? <p>Provider {item.providerMessageId}</p> : null}
                  </div>
                  {item.failureMessage ? (
                    <div className="client-comm-feedback client-comm-feedback--error" role="alert">
                      <AlertTriangle size={14} aria-hidden="true" />
                      <span>{item.failureMessage}</span>
                    </div>
                  ) : null}
                  {item.status === 'failed' ? (
                    <div className="client-comm-history-actions">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={retryingCommunicationId === item.communicationId}
                        onClick={() => retryCommunication(item)}
                      >
                        <RefreshCw size={14} aria-hidden="true" />
                        {retryingCommunicationId === item.communicationId ? 'Reenfileirando...' : 'Tentar novamente'}
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="client-comm-card">
        <div className="client-comm-section-head">
          <div>
            <h5><ShieldCheck size={14} aria-hidden="true" /> Consentimento de canal</h5>
            <p>Atualize as preferências de contato usadas por portal, e-mail e WhatsApp.</p>
          </div>
          {consentSnapshot ? (
            <Badge variant="neutral">Versão {consentSnapshot.consentVersion}</Badge>
          ) : (
            <Badge variant="neutral">Sem leitura inicial</Badge>
          )}
        </div>

        <div className="client-comm-consent-hint">
          O snapshot mais recente de consentimento é carregado ao abrir o painel. Novas gravações incrementam a versão e atualizam este bloco.
        </div>

        <form className="client-comm-consent-form" onSubmit={submitConsent}>
          <div className="client-comm-consent-grid">
            <label className="client-comm-checkline">
              <input
                type="checkbox"
                checked={consent.preferences.email}
                onChange={(event) => setConsent((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, email: event.target.checked },
                }))}
              />
              E-mail
            </label>
            <label className="client-comm-checkline">
              <input
                type="checkbox"
                checked={consent.preferences.whatsapp}
                onChange={(event) => setConsent((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, whatsapp: event.target.checked },
                }))}
              />
              WhatsApp
            </label>
            <label className="client-comm-checkline">
              <input
                type="checkbox"
                checked={consent.preferences.portal}
                onChange={(event) => setConsent((prev) => ({
                  ...prev,
                  preferences: { ...prev.preferences, portal: event.target.checked },
                }))}
              />
              Portal
            </label>
          </div>

          <div className="client-comm-form-grid">
            <label>
              Base legal
              <select
                value={consent.legalBasis}
                onChange={(event) => setConsent((prev) => ({ ...prev, legalBasis: event.target.value as ConsentForm['legalBasis'] }))}
              >
                <option value="consentimento">Consentimento</option>
                <option value="execucao_contrato">Execução de contrato</option>
                <option value="legitimo_interesse">Legítimo interesse</option>
              </select>
            </label>

            <label>
              Capturado por
              <input
                type="text"
                value={consent.capturedBy}
                onChange={(event) => setConsent((prev) => ({ ...prev, capturedBy: event.target.value }))}
              />
            </label>
          </div>

          {(consentError || consentSuccess) && (
            <div
              className={`client-comm-feedback${consentError ? ' client-comm-feedback--error' : ' client-comm-feedback--success'}`}
              role={consentError ? 'alert' : 'status'}
            >
              {consentError ? <AlertTriangle size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}
              <span>{consentError || consentSuccess}</span>
            </div>
          )}

          <div className="client-comm-form-actions">
            <Button type="submit" disabled={consentSaving}>
              <ShieldCheck size={14} aria-hidden="true" /> {consentSaving ? 'Salvando...' : 'Salvar consentimento'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenDocuments()}>
              Ir para documentos
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
