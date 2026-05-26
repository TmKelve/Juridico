import type { ApiOriginReference } from '../../api';
import { Button } from '../ui';
import { OriginBadgeRow } from '../audit/OriginBadgeRow';
import { formatOriginLabel } from '../audit/origin-model';

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
  return (
    <section className={`crm-origin-summary${compact ? ' crm-origin-summary--compact' : ''}`}>
      <div className="crm-origin-summary__top">
        <div>
          <span className="crm-origin-summary__eyebrow">Origem do pipeline</span>
          <strong>{originReference?.originLabel || formatOriginLabel(source)}</strong>
        </div>
        {onOpenDetails ? (
          <Button variant="ghost" size="sm" onClick={onOpenDetails}>
            Ver evidencia
          </Button>
        ) : null}
      </div>
      <p>
        {originReference?.originKind === 'publication'
          ? 'Registro ja consolidado como publicacao operacional.'
          : 'Registro ainda depende da trilha de captura/sinal para explicar sua origem.'}
      </p>
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
