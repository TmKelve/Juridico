import type { ApiPublicationPipelineItem } from '../../api';
import { formatOriginLabel, getStatusTone } from '../audit/origin-model';

import '../audit/origin-insight.css';

interface PipelineTimelineProps {
  items: ApiPublicationPipelineItem[];
  emptyMessage?: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function PipelineTimeline({
  items,
  emptyMessage = 'Sem eventos de pipeline disponiveis.',
}: PipelineTimelineProps) {
  if (!items.length) {
    return <p className="origin-muted">{emptyMessage}</p>;
  }

  return (
    <ol className="origin-timeline">
      {items.map((item) => (
        <li key={`${item.id}-${item.entityType}`} className="origin-timeline__item">
          <div className={`origin-timeline__dot origin-timeline__dot--${getStatusTone(item.status || item.stage)}`} />
          <div className="origin-timeline__card">
            <div className="origin-timeline__top">
              <strong>{item.title}</strong>
              <span className={`origin-inline-status origin-inline-status--${getStatusTone(item.status || item.stage)}`}>
                {formatOriginLabel(item.status || item.stage)}
              </span>
            </div>
            <p>{item.summary}</p>
            <small>
              {formatDateTime(item.occurredAt)}
              {item.sourceReference ? ` · ${item.sourceReference}` : ''}
            </small>
          </div>
        </li>
      ))}
    </ol>
  );
}
