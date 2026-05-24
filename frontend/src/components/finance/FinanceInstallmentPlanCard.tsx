import type { ApiFinanceInstallmentPlan } from '../../api'

type FinanceInstallmentPlanCardProps = {
  plan: ApiFinanceInstallmentPlan
  formatMoney: (value: number) => string
}

export function FinanceInstallmentPlanCard({ plan, formatMoney }: FinanceInstallmentPlanCardProps) {
  return (
    <article className="finance-plan-card">
      <div className="finance-plan-card__header">
        <div>
          <strong>{plan.contractLabel}</strong>
          <p>{plan.clientName}</p>
        </div>
        <span className={`finance-status finance-status--${plan.status}`}>{plan.status}</span>
      </div>

      <dl className="finance-plan-card__meta">
        <div>
          <dt>Processo</dt>
          <dd>{plan.processNumber || plan.processTitle || 'Sem processo vinculado'}</dd>
        </div>
        <div>
          <dt>Parcela padrão</dt>
          <dd>{formatMoney(plan.installmentAmountCents)}</dd>
        </div>
        <div>
          <dt>Próximo vencimento</dt>
          <dd>{plan.nextDueDate || 'Sem agenda futura'}</dd>
        </div>
        <div>
          <dt>Dia base</dt>
          <dd>Todo dia {plan.dayOfMonth}</dd>
        </div>
      </dl>

      <div className="finance-plan-card__kpis">
        <span>Pagas: {plan.metrics.paidCount}</span>
        <span>Em dia: {plan.metrics.onTimeCount}</span>
        <span>Atrasadas: {plan.metrics.overdueCount}</span>
        <span>Faltam: {plan.metrics.remainingCount}</span>
      </div>
    </article>
  )
}
