import { useEffect, useMemo, useState } from 'react'
import {
  api,
  type ApiClient,
  type ApiFinanceAgingReport,
  type ApiFinanceAuditEvent,
  type ApiFinanceCategory,
  type ApiFinanceCashflowReport,
  type ApiFinanceDelinquencyContact,
  type ApiFinanceEntry,
  type ApiFinanceInstallmentPlan,
  type ApiProcess,
} from './api'
import { ProcessCombobox } from './ProcessCombobox'
import { FinanceDelinquencyCard } from './components/finance/FinanceDelinquencyCard'
import { FinanceInstallmentPlanCard } from './components/finance/FinanceInstallmentPlanCard'
import { FinanceMetricCard } from './components/finance/FinanceMetricCard'
import './Financeiro.css'

type User = { id: number; email: string; role: string }
type FinanceTab = 'receber' | 'pagar' | 'inadimplencia' | 'conciliacao' | 'parcelamentos'
type LoadCapability = 'native' | 'derived' | 'unavailable' | 'error'

const today = new Date()

const initialAging: ApiFinanceAgingReport = {
  referenceDate: today.toISOString().slice(0, 10),
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

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
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

function dayDiff(referenceDate: string, dueDate: string) {
  const reference = new Date(`${referenceDate}T00:00:00`).getTime()
  const due = new Date(`${dueDate}T00:00:00`).getTime()
  return Math.max(0, Math.floor((reference - due) / 86400000))
}

function buildProcessLabel(process: ApiProcess) {
  return process.processNumber ? `${process.processNumber} · ${process.title}` : process.title
}

function matchesClient(process: ApiProcess, client: ApiClient | undefined) {
  if (!client) return true
  return process.client.trim().toLowerCase() === client.name.trim().toLowerCase()
}

function deriveDelinquencyContacts(
  entries: ApiFinanceEntry[],
  clients: ApiClient[],
  processes: ApiProcess[],
  referenceDate: string,
  filters: { clientId: string; processId: string },
): ApiFinanceDelinquencyContact[] {
  const grouped = new Map<string, ApiFinanceDelinquencyContact>()
  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const processesById = new Map(processes.map((process) => [process.id, process]))

  entries
    .filter((entry) => entry.type === 'receivable')
    .filter((entry) => entry.status === 'overdue' || (entry.status === 'open' && dayDiff(referenceDate, entry.dueDate) > 0))
    .filter((entry) => !filters.clientId || String(entry.clientId ?? '') === filters.clientId)
    .filter((entry) => !filters.processId || String(entry.processId ?? '') === filters.processId)
    .forEach((entry) => {
      const client = entry.clientId ? clientsById.get(entry.clientId) : undefined
      const process = entry.processId ? processesById.get(entry.processId) : undefined
      const key = `${entry.clientId ?? 'none'}:${entry.processId ?? 'none'}`
      const current = grouped.get(key)
      const daysPastDue = dayDiff(referenceDate, entry.dueDate)

      if (!current) {
        grouped.set(key, {
          id: key,
          clientId: entry.clientId ?? null,
          clientName: entry.clientName || client?.name || process?.client || 'Cliente não vinculado',
          contactName: client?.name || entry.clientName || null,
          contactEmail: entry.clientEmail || client?.email || null,
          contactPhone: entry.clientPhone || client?.phone || null,
          processId: entry.processId ?? null,
          processTitle: entry.processTitle || process?.title || null,
          processNumber: entry.processNumber || process?.processNumber || null,
          overdueEntriesCount: 1,
          overdueInstallmentsCount: entry.installmentPlanId ? 1 : 0,
          overdueAmountCents: entry.amountCents - entry.settledAmountCents,
          oldestDaysPastDue: daysPastDue,
          nextActionAt: null,
          lastCollectionChannel: null,
          lastCollectionOutcome: null,
          entries: [entry],
        })
        return
      }

      current.overdueEntriesCount += 1
      current.overdueInstallmentsCount += entry.installmentPlanId ? 1 : 0
      current.overdueAmountCents += entry.amountCents - entry.settledAmountCents
      current.oldestDaysPastDue = Math.max(current.oldestDaysPastDue, daysPastDue)
      current.entries.push(entry)
    })

  return [...grouped.values()].sort((left, right) => right.overdueAmountCents - left.overdueAmountCents)
}

export function Financeiro({ user }: { user: User }) {
  const [tab, setTab] = useState<FinanceTab>('receber')
  const [entries, setEntries] = useState<ApiFinanceEntry[]>([])
  const [permissions, setPermissions] = useState<string[]>([])
  const [clients, setClients] = useState<ApiClient[]>([])
  const [processes, setProcesses] = useState<ApiProcess[]>([])
  const [receivableCategories, setReceivableCategories] = useState<ApiFinanceCategory[]>([])
  const [payableCategories, setPayableCategories] = useState<ApiFinanceCategory[]>([])
  const [aging, setAging] = useState<ApiFinanceAgingReport>(initialAging)
  const [cashflow, setCashflow] = useState<ApiFinanceCashflowReport>(initialCashflow)
  const [audit, setAudit] = useState<ApiFinanceAuditEvent[]>([])
  const [delinquencyContacts, setDelinquencyContacts] = useState<ApiFinanceDelinquencyContact[]>([])
  const [installmentPlans, setInstallmentPlans] = useState<ApiFinanceInstallmentPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [delinquencyCapability, setDelinquencyCapability] = useState<LoadCapability>('derived')
  const [installmentCapability, setInstallmentCapability] = useState<LoadCapability>('unavailable')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to: toIsoDate(new Date()),
    clientId: '',
    processId: '',
  })
  const [form, setForm] = useState({
    type: 'receivable' as ApiFinanceEntry['type'],
    description: '',
    amountCents: '0',
    dueDate: toIsoDate(new Date()),
    clientId: '',
    processId: '',
    categoryCode: '',
    notes: '',
  })
  const [planForm, setPlanForm] = useState({
    contractLabel: '',
    description: '',
    clientId: '',
    processId: '',
    categoryCode: '',
    firstDueDate: toIsoDate(new Date()),
    dayOfMonth: '30',
    installmentCount: '6',
    installmentAmountCents: '0',
    notes: '',
  })

  const canEntry = permissions.includes('finance:entry')
  const canBilling = permissions.includes('finance:billing')
  const canSettlement = permissions.includes('finance:settlement')
  const canReconciliation = permissions.includes('finance:reconciliation')
  const canExport = permissions.includes('finance:export')

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === filters.clientId),
    [clients, filters.clientId],
  )

  const filteredProcesses = useMemo(
    () => processes.filter((process) => matchesClient(process, selectedClient)),
    [processes, selectedClient],
  )

  const processOptions = useMemo(
    () =>
      filteredProcesses.map((process) => ({
        value: String(process.id),
        label: buildProcessLabel(process),
        searchText: `${process.client} ${process.phase} ${process.status}`,
      })),
    [filteredProcesses],
  )

  const formSelectedClient = useMemo(
    () => clients.find((client) => String(client.id) === form.clientId),
    [clients, form.clientId],
  )

  const planSelectedClient = useMemo(
    () => clients.find((client) => String(client.id) === planForm.clientId),
    [clients, planForm.clientId],
  )

  const formProcessOptions = useMemo(
    () =>
      processes
        .filter((process) => matchesClient(process, formSelectedClient))
        .map((process) => ({
          value: String(process.id),
          label: buildProcessLabel(process),
          searchText: `${process.client} ${process.phase} ${process.status}`,
        })),
    [formSelectedClient, processes],
  )

  const planProcessOptions = useMemo(
    () =>
      processes
        .filter((process) => matchesClient(process, planSelectedClient))
        .map((process) => ({
          value: String(process.id),
          label: buildProcessLabel(process),
          searchText: `${process.client} ${process.phase} ${process.status}`,
        })),
    [planSelectedClient, processes],
  )

  const categoriesForForm = form.type === 'receivable' ? receivableCategories : payableCategories
  const selectedPlan = useMemo(
    () => installmentPlans.find((plan) => plan.id === selectedPlanId) ?? installmentPlans[0] ?? null,
    [installmentPlans, selectedPlanId],
  )

  const visibleEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (tab === 'receber' && entry.type !== 'receivable') return false
      if (tab === 'pagar' && entry.type !== 'payable') return false
      if (filters.status && entry.status !== filters.status) return false
      if (filters.clientId && String(entry.clientId ?? '') !== filters.clientId) return false
      if (filters.processId && String(entry.processId ?? '') !== filters.processId) return false
      return true
    })
  }, [entries, filters.clientId, filters.processId, filters.status, tab])

  const installmentSummary = useMemo(() => {
    return installmentPlans.reduce(
      (acc, plan) => {
        acc.total += plan.installmentCount
        acc.paid += plan.metrics.paidCount
        acc.onTime += plan.metrics.onTimeCount
        acc.overdue += plan.metrics.overdueCount
        acc.remaining += plan.metrics.remainingCount
        return acc
      },
      { total: 0, paid: 0, onTime: 0, overdue: 0, remaining: 0 },
    )
  }, [installmentPlans])

  function getClientMeta(entry: ApiFinanceEntry) {
    const client = clients.find((item) => item.id === entry.clientId)
    return {
      name: entry.clientName || client?.name || 'Sem cliente',
      contact: entry.clientEmail || client?.email || entry.clientPhone || client?.phone || 'Sem contato',
    }
  }

  function getProcessMeta(entry: ApiFinanceEntry) {
    const process = processes.find((item) => item.id === entry.processId)
    return entry.processNumber || process?.processNumber || entry.processTitle || process?.title || 'Sem processo'
  }

  async function loadFinanceData() {
    setLoading(true)
    setError('')
    try {
      const [permissionsRes, entriesRes, receivableRes, payableRes, agingRes, cashflowRes, auditRes, clientsRes, processesRes] = await Promise.all([
        api.getPermissions(),
        api.getFinanceEntries(),
        api.getFinanceCategories('receivable'),
        api.getFinanceCategories('payable'),
        api.getFinanceAging(filters.to),
        api.getFinanceCashflow({ from: filters.from, to: filters.to, groupBy: 'month' }),
        api.getFinanceAudit({ limit: 8 }),
        api.getClients(),
        api.getProcesses(),
      ])

      if (permissionsRes.status !== 200) throw new Error(permissionsRes.error || 'Falha ao carregar permissões')
      if (entriesRes.status !== 200) throw new Error(entriesRes.error || 'Falha ao carregar lançamentos')
      if (receivableRes.status !== 200 || payableRes.status !== 200) throw new Error('Falha ao carregar categorias financeiras')
      if (agingRes.status !== 200) throw new Error(agingRes.error || 'Falha ao carregar aging')
      if (cashflowRes.status !== 200) throw new Error(cashflowRes.error || 'Falha ao carregar fluxo de caixa')
      if (auditRes.status !== 200) throw new Error(auditRes.error || 'Falha ao carregar auditoria')
      if (clientsRes.status !== 200) throw new Error(clientsRes.error || 'Falha ao carregar clientes')
      if (processesRes.status !== 200) throw new Error(processesRes.error || 'Falha ao carregar processos')

      const nextEntries = entriesRes.data
      const nextClients = clientsRes.data
      const nextProcesses = processesRes.data

      setPermissions(permissionsRes.data)
      setEntries(nextEntries)
      setReceivableCategories(receivableRes.data)
      setPayableCategories(payableRes.data)
      setAging(agingRes.data)
      setCashflow(cashflowRes.data)
      setAudit(auditRes.data)
      setClients(nextClients)
      setProcesses(nextProcesses)
      setForm((current) => ({
        ...current,
        categoryCode: current.categoryCode || receivableRes.data[0]?.code || '',
      }))
      setPlanForm((current) => ({
        ...current,
        categoryCode: current.categoryCode || receivableRes.data[0]?.code || '',
      }))

      const delinquencyRes = await api.getFinanceDelinquencyContacts({
        referenceDate: filters.to,
        status: 'overdue',
        clientId: filters.clientId ? Number(filters.clientId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
      })

      if (delinquencyRes.status === 200) {
        setDelinquencyContacts(delinquencyRes.data)
        setDelinquencyCapability('native')
      } else {
        setDelinquencyContacts(deriveDelinquencyContacts(nextEntries, nextClients, nextProcesses, filters.to, filters))
        setDelinquencyCapability(delinquencyRes.status === 404 ? 'derived' : 'error')
      }

      const plansRes = await api.getFinanceInstallmentPlans({
        clientId: filters.clientId ? Number(filters.clientId) : undefined,
        processId: filters.processId ? Number(filters.processId) : undefined,
      })

      if (plansRes.status === 200) {
        setInstallmentPlans(plansRes.data)
        setSelectedPlanId((current) => current ?? plansRes.data[0]?.id ?? null)
        setInstallmentCapability('native')
      } else {
        setInstallmentPlans([])
        setSelectedPlanId(null)
        setInstallmentCapability(plansRes.status === 404 ? 'unavailable' : 'error')
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Falha ao carregar financeiro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFinanceData()
  }, [filters.from, filters.to, filters.clientId, filters.processId])

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
        clientId: form.clientId ? Number(form.clientId) : null,
        processId: form.processId ? Number(form.processId) : null,
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

  async function handleCreateInstallmentPlan(event: React.FormEvent) {
    event.preventDefault()
    if (!canEntry) return
    setSubmitting(true)
    setError('')
    try {
      const response = await api.createFinanceInstallmentPlan({
        contractLabel: planForm.contractLabel,
        description: planForm.description,
        clientId: Number(planForm.clientId),
        processId: planForm.processId ? Number(planForm.processId) : null,
        categoryCode: planForm.categoryCode,
        firstDueDate: planForm.firstDueDate,
        dayOfMonth: Number(planForm.dayOfMonth),
        installmentCount: Number(planForm.installmentCount),
        installmentAmountCents: Number(planForm.installmentAmountCents),
        notes: planForm.notes || null,
        idempotencyKey: buildIdempotencyKey('installment-plan'),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao criar parcelamento')
      }
      setPlanForm((current) => ({
        ...current,
        contractLabel: '',
        description: '',
        installmentAmountCents: '0',
        notes: '',
      }))
      await loadFinanceData()
      setTab('parcelamentos')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar parcelamento')
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
        expiresAt: `${toIsoDate(new Date())}T23:59:59.000Z`,
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
      const response = await api.settleFinanceEntry(entryId, {
        settlementDate: toIsoDate(new Date()),
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
        referenceDate: toIsoDate(new Date()),
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

  function handleFormProcessChange(value: string) {
    const process = processes.find((item) => String(item.id) === value)
    const matchedClient = process
      ? clients.find((client) => client.name.trim().toLowerCase() === process.client.trim().toLowerCase())
      : null

    setForm((current) => ({
      ...current,
      processId: value,
      clientId: matchedClient ? String(matchedClient.id) : current.clientId,
    }))
  }

  function handlePlanProcessChange(value: string) {
    const process = processes.find((item) => String(item.id) === value)
    const matchedClient = process
      ? clients.find((client) => client.name.trim().toLowerCase() === process.client.trim().toLowerCase())
      : null

    setPlanForm((current) => ({
      ...current,
      processId: value,
      clientId: matchedClient ? String(matchedClient.id) : current.clientId,
    }))
  }

  return (
    <div className="finance-page">
      <section className="finance-hero">
        <div>
          <span className="finance-eyebrow">Financeiro real</span>
          <h2>Operação financeira com cobrança, baixa, aging, inadimplência operacional e parcelamento.</h2>
          <p>{user.role === 'ADV' ? 'Visão consultiva para acompanhamento' : 'Painel operacional com foco em execução, vínculo com cliente/processo e cobrança recorrente.'}</p>
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
        <FinanceMetricCard label="Parcelas atrasadas" value={String(installmentSummary.overdue)} tone="warning" detail={`${installmentSummary.remaining} ainda em aberto`} />
      </section>

      <section className="finance-toolbar">
        <div className="finance-tabs" role="tablist" aria-label="Visões financeiras">
          {[
            ['receber', 'Contas a receber'],
            ['pagar', 'Contas a pagar'],
            ['inadimplencia', 'Inadimplência'],
            ['parcelamentos', 'Parcelamentos'],
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
          <select value={filters.clientId} onChange={(event) => setFilters((current) => ({ ...current, clientId: event.target.value, processId: '' }))}>
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={String(client.id)}>{client.name}</option>
            ))}
          </select>
          <div className="finance-toolbar__process">
            <ProcessCombobox
              value={filters.processId}
              options={processOptions}
              onChange={(value) => setFilters((current) => ({ ...current, processId: value }))}
              placeholder="Filtrar processo"
              emptyLabel="Todos os processos"
              noResultsLabel="Nenhum processo para este cliente"
            />
          </div>
        </div>
      </section>

      {error ? <p className="finance-error">{error}</p> : null}

      <div className="finance-layout">
        <section className="finance-panel">
          <header className="finance-panel__header">
            <div>
              <h3>
                {tab === 'receber'
                  ? 'Recebimentos operacionais'
                  : tab === 'pagar'
                    ? 'Pagamentos operacionais'
                    : tab === 'inadimplencia'
                      ? 'Aging e inadimplência por contato'
                      : tab === 'parcelamentos'
                        ? 'Parcelamentos e acompanhamento das parcelas'
                        : 'Conciliação e histórico'}
              </h3>
              <p>
                {tab === 'inadimplencia'
                  ? 'Combine aging agregado com a fila operacional de cobrança por cliente, contato e processo.'
                  : tab === 'parcelamentos'
                    ? 'Acompanhe quantas parcelas estão pagas, em dia, atrasadas e quantas ainda faltam.'
                    : tab === 'conciliacao'
                      ? 'Auditoria recente do módulo financeiro.'
                      : 'Acompanhe status, cobrança, baixa e vínculo operacional por lançamento.'}
              </p>
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
                    <th>Cliente</th>
                    <th>Processo</th>
                    <th>Parcelamento</th>
                    <th>Status</th>
                    <th>Vencimento</th>
                    <th>Valor</th>
                    <th>Cobrança</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => {
                    const clientMeta = getClientMeta(entry)
                    return (
                      <tr key={entry.id}>
                        <td>#{entry.id}</td>
                        <td>{formatEntryType(entry.type)}</td>
                        <td>
                          <strong>{entry.description}</strong>
                          <span>{entry.categoryLabel}</span>
                        </td>
                        <td>
                          <strong>{clientMeta.name}</strong>
                          <span>{clientMeta.contact}</span>
                        </td>
                        <td>
                          <strong>{getProcessMeta(entry)}</strong>
                          <span>{entry.processId ? `Processo #${entry.processId}` : 'Sem vínculo'}</span>
                        </td>
                        <td>
                          {entry.installmentPlanId ? (
                            <>
                              <strong>Plano #{entry.installmentPlanId}</strong>
                              <span>Parcela {entry.installmentNumber || 0}/{entry.installmentTotal || 0}</span>
                            </>
                          ) : (
                            <span>Avulso</span>
                          )}
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
                    )
                  })}
                </tbody>
              </table>
              {!visibleEntries.length ? <div className="finance-empty">Nenhum lançamento encontrado para os filtros atuais.</div> : null}
            </div>
          ) : null}

          {!loading && tab === 'inadimplencia' ? (
            <div className="finance-section-stack">
              <div className="finance-inline-note">
                <span className={`finance-status finance-status--${delinquencyCapability === 'native' ? 'success' : delinquencyCapability === 'derived' ? 'warning' : 'error'}`}>
                  {delinquencyCapability === 'native' ? 'lista nativa' : delinquencyCapability === 'derived' ? 'lista derivada' : 'lista indisponível'}
                </span>
                <p>
                  {delinquencyCapability === 'native'
                    ? 'A fila de inadimplência já vem do backend com contato e contexto de cobrança.'
                    : delinquencyCapability === 'derived'
                      ? 'Enquanto o endpoint dedicado não responde, a visão é montada a partir dos lançamentos, clientes e processos já existentes.'
                      : 'O backend não retornou a fila operacional de inadimplência nesta execução.'}
                </p>
              </div>

              <div className="finance-aging-grid">
                {aging.buckets.map((bucket) => (
                  <div key={bucket.label} className="finance-aging-card">
                    <p>{bucket.label}</p>
                    <strong>{formatMoney(bucket.amountCents)}</strong>
                    <span>{bucket.count} lançamentos</span>
                  </div>
                ))}
              </div>

              <div className="finance-delinquency-grid">
                {delinquencyContacts.map((item) => (
                  <FinanceDelinquencyCard key={item.id} item={item} formatMoney={formatMoney} />
                ))}
                {!delinquencyContacts.length ? <div className="finance-empty">Nenhum contato inadimplente encontrado para os filtros atuais.</div> : null}
              </div>
            </div>
          ) : null}

          {!loading && tab === 'parcelamentos' ? (
            <div className="finance-section-stack">
              <div className="finance-plan-summary">
                <FinanceMetricCard label="Planos ativos" value={String(installmentPlans.length)} detail="Visão contratual" />
                <FinanceMetricCard label="Pagas" value={String(installmentSummary.paid)} tone="success" detail={`de ${installmentSummary.total} parcelas`} />
                <FinanceMetricCard label="Em dia" value={String(installmentSummary.onTime)} detail="Sem atraso" />
                <FinanceMetricCard label="Atrasadas" value={String(installmentSummary.overdue)} tone="danger" detail={`${installmentSummary.remaining} restantes`} />
              </div>

              <div className="finance-inline-note">
                <span className={`finance-status finance-status--${installmentCapability === 'native' ? 'success' : installmentCapability === 'unavailable' ? 'warning' : 'error'}`}>
                  {installmentCapability === 'native' ? 'parcelamento ativo' : installmentCapability === 'unavailable' ? 'aguardando endpoint' : 'falha no endpoint'}
                </span>
                <p>
                  {installmentCapability === 'native'
                    ? 'O frontend já está consumindo o contrato explícito de planos e parcelas.'
                    : installmentCapability === 'unavailable'
                      ? 'A experiência de parcelamento está pronta no frontend e ficará operacional quando o backend expuser `/finance/installments/plans`.'
                      : 'O backend respondeu com erro ao carregar parcelamentos nesta execução.'}
                </p>
              </div>

              <div className="finance-plan-layout">
                <div className="finance-plan-list">
                  {installmentPlans.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      className={`finance-plan-list__item${selectedPlan?.id === plan.id ? ' is-active' : ''}`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <FinanceInstallmentPlanCard plan={plan} formatMoney={formatMoney} />
                    </button>
                  ))}
                  {!installmentPlans.length ? <div className="finance-empty">Nenhum plano de parcelamento disponível.</div> : null}
                </div>

                <div className="finance-plan-detail">
                  {selectedPlan ? (
                    <>
                      <header className="finance-panel__subheader">
                        <div>
                          <h4>{selectedPlan.contractLabel}</h4>
                          <p>{selectedPlan.description}</p>
                        </div>
                        <span className={`finance-status finance-status--${selectedPlan.status}`}>{selectedPlan.status}</span>
                      </header>

                      <div className="finance-plan-detail__meta">
                        <span>Cliente: {selectedPlan.clientName}</span>
                        <span>Processo: {selectedPlan.processNumber || selectedPlan.processTitle || 'Sem processo vinculado'}</span>
                        <span>Dia base: todo dia {selectedPlan.dayOfMonth}</span>
                        <span>Saldo restante: {formatMoney(selectedPlan.metrics.remainingAmountCents)}</span>
                      </div>

                      <div className="finance-table-wrap">
                        <table className="finance-table finance-table--compact">
                          <thead>
                            <tr>
                              <th>Parcela</th>
                              <th>Vencimento</th>
                              <th>Valor</th>
                              <th>Status</th>
                              <th>Cobrança</th>
                              <th>Liquidação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPlan.installments.map((installment) => (
                              <tr key={`${selectedPlan.id}-${installment.installmentNumber}`}>
                                <td>{installment.installmentNumber}/{selectedPlan.installmentCount}</td>
                                <td>{installment.dueDate}</td>
                                <td>{formatMoney(installment.amountCents)}</td>
                                <td><span className={`finance-status finance-status--${installment.status}`}>{installment.status}</span></td>
                                <td>{installment.chargeStatus || 'sem cobrança'}</td>
                                <td>{installment.settlementDate || 'em aberto'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <div className="finance-empty">Selecione um plano para acompanhar as parcelas.</div>
                  )}
                </div>
              </div>
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
          {tab !== 'parcelamentos' ? (
            <>
              <header className="finance-panel__header">
                <div>
                  <h3>Novo lançamento</h3>
                  <p>Crie títulos de receber ou pagar com vínculo explícito de cliente e processo.</p>
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
                  Cliente
                  <select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value, processId: '' }))}>
                    <option value="">Sem cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Processo
                  <ProcessCombobox
                    value={form.processId}
                    options={formProcessOptions}
                    onChange={handleFormProcessChange}
                    placeholder="Vincular processo"
                    emptyLabel="Sem processo"
                    noResultsLabel="Nenhum processo para este cliente"
                  />
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
            </>
          ) : (
            <>
              <header className="finance-panel__header">
                <div>
                  <h3>Novo parcelamento</h3>
                  <p>Monte o plano com cliente, processo, dia base e quantidade de parcelas.</p>
                </div>
              </header>

              <form className="finance-form" onSubmit={handleCreateInstallmentPlan}>
                <label>
                  Cliente
                  <select value={planForm.clientId} onChange={(event) => setPlanForm((current) => ({ ...current, clientId: event.target.value, processId: '' }))}>
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={String(client.id)}>{client.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Processo
                  <ProcessCombobox
                    value={planForm.processId}
                    options={planProcessOptions}
                    onChange={handlePlanProcessChange}
                    placeholder="Vincular processo"
                    emptyLabel="Sem processo"
                    noResultsLabel="Nenhum processo para este cliente"
                  />
                </label>
                <label>
                  Rótulo do contrato
                  <input value={planForm.contractLabel} onChange={(event) => setPlanForm((current) => ({ ...current, contractLabel: event.target.value }))} placeholder="Ex.: Honorários Ação Trabalhista" />
                </label>
                <label>
                  Descrição
                  <input value={planForm.description} onChange={(event) => setPlanForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ex.: 8 parcelas fixas todo dia 30" />
                </label>
                <label>
                  Categoria
                  <select value={planForm.categoryCode} onChange={(event) => setPlanForm((current) => ({ ...current, categoryCode: event.target.value }))}>
                    {receivableCategories.map((category) => (
                      <option key={category.code} value={category.code}>{category.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Primeiro vencimento
                  <input type="date" value={planForm.firstDueDate} onChange={(event) => setPlanForm((current) => ({ ...current, firstDueDate: event.target.value }))} />
                </label>
                <div className="finance-form__inline">
                  <label>
                    Dia base
                    <input type="number" min="1" max="31" value={planForm.dayOfMonth} onChange={(event) => setPlanForm((current) => ({ ...current, dayOfMonth: event.target.value }))} />
                  </label>
                  <label>
                    Parcelas
                    <input type="number" min="1" value={planForm.installmentCount} onChange={(event) => setPlanForm((current) => ({ ...current, installmentCount: event.target.value }))} />
                  </label>
                </div>
                <label>
                  Valor por parcela (centavos)
                  <input type="number" min="0" value={planForm.installmentAmountCents} onChange={(event) => setPlanForm((current) => ({ ...current, installmentAmountCents: event.target.value }))} />
                </label>
                <label>
                  Observações
                  <textarea value={planForm.notes} onChange={(event) => setPlanForm((current) => ({ ...current, notes: event.target.value }))} rows={4} />
                </label>
                <button className="btn-primary" type="submit" disabled={!canEntry || submitting || !planForm.clientId}>Criar parcelamento</button>
              </form>

              <div className="finance-mini-report">
                <h4>Resumo esperado</h4>
                <ul>
                  <li>
                    <span>Total projetado</span>
                    <strong>{formatMoney(Number(planForm.installmentAmountCents || '0') * Number(planForm.installmentCount || '0'))}</strong>
                  </li>
                  <li>
                    <span>Dia recorrente</span>
                    <strong>Todo dia {planForm.dayOfMonth || '--'}</strong>
                  </li>
                  <li>
                    <span>Parcelas restantes</span>
                    <strong>{planForm.installmentCount || '0'}</strong>
                  </li>
                </ul>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  )
}

export default Financeiro
