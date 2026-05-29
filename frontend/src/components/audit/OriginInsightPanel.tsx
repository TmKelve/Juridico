import type { ReactNode } from 'react';

import type {
  ApiDerivedActionRecord,
  ApiOriginReference,
  ApiPublicationCapture,
  ApiPublicationPipelineItem,
} from '../../api';
import { Button } from '../ui';
import { OriginBadgeRow } from './OriginBadgeRow';
import { buildOriginOperationalSummary, formatOriginLabel } from './origin-model';
import { PipelineTimeline } from '../timeline/PipelineTimeline';

import './origin-insight.css';

interface OriginInsightPanelProps {
  title: string;
  originReference: ApiOriginReference | null;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  capture: ApiPublicationCapture | null;
  timeline: ApiPublicationPipelineItem[];
  derivedActions: ApiDerivedActionRecord[];
  loading?: boolean;
  error?: string;
  fallbackEvidenceText?: string;
  summary?: string;
  footer?: ReactNode;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function OriginInsightPanel({
  title,
  originReference,
  originStage,
  pipelineStatus,
  consolidationStatus,
  capture,
  timeline,
  derivedActions,
  loading = false,
  error = '',
  fallbackEvidenceText = '',
  summary = '',
  footer = null,
}: OriginInsightPanelProps) {
  const evidenceText = capture?.evidenceText || capture?.normalizedText || fallbackEvidenceText || summary;
  const operationalSummary = buildOriginOperationalSummary({
    originReference,
    sourceType: originReference?.sourceType || capture?.sourceType || null,
    pipelineStatus,
    consolidationStatus,
  });
  const publicationUrl = originReference?.publicationUrl;
  const timelineUrl = originReference?.timelineUrl;
  const evidenceAvailable = Boolean(capture || originReference?.evidenceUrl);

  return (
    <section className="origin-panel">
      <div className="origin-panel__header">
        <div>
          <span className="origin-panel__eyebrow">Origem explicita</span>
          <h4>{title}</h4>
        </div>
        {loading ? <span className="origin-panel__loading">Carregando...</span> : null}
      </div>

      <OriginBadgeRow
        originReference={originReference}
        originStage={originStage}
        pipelineStatus={pipelineStatus}
        consolidationStatus={consolidationStatus}
      />

      <div className="origin-panel__decision">
        <div>
          <span>Por que este item apareceu aqui</span>
          <strong>{operationalSummary.headline}</strong>
          <p>{operationalSummary.detail}</p>
        </div>
        <div>
          <span>O que verificar agora</span>
          <strong>{operationalSummary.nextStep}</strong>
          <p>{derivedActions.length > 0 ? `${derivedActions.length} acao(oes) derivada(s) ja registrada(s).` : 'Nenhuma acao derivada persistida ainda para esta origem.'}</p>
        </div>
      </div>

      <div className="origin-panel__cta-row">
        {evidenceAvailable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (originReference?.evidenceUrl) {
                window.open(originReference.evidenceUrl, '_blank', 'noopener,noreferrer');
                return;
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Ver evidencia da captura
          </Button>
        ) : null}
        {publicationUrl ? (
          <Button variant="outline" size="sm" onClick={() => { window.open(publicationUrl, '_blank', 'noopener,noreferrer'); }}>
            Abrir publicacao consolidada
          </Button>
        ) : null}
        {timelineUrl ? (
          <Button variant="ghost" size="sm" onClick={() => { window.open(timelineUrl, '_blank', 'noopener,noreferrer'); }}>
            Ver timeline da origem
          </Button>
        ) : null}
      </div>

      <div className="origin-panel__grid">
        <div>
          <span>Rastro principal</span>
          <strong>{originReference?.originLabel || 'Origem ainda nao expandida pelo backend'}</strong>
        </div>
        <div>
          <span>Referencia</span>
          <strong>{originReference?.sourceReference || capture?.sourceReference || '—'}</strong>
        </div>
        <div>
          <span>Correlation ID</span>
          <strong>{originReference?.correlationId || capture?.correlationId || '—'}</strong>
        </div>
        <div>
          <span>Ocorrencia</span>
          <strong>{capture?.occurredAt ? formatDateTime(capture.occurredAt) : '—'}</strong>
        </div>
      </div>

      <div className="origin-panel__section">
        <div className="origin-panel__section-head">
          <strong>Captura vs publicacao</strong>
          <span>{originReference ? formatOriginLabel(originReference.originKind) : 'Sem detalhamento de origem'}</span>
        </div>
        <p>{evidenceText || 'O backend atual ainda nao expande o texto bruto da captura para este item.'}</p>
      </div>

      <div className="origin-panel__section">
        <div className="origin-panel__section-head">
          <strong>Timeline ponta a ponta</strong>
          <span>{timeline.length} evento(s)</span>
        </div>
        <PipelineTimeline items={timeline} emptyMessage="Sem timeline expandida para esta origem." />
      </div>

      <div className="origin-panel__section">
        <div className="origin-panel__section-head">
          <strong>Acoes derivadas</strong>
          <span>{derivedActions.length} registrada(s)</span>
        </div>
        {derivedActions.length === 0 ? (
          <p className="origin-muted">Nenhuma acao derivada retornada para esta origem.</p>
        ) : (
          <div className="origin-action-list">
            {derivedActions.map((item) => (
              <article key={`${item.entityType}-${item.entityId}`} className="origin-action-card">
                <div className="origin-action-card__top">
                  <strong>{item.title}</strong>
                  <span className={`origin-inline-status origin-inline-status--${item.status === 'completed' ? 'success' : 'neutral'}`}>
                    {formatOriginLabel(item.entityType)}
                  </span>
                </div>
                <p>{item.summary || item.sourceReference}</p>
                <small>{formatDateTime(item.createdAt)}</small>
                {item.url ? (
                  <div className="origin-action-card__cta">
                    <Button variant="ghost" size="sm" onClick={() => { window.open(item.url as string, '_blank', 'noopener,noreferrer'); }}>
                      Abrir entidade
                    </Button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      {error ? <div className="origin-panel__error">{error}</div> : null}
      {footer}
    </section>
  );
}
