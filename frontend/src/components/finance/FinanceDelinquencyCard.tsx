import { Mail, Zap } from 'lucide-react'
import type { ApiFinanceDelinquencyContact } from '../../api'

type FinanceDelinquencyCardProps = {
  item: ApiFinanceDelinquencyContact
  formatMoney: (value: number) => string
  canAct?: boolean
  submitting?: boolean
  onCobrar?: () => void
  onSchedule?: () => void
}

export function FinanceDelinquencyCard({
  item,
  formatMoney,
  canAct,
  submitting,
  onCobrar,
  onSchedule,
}: FinanceDelinquencyCardProps) {
  return (
    <article className="fin-delinquency-card">
      {/* Header: client + overdue summary */}
      <div className="fin-delinquency-card__header">
        <div>
          <strong>{item.clientName}</strong>
          <p>{item.contactEmail || item.contactPhone || 'Sem contato cadastrado'}</p>
        </div>
        <div className="fin-delinquency-card__kpi">
          <span className="fin-delinquency-amount">{formatMoney(item.overdueAmountCents)}</span>
          <span className="fin-status-badge fin-status-badge--overdue">
            {item.oldestDaysPastDue}d atraso
          </span>
        </div>
      </div>

      {/* Meta grid */}
      <dl className="fin-delinquency-card__meta">
        <div>
          <dt>Processo</dt>
          <dd>{item.processNumber || item.processTitle || '—'}</dd>
        </div>
        <div>
          <dt>Títulos</dt>
          <dd>{item.overdueEntriesCount} vencido{item.overdueEntriesCount !== 1 ? 's' : ''}</dd>
        </div>
        <div>
          <dt>Parcelas</dt>
          <dd>{item.overdueInstallmentsCount} em atraso</dd>
        </div>
        <div>
          <dt>Última ação</dt>
          <dd>{item.lastCollectionChannel ? `Via ${item.lastCollectionChannel}` : 'Nenhuma'}</dd>
        </div>
      </dl>

      {/* Action bar */}
      <div className="fin-delinquency-card__actions">
        <button
          className="fin-action-btn fin-action-btn--cobrar"
          disabled={!canAct || submitting}
          onClick={onCobrar}
          title={`Gerar cobrança PIX para ${item.overdueEntriesCount} título(s) vencido(s)`}
        >
          <Zap size={11} />
          Cobrar PIX
        </button>
        <button
          className="fin-action-btn"
          disabled={!canAct || submitting}
          onClick={onSchedule}
          title="Agendar régua de cobrança por e-mail"
        >
          <Mail size={11} />
          Agendar Régua
        </button>
        {item.contactEmail && (
          <span className="fin-delinquency-card__contact-hint">
            → {item.contactEmail}
          </span>
        )}
      </div>
    </article>
  )
}
