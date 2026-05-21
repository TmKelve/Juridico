import { Eye, Inbox, ListFilter } from 'lucide-react';
import type { QueueFilter, ResponsibilityItem } from '../types';
import { EmptyState } from './EmptyState';

function getSlaUrgency(sla: string): 'urgent' | 'today' | 'ok' {
  const lower = sla.toLowerCase();
  if (lower.includes('atrasado') || lower.includes('vencido') || lower.includes('urgente') || lower.includes('1h') || lower.includes('2h')) {
    return 'urgent';
  }
  if (lower.includes('hoje') || lower.includes('3h') || lower.includes('4h') || lower.includes('5h') || lower.includes('6h')) {
    return 'today';
  }
  return 'ok';
}

interface ResponsibilityQueueTableProps {
  items: ResponsibilityItem[];
  selectedItemId?: number | string;
  queueFilter: QueueFilter;
  selectedPhase: string | null;
  onQueueFilterChange: (filter: QueueFilter) => void;
  onItemOpen: (item: ResponsibilityItem) => void;
}

export function ResponsibilityQueueTable({
  items,
  selectedItemId,
  queueFilter,
  selectedPhase,
  onQueueFilterChange,
  onItemOpen,
}: ResponsibilityQueueTableProps) {
  const highlights = items.slice(0, 3);
  const remaining = items.slice(3);

  return (
    <div className="panel panel-main">
      <div className="panel-head">
        <h2>Prioridades do dia</h2>
        <span>{items.length} itens ativos</span>
      </div>

      <div className="queue-filters">
        <button className={`filter-chip ${queueFilter === 'todos' ? 'active' : ''}`} onClick={() => onQueueFilterChange('todos')}>
          <ListFilter size={14} aria-hidden="true" />
          Todos
        </button>
        <button className={`filter-chip ${queueFilter === 'hoje' ? 'active' : ''}`} onClick={() => onQueueFilterChange('hoje')}>
          Hoje
        </button>
        <button className={`filter-chip ${queueFilter === 'atrasados' ? 'active' : ''}`} onClick={() => onQueueFilterChange('atrasados')}>
          Atrasados
        </button>
        <button className={`filter-chip ${queueFilter === 'amanha' ? 'active' : ''}`} onClick={() => onQueueFilterChange('amanha')}>
          Amanhã
        </button>
        {selectedPhase && <span className="phase-chip">Fase: {selectedPhase}</span>}
      </div>

      <div className="queue-snapshot" aria-label="Resumo da fila">
        <div className="queue-snapshot-card">
          <span className="queue-snapshot-label">Em destaque</span>
          <strong>{highlights.length}</strong>
          <small>prioridades com ação imediata</small>
        </div>
        <div className="queue-snapshot-card">
          <span className="queue-snapshot-label">Na fila detalhada</span>
          <strong>{remaining.length > 0 ? remaining.length : items.length}</strong>
          <small>itens para varredura completa</small>
        </div>
      </div>

      {highlights.length > 0 && (
        <section className="priority-stack" aria-label="Itens prioritários">
          {highlights.map((row) => (
            <article
              key={row.id}
              className={`priority-card ${selectedItemId === row.id ? 'is-selected' : ''}`}
              data-sla={getSlaUrgency(row.sla)}
            >
              <div className="priority-card-main">
                <div className="priority-card-headline">
                  <span className="priority-card-kicker">{row.type === 'hoje' ? 'Atuação hoje' : row.type === 'atrasados' ? 'Atrasado' : 'Próximo período'}</span>
                  <span className={`sla-badge sla-${getSlaUrgency(row.sla)}`}>{row.sla}</span>
                </div>
                <h3>{row.title}</h3>
                <p>{row.client} • Processo #{row.id} • {row.phase}</p>
                <small>{row.pendingSummary}</small>
              </div>

              <div className="priority-card-meta">
                <div>
                  <span className="priority-card-label">Responsável</span>
                  <strong>{row.owner}</strong>
                </div>
                <div>
                  <span className="priority-card-label">Status</span>
                  <span className="queue-status-dot" data-status={row.status}>
                    {row.status}
                  </span>
                </div>
              </div>

              <div className="priority-card-actions">
                <button className="btn-primary btn-small" onClick={() => onItemOpen(row)}>
                  <Eye size={14} aria-hidden="true" />
                  Ver detalhe
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="queue-table-header">
        <div>
          <h3>Fila completa</h3>
          <p>Continue pela lista detalhada quando precisar varrer a carteira inteira.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="processes-table">
          <thead>
            <tr>
              <th scope="col">Processo</th>
              <th scope="col">Contexto</th>
              <th scope="col">Responsável</th>
              <th scope="col">SLA</th>
              <th scope="col">Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              (remaining.length > 0 ? remaining : items).map((row) => (
                <tr
                  key={row.id}
                  className={`queue-row ${selectedItemId === row.id ? 'is-selected' : ''}`}
                  tabIndex={0}
                  role="button"
                  aria-label={`Abrir detalhes do processo ${row.id}`}
                  onClick={() => onItemOpen(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onItemOpen(row);
                    }
                  }}
                >
                  <td className="queue-title">
                    <div>#{row.id} • {row.title}</div>
                    <small>{row.pendingSummary}</small>
                    <span className="queue-mobile-meta">
                      {row.client} • {row.owner} • {row.phase}
                    </span>
                  </td>
                  <td>
                    <div className="queue-context-cell">
                      <strong>{row.client}</strong>
                      <small>{row.phase}</small>
                    </div>
                  </td>
                  <td>{row.owner}</td>
                  <td>
                    <span className={`sla-badge sla-${getSlaUrgency(row.sla)}`}>{row.sla}</span>
                  </td>
                  <td>
                    <button
                      className="btn-small"
                      onClick={(event) => {
                        event.stopPropagation();
                        onItemOpen(row);
                      }}
                    >
                      <Eye size={14} aria-hidden="true" />
                      Abrir
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={Inbox}
                    title="Sem itens na fila para este filtro."
                    description="Tente mudar o filtro ou aguarde novas atribuições."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
