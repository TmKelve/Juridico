import type { ApiFinanceDelinquencyContact } from '../../api'

type FinanceDelinquencyCardProps = {
  item: ApiFinanceDelinquencyContact
  formatMoney: (value: number) => string
}

export function FinanceDelinquencyCard({ item, formatMoney }: FinanceDelinquencyCardProps) {
  return (
    <article className="finance-delinquency-card">
      <div className="finance-delinquency-card__header">
        <div>
          <strong>{item.clientName}</strong>
          <p>{item.contactName || 'Contato principal não informado'}</p>
        </div>
        <span className="finance-status finance-status--overdue">{item.oldestDaysPastDue} dias</span>
      </div>

      <dl className="finance-delinquency-card__meta">
        <div>
          <dt>Contato</dt>
          <dd>{item.contactEmail || item.contactPhone || 'Sem canal cadastrado'}</dd>
        </div>
        <div>
          <dt>Processo</dt>
          <dd>{item.processNumber || item.processTitle || 'Sem processo vinculado'}</dd>
        </div>
        <div>
          <dt>Em atraso</dt>
          <dd>{formatMoney(item.overdueAmountCents)}</dd>
        </div>
        <div>
          <dt>Títulos vencidos</dt>
          <dd>{item.overdueEntriesCount}</dd>
        </div>
      </dl>

      <div className="finance-delinquency-card__footer">
        <span>{item.overdueInstallmentsCount} parcelas em atraso</span>
        <span>{item.lastCollectionChannel ? `Última régua: ${item.lastCollectionChannel}` : 'Sem tentativa registrada'}</span>
      </div>
    </article>
  )
}
