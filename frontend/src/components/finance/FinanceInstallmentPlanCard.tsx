import { AlertTriangle, Calendar, CheckCircle2, Clock, CreditCard } from 'lucide-react'
import type { ApiFinanceInstallmentPlan } from '../../api'

type Props = {
  plan: ApiFinanceInstallmentPlan
  formatMoney: (value: number) => string
  isActive?: boolean
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Ativo',     cls: 'fin-plan-chip--active'    },
  defaulted: { label: 'Inadimpl.', cls: 'fin-plan-chip--defaulted' },
  completed: { label: 'Concluído', cls: 'fin-plan-chip--completed' },
  cancelled: { label: 'Cancelado', cls: 'fin-plan-chip--cancelled' },
  draft:     { label: 'Rascunho', cls: 'fin-plan-chip--draft'      },
}

function formatDateShort(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function FinanceInstallmentPlanCard({ plan, formatMoney, isActive }: Props) {
  const { label: statusLabel, cls: statusCls } = STATUS_MAP[plan.status] ?? STATUS_MAP.active
  const total   = plan.installmentCount
  const paid    = plan.metrics.paidCount
  const overdue = plan.metrics.overdueCount
  const pct     = total > 0 ? Math.round((paid / total) * 100) : 0

  return (
    <article className={`fin-plan-card${isActive ? ' is-active' : ''}`}>
      {/* ── Top row ── */}
      <div className="fin-plan-card__top">
        <p className="fin-plan-card__title">{plan.contractLabel}</p>
        <span className={`fin-plan-chip ${statusCls}`}>{statusLabel}</span>
      </div>

      {/* ── Client + process ── */}
      <p className="fin-plan-card__client">{plan.clientName}</p>
      {(plan.processNumber || plan.processTitle) && (
        <p className="fin-plan-card__process">
          {plan.processNumber ?? plan.processTitle}
        </p>
      )}

      {/* ── Progress bar ── */}
      <div className="fin-plan-card__progress">
        <div className="fin-plan-progress-bar">
          <div
            className={`fin-plan-progress-fill${overdue > 0 ? ' has-overdue' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="fin-plan-progress-label">
          {paid}/{total} <span>parcelas</span>
        </span>
      </div>

      {/* ── Meta pills ── */}
      <div className="fin-plan-card__pills">
        <span className="fin-plan-pill">
          <CreditCard size={11} />
          {formatMoney(plan.installmentAmountCents)}/parc
        </span>
        <span className="fin-plan-pill">
          <Calendar size={11} />
          dia {plan.dayOfMonth}
        </span>
        {plan.nextDueDate && (
          <span className="fin-plan-pill">
            <Clock size={11} />
            {formatDateShort(plan.nextDueDate)}
          </span>
        )}
      </div>

      {/* ── Counters ── */}
      <div className="fin-plan-card__counts">
        <span className="fin-plan-count fin-plan-count--paid">
          <CheckCircle2 size={12} />
          {paid} paga{paid !== 1 ? 's' : ''}
        </span>
        {overdue > 0 && (
          <span className="fin-plan-count fin-plan-count--overdue">
            <AlertTriangle size={12} />
            {overdue} atrasada{overdue !== 1 ? 's' : ''}
          </span>
        )}
        <span className="fin-plan-count fin-plan-count--remaining">
          {plan.metrics.remainingCount} a vencer
        </span>
      </div>
    </article>
  )
}
