import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type ApiFinanceAgingReport,
  type ApiFinanceAuditEvent,
  type ApiFinanceCategory,
  type ApiFinanceCashflowReport,
  type ApiFinanceEntry,
} from './api'
import { FinanceMetricCard } from './components/finance/FinanceMetricCard'
import './Financeiro.css'

type User = { id: number; email: string; role: string }
type FinanceTab = 'receber' | 'pagar' | 'inadimplencia' | 'conciliacao'

const initialAging: ApiFinanceAgingReport = {
  referenceDate: new Date().toISOString().slice(0, 10),
  buckets: [
    { label: '0-30', count: 0, amountCents: 0 },
    { label: '31-60', count: 0, amountCents: 0 },
    { label: '61-90', count: 0, amountCents: 0 },
    { label: '90+', count: 0, amountCents: 0 },
  ],
  summary: { totalCount: 0, totalAmountCents: 0 },
  indicators: {
    totalReceivablesCents: 0,
    overdueAmountCents: 0,
    overdueCount: 0,
    currentAmountCents: 0,
    oldestDaysPastDue: 0,
    overdueRatePercent: 0,
  },
}

const initialCashflow: ApiFinanceCashflowReport = {
  totals: { inflowCents: 0, outflowCents: 0, netCents: 0 },
  series: [],
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100)
}

function formatEntryType(type: ApiFinanceEntry['type']) {
  return type === 'receivable' ? 'Receber' : 'Pagar'
}

function buildIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}`
}

export function Financeiro({ user }: { user: User }) {
  const [tab, setTab] = useState<FinanceTab>('receber')
  const [entries, setEntries] = useState<ApiFinanceEntry[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [receivableCategories, setReceivableCategories] = useState<ApiFinanceCategory[]>([])
  const [payableCategories, setPayableCategories] = useState<ApiFinanceCategory[]>([])
  const [aging, setAging] = useState<ApiFinanceAgingReport>(initialAging)
  const [cashflow, setCashflow] = useState<ApiFinanceCashflowReport>(initialCashflow)
  const [audit, setAudit] = useState<ApiFinanceAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  })
  const [form, setForm] = useState({
    type: 'receivable' as ApiFinanceEntry['type'],
    description: '',
    amountCents: '0',
    dueDate: new Date().toISOString().slice(0, 10),
    categoryCode: '',
    notes: '',
  })

  const canEntry = permissions.includes('finance:entry')
  const canBilling = permissions.includes('finance:billing')
  const canSettlement = permissions.includes('finance:settlement')
  const canReconciliation = permissions.includes('finance:reconciliation')
  const canExport = permissions.includes('finance:export')

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (tab === 'receber' && entry.type !== 'receivable') return false
      if (tab === 'pagar' && entry.type !== 'payable') return false
      if (filters.status && entry.status !== filters.status) return false
      return true
    })
  }, [entries, filters.status, tab])

  const categoriesForForm = form.type === 'receivable' ? receivableCategories : payableCategories

  async function loadFinanceData() {
    setLoading(true)
    setError('')
    try {
      const [permissionsRes, entriesRes, receivableRes, payableRes, agingRes, cashflowRes, auditRes] = await Promise.all([
        api.getPermissions(),
        api.getFinanceEntries(),
        api.getFinanceCategories('receivable'),
        api.getFinanceCategories('payable'),
        api.getFinanceAging(new Date().toISOString().slice(0, 10)),
        api.getFinanceCashflow({ from: filters.from, to: filters.to, groupBy: 'month' }),
        api.getFinanceAudit({ limit: 8 }),
      ])

      if (permissionsRes.status !== 200) throw new Error(permissionsRes.error || 'Falha ao carregar permissões')
      if (entriesRes.status !== 200) throw new Error(entriesRes.error || 'Falha ao carregar lançamentos')
      if (receivableRes.status !== 200 || payableRes.status !== 200) throw new Error('Falha ao carregar categorias financeiras')
      if (agingRes.status !== 200) throw new Error(agingRes.error || 'Falha ao carregar aging')
      if (cashflowRes.status !== 200) throw new Error(cashflowRes.error || 'Falha ao carregar fluxo de caixa')
      if (auditRes.status !== 200) throw new Error(auditRes.error || 'Falha ao carregar auditoria')

      setPermissions(permissionsRes.data)
      setEntries(entriesRes.data)
      setReceivableCategories(receivableRes.data)
      setPayableCategories(payableRes.data)
      setAging(agingRes.data)
      setCashflow(cashflowRes.data)
      setAudit(auditRes.data)
      setForm((current) => ({
        ...current,
        categoryCode: current.categoryCode || receivableRes.data[0]?.code || '',
      }))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar financeiro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinanceData()
  }, [filters.from, filters.to])

  async function handleCreateEntry(event: React.FormEvent) {
    event.preventDefault()
    if (!canEntry) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api.createFinanceEntry({
        type: form.type,
        description: form.description,
        amountCents: Number(form.amountCents),
        dueDate: form.dueDate,
        categoryCode: form.categoryCode,
        notes: form.notes || null,
        idempotencyKey: buildIdempotencyKey('entry'),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao criar lançamento')
      }
      setForm((current) => ({ ...current, description: '', amountCents: '0', notes: '' }))
      await loadFinanceData()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar lançamento')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerateBilling(entryId: number, method: 'pix' | 'boleto' | 'payment_link') {
    if (!canBilling) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api.generateFinanceBilling({
        entryId,
        method,
        expiresAt: `${new Date().toISOString().slice(0, 10)}T23:59:59.000Z`,
        recipientEmail: 'financeiro@cliente.local',
        idempotencyKey: buildIdempotencyKey(`billing-${entryId}`),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao gerar cobrança')
      }
      await loadFinanceData()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha ao gerar cobrança')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSettle(entryId: number) {
    if (!canSettlement) return
    setSubmitting(true)
    setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const response = await api.settleFinanceEntry(entryId, {
        settlementDate: today,
        paymentMethod: 'manual',
        idempotencyKey: buildIdempotencyKey(`settle-${entryId}`),
      })
      if (response.status !== 200) {
        throw new Error(response.error || 'Falha ao baixar lançamento')
      }
      await loadFinanceData()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha ao baixar lançamento')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleScheduleCollection(entryId: number) {
    if (!canBilling) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api.scheduleFinanceCollection({
        entryId,
        channel: 'email',
        cadenceDays: 3,
        maxAttempts: 4,
        startsAt: new Date().toISOString(),
        idempotencyKey: buildIdempotencyKey(`collection-${entryId}`),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao agendar régua')
      }
      await loadFinanceData()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha ao agendar régua')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRunMockReconciliation() {
    if (!canReconciliation) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api.runFinanceReconciliation({
        referenceDate: new Date().toISOString().slice(0, 10),
        lines: [
          {
            externalId: `mock-${Date.now()}`,
            occurredAt: new Date().toISOString(),
            amountCents: 125000,
            description: 'Credito honorarios mock',
          },
        ],
        idempotencyKey: buildIdempotencyKey('reconciliation'),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao executar conciliação')
      }
      await loadFinanceData()
      setTab('conciliacao')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha ao executar conciliação')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="finance-page">
      <section className="finance-hero">
        <div>
          <span className="finance-eyebrow">Financeiro real</span>
          <h2>Operação financeira com cobrança, baixa, aging e trilha de auditoria.</h2>
          <p>{user.role === 'ADV' ? 'Visão consultiva para acompanhamento' : 'Painel operacional com foco em execução e fechamento.'}</p>
        </div>

        <div className="finance-actions">
          <button className="btn-secondary" onClick={() => void loadFinanceData()} disabled={loading || submitting}>Atualizar</button>
          <button className="btn-primary" onClick={() => void handleRunMockReconciliation()} disabled={!canReconciliation || submitting}>Conciliação mock</button>
        </div>
      </section>

      <section className="finance-metrics-grid">
        <FinanceMetricCard label="Recebíveis" value={formatMoney(aging.indicators.totalReceivablesCents)} detail="Carteira aberta" />
        <FinanceMetricCard label="Inadimplência" value={formatMoney(aging.indicators.overdueAmountCents)} tone="danger" detail={`${aging.indicators.overdueRatePercent}% da carteira`} />
        <FinanceMetricCard label="Fluxo líquido" value={formatMoney(cashflow.totals.netCents)} tone={cashflow.totals.netCents >= 0 ? 'success' : 'warning'} detail="Período filtrado" />
        <FinanceMetricCard label="Maior atraso" value={`${aging.indicators.oldestDaysPastDue} dias`} tone="warning" detail={`${aging.indicators.overdueCount} títulos vencidos`} />
      </section>

      <section className="finance-toolbar">
        <div className="finance-tabs" role="tablist" aria-label="Visões financeiras">
          {[
            ['receber', 'Contas a receber'],
            ['pagar', 'Contas a pagar'],
            ['inadimplencia', 'Inadimplência'],
            ['conciliacao', 'Conciliação'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? 'is-active' : ''}
              onClick={() => setTab(value as FinanceTab)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="finance-filters">
          <input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
          <input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">Todos os status</option>
            <option value="open">Em aberto</option>
            <option value="overdue">Vencido</option>
            <option value="paid">Pago</option>
            <option value="partially_paid">Parcial</option>
          </select>
        </div>
      </section>

      {error ? <p className="finance-error">{error}</p> : null}

      <div className="finance-layout">
        <section className="finance-panel">
          <header className="finance-panel__header">
            <div>
              <h3>{tab === 'receber' ? 'Recebimentos operacionais' : tab === 'pagar' ? 'Pagamentos operacionais' : tab === 'inadimplencia' ? 'Aging e inadimplência' : 'Conciliação e histórico'}</h3>
              <p>{tab === 'inadimplencia' ? 'Faixas de atraso e exposição da carteira.' : tab === 'conciliacao' ? 'Auditoria recente do módulo financeiro.' : 'Acompanhe status, cobrança e baixa por lançamento.'}</p>
            </div>
          </header>

          {loading ? <div className="finance-empty">Carregando financeiro...</div> : null}

          {!loading && (tab === 'receber' || tab === 'pagar') ? (
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Status</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Cobrança</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>#{entry.id}</td>
                      <td>{formatEntryType(entry.type)}</td>
                      <td>
                        <strong>{entry.description}</strong>
                        <span>{entry.categoryLabel}</span>
                      </td>
                      <td><span className={`finance-status finance-status--${entry.status}`}>{entry.status}</span></td>
                      <td>{entry.dueDate}</td>
                      <td>{formatMoney(entry.amountCents)}</td>
                      <td>{entry.chargeStatus || 'sem cobrança'}</td>
                      <td>
                        <div className="finance-actions-inline">
                          {entry.type === 'receivable' ? <button onClick={() => void handleGenerateBilling(entry.id, 'pix')} disabled={!canBilling || submitting}>Cobrar</button> : null}
                          {entry.type === 'receivable' ? <button onClick={() => void handleScheduleCollection(entry.id)} disabled={!canBilling || submitting}>Régua</button> : null}
                          <button onClick={() => void handleSettle(entry.id)} disabled={!canSettlement || submitting || entry.status === 'paid'}>Baixar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visibleEntries.length ? <div className="finance-empty">Nenhum lançamento encontrado para os filtros atuais.</div> : null}
            </div>
          ) : null}

          {!loading && tab === 'inadimplencia' ? (
            <div className="finance-aging-grid">
              {aging.buckets.map((bucket) => (
                <div key={bucket.label} className="finance-aging-card">
                  <p>{bucket.label}</p>
                  <strong>{formatMoney(bucket.amountCents)}</strong>
                  <span>{bucket.count} lançamentos</span>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && tab === 'conciliacao' ? (
            <div className="finance-audit-list">
              {audit.map((event) => (
                <article key={event.id} className="finance-audit-item">
                  <div>
                    <strong>{event.summary}</strong>
                    <span>{event.scope}</span>
                  </div>
                  <div>
                    <span className={`finance-status finance-status--${event.status}`}>{event.status}</span>
                    <time>{new Date(event.occurredAt).toLocaleString('pt-BR')}</time>
                  </div>
                </article>
              ))}
              {!audit.length ? <div className="finance-empty">Nenhum evento de auditoria financeira disponível.</div> : null}
            </div>
          ) : null}
        </section>

        <aside className="finance-panel finance-panel--sidebar">
          <header className="finance-panel__header">
            <div>
              <h3>Novo lançamento</h3>
              <p>Crie títulos de receber ou pagar sem sair da operação.</p>
            </div>
          </header>

          <form className="finance-form" onSubmit={handleCreateEntry}>
            <label>
              Tipo
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  type: event.target.value as ApiFinanceEntry['type'],
                  categoryCode: event.target.value === 'receivable' ? receivableCategories[0]?.code || '' : payableCategories[0]?.code || '',
                }))}
              >
                <option value="receivable">Receber</option>
                <option value="payable">Pagar</option>
              </select>
            </label>
            <label>
              Descrição
              <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: Parcela de honorários" />
            </label>
            <label>
              Valor (centavos)
              <input type="number" min="0" value={form.amountCents} onChange={(event) => setForm((current) => ({ ...current, amountCents: event.target.value }))} />
            </label>
            <label>
              Vencimento
              <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label>
              Categoria
              <select value={form.categoryCode} onChange={(event) => setForm((current) => ({ ...current, categoryCode: event.target.value }))}>
                {categoriesForForm.map((category) => (
                  <option key={category.code} value={category.code}>{category.label}</option>
                ))}
              </select>
            </label>
            <label>
              Observações
              <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={4} />
            </label>
            <button className="btn-primary" type="submit" disabled={!canEntry || submitting}>Criar lançamento</button>
          </form>

          <div className="finance-mini-report">
            <h4>Fluxo no período</h4>
            <ul>
              {cashflow.series.slice(-4).map((point) => (
                <li key={point.date}>
                  <span>{point.date}</span>
                  <strong>{formatMoney(point.netCents)}</strong>
                </li>
              ))}
            </ul>
            {!cashflow.series.length ? <div className="finance-empty finance-empty--small">Sem série disponível no período selecionado.</div> : null}
            {!canExport ? <p className="finance-note">Exportação liberada apenas para papéis com permissão financeira.</p> : null}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default Financeiro
