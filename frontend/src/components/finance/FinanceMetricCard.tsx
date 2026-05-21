type FinanceMetricCardProps = {
  label: string
  value: string
  tone?: 'default' | 'success' | 'danger' | 'warning'
  detail?: string
}

export function FinanceMetricCard({ label, value, tone = 'default', detail }: FinanceMetricCardProps) {
  return (
    <article className={`finance-metric-card finance-metric-card--${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <span>{detail}</span> : null}
    </article>
  )
}
