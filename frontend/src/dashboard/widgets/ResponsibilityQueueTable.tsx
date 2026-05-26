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

      {highlights.length > 0 && (
        <section className="priority-stack" aria-label="Itens prioritários">
          {highlights.map((row) => (
            <article
              key={row.id}
              className={`priority-card ${selectedItemId === row.id ? 'is-selected' : ''}`}
              data-sla={getSlaUrgency(row.sla)}
              onClick={() => onItemOpen(row)}
              role="button"
              tabIndex={0}
              aria-label={`Abrir detalhes: ${row.title}`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemOpen(row); } }}
            >
              <header className="priority-card-header">
                <span className={`sla-badge sla-${getSlaUrgency(row.sla)}`}>{row.sla}</span>
                <span className="priority-card-phase-tag">{row.phase}</span>
              </header>

              <div className="priority-card-body">
                <h3 className="priority-card-title">{row.title}</h3>
                <p className="priority-card-client">{row.client} · #{row.id}</p>
                <p className="priority-card-summary">{row.pendingSummary}</p>
              </div>

              <footer className="priority-card-footer">
                <div className="priority-card-owner">
                  <span className="priority-card-avatar" aria-hidden="true">
                    {row.owner.charAt(0).toUpperCase()}
                  </span>
                  <span className="priority-card-owner-name">{row.owner}</span>
                </div>
                <span className="queue-status-dot" data-status={row.status}>{row.status}</span>
                <button
                  className="priority-card-cta"
                  onClick={(e) => { e.stopPropagation(); onItemOpen(row); }}
                  aria-label={`Ver detalhe: ${row.title}`}
                >
                  <Eye size={15} aria-hidden="true" />
                </button>
              </footer>
            </article>
          ))}
        </section>
      )}

      <div className="queue-table-header">
        <div>
          <h3>Fila completa</h3>
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
