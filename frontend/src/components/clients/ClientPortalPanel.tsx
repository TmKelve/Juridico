import { useEffect, useEffectEvent, useState } from 'react';
import { AlertTriangle, Briefcase, ExternalLink, FileText, Globe, Megaphone } from 'lucide-react';

import { Button, Badge } from '@/components/ui';
import { api, type ApiClientPortal } from '@/api';

import './ClientPortalPanel.css';

interface ClientPortalPanelProps {
  clientId: number;
  clientName: string;
  onOpenProcess: (processId: number) => void;
  onOpenDocuments: (processId?: number) => void;
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function summarizeTimelineType(type: ApiClientPortal['timeline'][number]['entityType']) {
  if (type === 'document') return 'Documento';
  if (type === 'publication') return 'Publicação';
  return 'Prazo';
}

export function ClientPortalPanel({
  clientId,
  clientName,
  onOpenProcess,
  onOpenDocuments,
}: ClientPortalPanelProps) {
  const [portal, setPortal] = useState<ApiClientPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadPortalOnMount = useEffectEvent(loadPortal);

  useEffect(() => {
    loadPortalOnMount();
  }, [clientId]);

  async function loadPortal() {
    setLoading(true);
    setError('');
    try {
      const response = await api.getClientPortal(clientId);
      if (response.status !== 200) {
        setError(response.error || 'Não foi possível carregar o portal do cliente.');
        return;
      }
      setPortal(response.data);
    } catch (err) {
      setError((err as Error).message || 'Não foi possível carregar o portal do cliente.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="client-portal-panel client-portal-panel--loading" aria-live="polite">
        <Globe size={16} aria-hidden="true" />
        <span>Carregando visão do portal…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="client-portal-panel client-portal-panel--error" role="alert">
        <AlertTriangle size={16} aria-hidden="true" />
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={loadPortal}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!portal) return null;

  return (
    <div className="client-portal-panel">
      <div className="client-portal-hero">
        <div>
          <p className="client-portal-eyebrow">Portal do cliente</p>
          <h4>{clientName}</h4>
          <p className="client-portal-copy">
            Consolide o que o cliente enxerga: documentos pendentes, publicações recentes e próximos prazos.
          </p>
        </div>
        <Button variant="outline" onClick={() => onOpenDocuments()}>
          <FileText size={14} aria-hidden="true" /> Abrir documentos
        </Button>
      </div>

      <div className="client-portal-summary-grid">
        <div className="client-portal-summary-card">
          <span>Processos ativos</span>
          <strong>{portal.summary.activeProcesses}</strong>
        </div>
        <div className="client-portal-summary-card">
          <span>Documentos pendentes</span>
          <strong>{portal.summary.pendingDocuments}</strong>
        </div>
        <div className="client-portal-summary-card">
          <span>Publicações recentes</span>
          <strong>{portal.summary.recentPublications}</strong>
        </div>
      </div>

      <div className="client-portal-section-grid">
        <section className="client-portal-section">
          <div className="client-portal-section-head">
            <div>
              <h5>
                <FileText size={14} aria-hidden="true" /> Documentos
              </h5>
              <p>Checklist e envios visíveis ao cliente.</p>
            </div>
            <Badge variant="neutral">{portal.cards.documents.length}</Badge>
          </div>
          {portal.cards.documents.length === 0 ? (
            <p className="client-portal-empty">Nenhum documento pendente no portal.</p>
          ) : (
            <div className="client-portal-list">
              {portal.cards.documents.slice(0, 4).map((item) => (
                <article key={item.documentId} className="client-portal-list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.category} · {item.status}</p>
                    <span>{formatDateTime(item.uploadedAt)}</span>
                  </div>
                  <div className="client-portal-inline-actions">
                    <Button size="sm" variant="ghost" onClick={() => onOpenProcess(item.processId)}>
                      <Briefcase size={13} aria-hidden="true" /> Processo
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onOpenDocuments(item.processId)}>
                      <ExternalLink size={13} aria-hidden="true" /> Ver
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="client-portal-section">
          <div className="client-portal-section-head">
            <div>
              <h5>
                <Megaphone size={14} aria-hidden="true" /> Publicações
              </h5>
              <p>Últimos avisos e itens que exigem ação.</p>
            </div>
            <Badge variant="neutral">{portal.cards.publications.length}</Badge>
          </div>
          {portal.cards.publications.length === 0 ? (
            <p className="client-portal-empty">Nenhuma publicação recente para este cliente.</p>
          ) : (
            <div className="client-portal-list">
              {portal.cards.publications.slice(0, 4).map((item) => (
                <article key={item.publicationId} className="client-portal-list-item">
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.status}</p>
                    <span>{formatDateTime(item.publishedAt)}</span>
                  </div>
                  <Badge
                    className={item.requiresAction ? 'client-portal-badge client-portal-badge--warning' : 'client-portal-badge'}
                    variant="neutral"
                  >
                    {item.requiresAction ? 'Ação requerida' : 'Informativo'}
                  </Badge>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="client-portal-section client-portal-section--deadlines">
        <div className="client-portal-section-head">
          <div>
            <h5>
              <AlertTriangle size={14} aria-hidden="true" /> Próximos prazos
            </h5>
            <p>Pontos que merecem retorno ou envio ao cliente.</p>
          </div>
          <Badge variant="neutral">{portal.cards.deadlines.length}</Badge>
        </div>
        {portal.cards.deadlines.length === 0 ? (
          <p className="client-portal-empty">Nenhum prazo aberto para acompanhamento no portal.</p>
        ) : (
          <div className="client-portal-list">
            {portal.cards.deadlines.slice(0, 5).map((item) => (
              <article key={item.deadlineId} className="client-portal-list-item">
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.status} · prioridade {item.priority}</p>
                  <span>Vence em {formatDateTime(item.dueDate)}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onOpenProcess(item.processId)}>
                  <Briefcase size={13} aria-hidden="true" /> Abrir processo
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="client-portal-section">
        <div className="client-portal-section-head">
          <div>
            <h5>Histórico visível no portal</h5>
            <p>Linha do tempo consolidada do que o cliente enxerga.</p>
          </div>
          <Badge variant="neutral">{portal.timeline.length}</Badge>
        </div>
        {portal.timeline.length === 0 ? (
          <p className="client-portal-empty">Nenhuma atividade publicada no portal até agora.</p>
        ) : (
          <div className="client-portal-timeline">
            {portal.timeline.slice(0, 8).map((item) => (
              <div key={`${item.entityType}-${item.entityId}`} className="client-portal-timeline-item">
                <div className="client-portal-timeline-marker" aria-hidden="true" />
                <div>
                  <div className="client-portal-timeline-row">
                    <strong>{item.title}</strong>
                    <Badge variant="neutral">{summarizeTimelineType(item.entityType)}</Badge>
                  </div>
                  <p>{item.status} · {item.highlight}</p>
                  <button type="button" className="client-portal-link" onClick={() => onOpenProcess(item.processId)}>
                    {formatDateTime(item.occurredAt)} · abrir processo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
