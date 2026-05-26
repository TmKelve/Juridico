import type { ApiOriginReference } from '../../api';
import { formatOriginLabel, getStatusTone } from './origin-model';

import './origin-insight.css';

interface OriginBadgeRowProps {
  originReference: ApiOriginReference | null;
  originStage?: string | null;
  pipelineStatus?: string | null;
  consolidationStatus?: string | null;
  compact?: boolean;
}

function renderBadge(label: string, value?: string | null) {
  if (!value) return null;
  return (
    <span className={`origin-badge origin-badge--${getStatusTone(value)}`}>
      <strong>{label}</strong>
      {formatOriginLabel(value)}
    </span>
  );
}

export function OriginBadgeRow({
  originReference,
  originStage,
  pipelineStatus,
  consolidationStatus,
  compact = false,
}: OriginBadgeRowProps) {
  if (!originReference && !originStage && !pipelineStatus && !consolidationStatus) return null;

  return (
    <div className={`origin-badge-row${compact ? ' origin-badge-row--compact' : ''}`}>
      {originReference ? (
        <span className="origin-badge origin-badge--neutral">
          <strong>Origem</strong>
          {formatOriginLabel(originReference.originKind)}
        </span>
      ) : null}
      {renderBadge('Estagio', originReference?.originStage ?? originStage)}
      {renderBadge('Pipeline', originReference?.pipelineStatus ?? pipelineStatus)}
      {renderBadge('Consolidacao', originReference?.consolidationStatus ?? consolidationStatus)}
    </div>
  );
}
