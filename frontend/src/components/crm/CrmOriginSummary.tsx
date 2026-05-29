import type { ApiOriginReference } from '../../api';
import { Button } from '../ui';
import { OriginBadgeRow } from '../audit/OriginBadgeRow';
import { buildOriginOperationalSummary, formatOriginLabel } from '../audit/origin-model';

import './crm-origin-summary.css';

interface CrmOriginSummaryProps {
  originReference: ApiOriginReference | null;
  source: string;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  onOpenDetails?: (() => void) | null;
  compact?: boolean;
}

export function CrmOriginSummary({
  originReference,
  source,
  originStage,
  pipelineStatus,
  consolidationStatus,
  onOpenDetails = null,
  compact = false,
}: CrmOriginSummaryProps) {
  const summary = buildOriginOperationalSummary({
    originReference,
    sourceType: source,
    pipelineStatus,
    consolidationStatus,
  });

  return (
    <section className={`crm-origin-summary${compact ? ' crm-origin-summary--compact' : ''}`}>
      <div className="crm-origin-summary__top">
        <div>
          <span className="crm-origin-summary__eyebrow">Origem do pipeline</span>
          <strong>{originReference?.originLabel || formatOriginLabel(source)}</strong>
          <p className="crm-origin-summary__headline">{summary.headline}</p>
        </div>
        {onOpenDetails ? (
          <Button variant="ghost" size="sm" onClick={onOpenDetails}>
            Ver origem
          </Button>
        ) : null}
      </div>
      <p>{summary.detail}</p>
      <div className="crm-origin-summary__facts">
        <div>
          <span>Veio de</span>
          <strong>{summary.sourceLabel}</strong>
        </div>
        <div>
          <span>Consolidacao</span>
          <strong>{summary.consolidationLabel}</strong>
        </div>
      </div>
      <small className="crm-origin-summary__next-step">{summary.nextStep}</small>
      <OriginBadgeRow
        originReference={originReference}
        originStage={originStage}
        pipelineStatus={pipelineStatus}
        consolidationStatus={consolidationStatus}
        compact
      />
    </section>
  );
}
