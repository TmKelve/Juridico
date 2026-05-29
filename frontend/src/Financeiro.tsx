import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CreditCard,
  DollarSign,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react'
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
type ModalTab = 'avulso' | 'parcelado'
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

function formatDate(iso: string) {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function formatEntryType(type: ApiFinanceEntry['type']) {
  return type === 'receivable' ? 'Receber' : 'Pagar'
}

function statusLabel(status: string) {
  switch (status) {
    case 'open': return 'Em aberto'
    case 'overdue': return 'Vencido'
    case 'paid': return 'Pago'
    case 'partially_paid': return 'Parcial'
    case 'pending': return 'Pendente'
    case 'active': return 'Ativo'
    case 'completed': return 'Concluído'
    case 'cancelled': return 'Cancelado'
    default: return status
  }
}

function getTabTitle(tab: FinanceTab) {
  switch (tab) {
    case 'receber': return 'Contas a Receber'
    case 'pagar': return 'Contas a Pagar'
    case 'inadimplencia': return 'Inadimplência'
    case 'parcelamentos': return 'Parcelamentos'
    case 'conciliacao': return 'Conciliação'
  }
}

function getTabSubtitle(tab: FinanceTab) {
  switch (tab) {
    case 'receber': return 'Recebimentos com cobrança, baixa e vínculo operacional.'
    case 'pagar': return 'Pagamentos operacionais por lançamento.'
    case 'inadimplencia': return 'Aging e fila de cobrança agrupada por contato e processo.'
    case 'parcelamentos': return 'Planos ativos com acompanhamento detalhado das parcelas.'
    case 'conciliacao': return 'Auditoria recente do módulo financeiro.'
  }
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

  return [...grouped.values()].sort((l, r) => r.overdueAmountCents - l.overdueAmountCents)
}

export function Financeiro({ user: _user }: { user: User }) {
  // ── Core state ──────────────────────────────────────────────────────────────
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

  // ── Avulso form state ────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    type: 'receivable' as ApiFinanceEntry['type'],
    description: '',
    dueDate: toIsoDate(new Date()),
    clientId: '',
    processId: '',
    categoryCode: '',
    notes: '',
  })

  // ── Parcelado form state ─────────────────────────────────────────────────────
  const [planForm, setPlanForm] = useState({
    contractLabel: '',
    description: '',
    clientId: '',
    processId: '',
    categoryCode: '',
    firstDueDate: toIsoDate(new Date()),
    dayOfMonth: '30',
    installmentCount: '6',
    notes: '',
  })

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [modalTab, setModalTab] = useState<ModalTab>('avulso')
  const [modalAmountStr, setModalAmountStr] = useState('')
  const [totalAmountStr, setTotalAmountStr] = useState('')
  const [withInterest, setWithInterest] = useState(false)
  const [interestRateStr, setInterestRateStr] = useState('')

  // ── Permissions ──────────────────────────────────────────────────────────────
  const canEntry = permissions.includes('finance:entry')
  const canBilling = permissions.includes('finance:billing')
  const canSettlement = permissions.includes('finance:settlement')
  const canReconciliation = permissions.includes('finance:reconciliation')

  // ── Derived values ───────────────────────────────────────────────────────────
  const selectedClient = useMemo(
    () => clients.find((c) => String(c.id) === filters.clientId),
    [clients, filters.clientId],
  )

  const filteredProcesses = useMemo(
    () => processes.filter((p) => matchesClient(p, selectedClient)),
    [processes, selectedClient],
  )

  const processOptions = useMemo(
    () =>
      filteredProcesses.map((p) => ({
        value: String(p.id),
        label: buildProcessLabel(p),
        searchText: `${p.client} ${p.phase} ${p.status}`,
      })),
    [filteredProcesses],
  )

  const formSelectedClient = useMemo(
    () => clients.find((c) => String(c.id) === form.clientId),
    [clients, form.clientId],
  )

  const planSelectedClient = useMemo(
    () => clients.find((c) => String(c.id) === planForm.clientId),
    [clients, planForm.clientId],
  )

  const formProcessOptions = useMemo(
    () =>
      processes
        .filter((p) => matchesClient(p, formSelectedClient))
        .map((p) => ({ value: String(p.id), label: buildProcessLabel(p), searchText: `${p.client} ${p.phase} ${p.status}` })),
    [formSelectedClient, processes],
  )

  const planProcessOptions = useMemo(
    () =>
      processes
        .filter((p) => matchesClient(p, planSelectedClient))
        .map((p) => ({ value: String(p.id), label: buildProcessLabel(p), searchText: `${p.client} ${p.phase} ${p.status}` })),
    [planSelectedClient, processes],
  )

  const categoriesForForm = form.type === 'receivable' ? receivableCategories : payableCategories

  const selectedPlan = useMemo(
    () => installmentPlans.find((p) => p.id === selectedPlanId) ?? installmentPlans[0] ?? null,
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

  const tabCounts = useMemo(() => ({
    receber: entries.filter((e) => e.type === 'receivable').length,
    pagar: entries.filter((e) => e.type === 'payable').length,
    inadimplencia: delinquencyContacts.length,
    parcelamentos: installmentPlans.length,
    conciliacao: audit.length,
  }), [entries, delinquencyContacts, installmentPlans, audit])

  // ── Installment preview (compound interest PMT) ──────────────────────────────
  const installmentPreview = useMemo(() => {
    const count = Number(planForm.installmentCount) || 0
    const totalCents = Math.round((parseFloat(totalAmountStr.replace(',', '.')) || 0) * 100)
    if (!count || !totalCents || !planForm.firstDueDate) return []

    const firstDue = new Date(planForm.firstDueDate + 'T12:00:00')
    if (isNaN(firstDue.getTime())) return []

    const result: { num: number; date: string; amountCents: number }[] = []
    const r = withInterest ? (parseFloat(interestRateStr.replace(',', '.')) || 0) / 100 : 0

    if (!withInterest || r <= 0) {
      const base = Math.floor(totalCents / count)
      const rem = totalCents - base * count
      for (let i = 0; i < count; i++) {
        const d = new Date(firstDue)
        d.setMonth(d.getMonth() + i)
        result.push({ num: i + 1, date: d.toISOString().slice(0, 10), amountCents: i === 0 ? base + rem : base })
      }
    } else {
      // PMT = PV × r / (1 − (1+r)^−n)
      const pmt = (totalCents * r) / (1 - Math.pow(1 + r, -count))
      for (let i = 0; i < count; i++) {
        const d = new Date(firstDue)
        d.setMonth(d.getMonth() + i)
        result.push({ num: i + 1, date: d.toISOString().slice(0, 10), amountCents: Math.round(pmt) })
      }
    }
    return result
  }, [planForm.installmentCount, planForm.firstDueDate, totalAmountStr, withInterest, interestRateStr])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getClientMeta(entry: ApiFinanceEntry) {
    const client = clients.find((c) => c.id === entry.clientId)
    return {
      name: entry.clientName || client?.name || 'Sem cliente',
      contact: entry.clientEmail || client?.email || entry.clientPhone || client?.phone || 'Sem contato',
    }
  }

  function getProcessMeta(entry: ApiFinanceEntry) {
    const process = processes.find((p) => p.id === entry.processId)
    return entry.processNumber || process?.processNumber || entry.processTitle || process?.title || 'Sem processo'
  }

  function closeModal() {
    setShowModal(false)
  }

  function openModal(tab: ModalTab = 'avulso') {
    setModalTab(tab)
    setError('')
    setShowModal(true)
  }

  // ── Data loading ─────────────────────────────────────────────────────────────
  async function loadFinanceData() {
    setLoading(true)
    setError('')
    try {
      const [permissionsRes, entriesRes, receivableRes, payableRes, agingRes, cashflowRes, auditRes, clientsRes, processesRes] =
        await Promise.all([
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
      setForm((cur) => ({ ...cur, categoryCode: cur.categoryCode || receivableRes.data[0]?.code || '' }))
      setPlanForm((cur) => ({ ...cur, categoryCode: cur.categoryCode || receivableRes.data[0]?.code || '' }))

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
        setSelectedPlanId((cur) => cur ?? plansRes.data[0]?.id ?? null)
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

  // ── Submit: Avulso modal ─────────────────────────────────────────────────────
  async function handleCreateEntryModal(event: React.FormEvent) {
    event.preventDefault()
    if (!canEntry) return
    const amountCents = Math.round((parseFloat(modalAmountStr.replace(',', '.')) || 0) * 100)
    setSubmitting(true)
    setError('')
    try {
      const response = await api.createFinanceEntry({
        type: form.type,
        description: form.description,
        amountCents,
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
      setForm((cur) => ({ ...cur, description: '', notes: '' }))
      setModalAmountStr('')
      closeModal()
      await loadFinanceData()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar lançamento')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Submit: Parcelado modal ──────────────────────────────────────────────────
  async function handleCreateInstallmentPlanModal(event: React.FormEvent) {
    event.preventDefault()
    if (!canEntry) return
    const count = Number(planForm.installmentCount) || 1
    const installmentAmountCents =
      installmentPreview.length > 0
        ? installmentPreview[0].amountCents
        : Math.round((parseFloat(totalAmountStr.replace(',', '.')) || 0) * 100 / count)
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
        installmentCount: count,
        installmentAmountCents,
        notes: planForm.notes || null,
        idempotencyKey: buildIdempotencyKey('installment-plan'),
      })
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(response.error || 'Falha ao criar parcelamento')
      }
      setPlanForm((cur) => ({ ...cur, contractLabel: '', description: '', notes: '' }))
      setTotalAmountStr('')
      setWithInterest(false)
      setInterestRateStr('')
      closeModal()
      await loadFinanceData()
      setTab('parcelamentos')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Falha ao criar parcelamento')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Row actions ──────────────────────────────────────────────────────────────
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
      if (response.status !== 201 && response.status !== 200) throw new Error(response.error || 'Falha ao gerar cobrança')
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
      if (response.status !== 200) throw new Error(response.error || 'Falha ao baixar lançamento')
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
      if (response.status !== 201 && response.status !== 200) throw new Error(response.error || 'Falha ao agendar régua')
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
      if (response.status !== 201 && response.status !== 200) throw new Error(response.error || 'Falha ao executar conciliação')
      await loadFinanceData()
      setTab('conciliacao')
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Falha ao executar conciliação')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFormProcessChange(value: string) {
    const process = processes.find((p) => String(p.id) === value)
    const matched = process ? clients.find((c) => c.name.trim().toLowerCase() === process.client.trim().toLowerCase()) : null
    setForm((cur) => ({ ...cur, processId: value, clientId: matched ? String(matched.id) : cur.clientId }))
  }

  function handlePlanProcessChange(value: string) {
    const process = processes.find((p) => String(p.id) === value)
    const matched = process ? clients.find((c) => c.name.trim().toLowerCase() === process.client.trim().toLowerCase()) : null
    setPlanForm((cur) => ({ ...cur, processId: value, clientId: matched ? String(matched.id) : cur.clientId }))
  }

  // ── Preview total with interest ──────────────────────────────────────────────
  const previewTotal = installmentPreview.reduce((s, row) => s + row.amountCents, 0)

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fin-page">

      {/* ── HERO ── */}
      <header className="fin-hero">
        <div>
          <span className="fin-eyebrow">Financeiro</span>
          <h2>Gestão Financeira</h2>
          <p className="fin-hero-subtitle">Controle de recebíveis, pagamentos, inadimplência e parcelamentos.</p>
        </div>
        <div className="fin-hero-actions">
          <button
            className="btn-secondary"
            onClick={() => void loadFinanceData()}
            disabled={loading || submitting}
          >
            <RefreshCw size={14} style={{ marginRight: 6 }} />
            Atualizar
          </button>
          <button
            className="btn-primary"
            onClick={() => openModal('avulso')}
            disabled={!canEntry}
          >
            <Plus size={14} style={{ marginRight: 6 }} />
            Novo Lançamento
          </button>
        </div>
      </header>

      {/* ── KPI STRIP ── */}
      <div className="fin-kpis">
        <button className="metric-card" data-kpi-color="primary" type="button" aria-label="Recebíveis">
          <div className="metric-top-row">
            <p className="metric-value">{formatMoney(aging.indicators.totalReceivablesCents)}</p>
            <div className="metric-icon" aria-hidden="true"><DollarSign size={20} /></div>
          </div>
          <p className="metric-label">Recebíveis</p>
          <p className="metric-microtext">Carteira aberta</p>
        </button>

        <button className="metric-card" data-kpi-color="error" type="button" aria-label="Inadimplência">
          <div className="metric-top-row">
            <p className="metric-value">{formatMoney(aging.indicators.overdueAmountCents)}</p>
            <div className="metric-icon" aria-hidden="true"><TrendingDown size={20} /></div>
          </div>
          <p className="metric-label">Inadimplência</p>
          <p className="metric-microtext">{aging.indicators.overdueRatePercent.toFixed(1)}% da carteira</p>
        </button>

        <button
          className="metric-card"
          data-kpi-color={cashflow.totals.netCents >= 0 ? 'success' : 'warning'}
          type="button"
          aria-label="Fluxo líquido"
        >
          <div className="metric-top-row">
            <p className="metric-value">{formatMoney(cashflow.totals.netCents)}</p>
            <div className="metric-icon" aria-hidden="true"><TrendingUp size={20} /></div>
          </div>
          <p className="metric-label">Fluxo líquido</p>
          <p className="metric-microtext">Período filtrado</p>
        </button>

        <button className="metric-card" data-kpi-color="warning" type="button" aria-label="Parcelas atrasadas">
          <div className="metric-top-row">
            <p className="metric-value">{installmentSummary.overdue}</p>
            <div className="metric-icon" aria-hidden="true"><CreditCard size={20} /></div>
          </div>
          <p className="metric-label">Parcelas atrasadas</p>
          <p className="metric-microtext">Em aberto</p>
        </button>
      </div>

      {/* ── FILTER CARD ── */}
      <div className="fin-filter-card">
        {/* Tab chips */}
        <div className="fin-tab-row" role="tablist" aria-label="Visões financeiras">
          {(
            [
              ['receber', 'Contas a receber', tabCounts.receber],
              ['pagar', 'Contas a pagar', tabCounts.pagar],
              ['inadimplencia', 'Inadimplência', tabCounts.inadimplencia],
              ['parcelamentos', 'Parcelamentos', tabCounts.parcelamentos],
              ['conciliacao', 'Conciliação', tabCounts.conciliacao],
            ] as [FinanceTab, string, number][]
          ).map(([value, label, count]) => (
            <button
              key={value}
              role="tab"
              aria-selected={tab === value}
              className={`fin-tab-chip${tab === value ? ' is-active' : ''}`}
              onClick={() => setTab(value)}
            >
              {label}
              {count > 0 && <span className="fin-tab-chip-count">{count}</span>}
            </button>
          ))}
        </div>

        {/* Filter row */}
        <div className="fin-filter-row">
          <div className="fin-filter-field fin-filter-field--date">
            <span>De</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((cur) => ({ ...cur, from: e.target.value }))}
            />
          </div>
          <div className="fin-filter-field fin-filter-field--date">
            <span>Até</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((cur) => ({ ...cur, to: e.target.value }))}
            />
          </div>
          <div className="fin-filter-field">
            <span>Status</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters((cur) => ({ ...cur, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="open">Em aberto</option>
              <option value="overdue">Vencido</option>
              <option value="paid">Pago</option>
              <option value="partially_paid">Parcial</option>
            </select>
          </div>
          <div className="fin-filter-field">
            <span>Cliente</span>
            <select
              value={filters.clientId}
              onChange={(e) => setFilters((cur) => ({ ...cur, clientId: e.target.value, processId: '' }))}
            >
              <option value="">Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="fin-filter-field fin-filter-field--process">
            <span>Processo</span>
            <ProcessCombobox
              value={filters.processId}
              options={processOptions}
              onChange={(v) => setFilters((cur) => ({ ...cur, processId: v }))}
              placeholder="Filtrar processo"
              emptyLabel="Todos os processos"
              noResultsLabel="Nenhum processo para este cliente"
            />
          </div>
        </div>
      </div>

      {/* ── ERROR ALERT ── */}
      {error && (
        <div className="fin-alert fin-alert--error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── CONTENT CARD ── */}
      <div className="fin-content-card">
        <div className="fin-content-header">
          <div>
            <h3 className="fin-content-title">{getTabTitle(tab)}</h3>
            <p className="fin-content-subtitle">{getTabSubtitle(tab)}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(tab === 'receber' || tab === 'pagar') && (
              <span className="fin-content-badge">
                {visibleEntries.length} lançamento{visibleEntries.length !== 1 ? 's' : ''}
              </span>
            )}
            {tab === 'conciliacao' && (
              <button
                className="btn-secondary"
                style={{ fontSize: 'var(--font-size-xs)', height: 30, padding: '0 10px' }}
                onClick={() => void handleRunMockReconciliation()}
                disabled={!canReconciliation || submitting}
              >
                Conciliação mock
              </button>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && <div className="fin-empty">Carregando financeiro…</div>}

        {/* ── Receber / Pagar table ── */}
        {!loading && (tab === 'receber' || tab === 'pagar') && (
          <div className="fin-table-wrap">
            <table className="fin-table">
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
                  const cm = getClientMeta(entry)
                  return (
                    <tr key={entry.id}>
                      <td><span className="fin-cell-id">#{entry.id}</span></td>
                      <td>
                        <span className={`fin-type-badge fin-type-badge--${entry.type}`}>
                          {formatEntryType(entry.type)}
                        </span>
                      </td>
                      <td>
                        <div className="fin-cell-stack">
                          <strong>{entry.description}</strong>
                          {entry.categoryLabel && <span>{entry.categoryLabel}</span>}
                        </div>
                      </td>
                      <td>
                        <div className="fin-cell-stack">
                          <strong>{cm.name}</strong>
                          <span>{cm.contact}</span>
                        </div>
                      </td>
                      <td>
                        <div className="fin-cell-stack">
                          <strong>{getProcessMeta(entry)}</strong>
                          <span>{entry.processId ? `#${entry.processId}` : 'Avulso'}</span>
                        </div>
                      </td>
                      <td>
                        {entry.installmentPlanId ? (
                          <div className="fin-cell-stack">
                            <strong>Plano #{entry.installmentPlanId}</strong>
                            <span>{entry.installmentNumber ?? 0}/{entry.installmentTotal ?? 0}</span>
                          </div>
                        ) : (
                          <span className="fin-cell-muted">Avulso</span>
                        )}
                      </td>
                      <td>
                        <span className={`fin-status-badge fin-status-badge--${entry.status}`}>
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                      <td><span className="fin-cell-date">{formatDate(entry.dueDate)}</span></td>
                      <td><span className="fin-cell-amount">{formatMoney(entry.amountCents)}</span></td>
                      <td><span className="fin-cell-muted">{entry.chargeStatus || '—'}</span></td>
                      <td>
                        <div className="fin-row-actions">
                          {entry.type === 'receivable' && (
                            <button
                              className="fin-action-btn fin-action-btn--cobrar"
                              onClick={() => void handleGenerateBilling(entry.id, 'pix')}
                              disabled={!canBilling || submitting}
                            >
                              Cobrar
                            </button>
                          )}
                          {entry.type === 'receivable' && (
                            <button
                              className="fin-action-btn"
                              onClick={() => void handleScheduleCollection(entry.id)}
                              disabled={!canBilling || submitting}
                            >
                              Régua
                            </button>
                          )}
                          <button
                            className="fin-action-btn fin-action-btn--baixar"
                            onClick={() => void handleSettle(entry.id)}
                            disabled={!canSettlement || submitting || entry.status === 'paid'}
                          >
                            Baixar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {!visibleEntries.length && (
              <div className="fin-empty">Nenhum lançamento encontrado para os filtros atuais.</div>
            )}
          </div>
        )}

        {/* ── Inadimplência ── */}
        {!loading && tab === 'inadimplencia' && (
          <div className="fin-section-stack">
            <div className="fin-inline-note">
              <span className={`fin-status-badge fin-status-badge--${delinquencyCapability}`}>
                {delinquencyCapability === 'native' ? 'lista nativa' : delinquencyCapability === 'derived' ? 'lista derivada' : 'lista indisponível'}
              </span>
              <p>
                {delinquencyCapability === 'native'
                  ? 'A fila de inadimplência já vem do backend com contato e contexto de cobrança.'
                  : delinquencyCapability === 'derived'
                    ? 'Visão montada a partir dos lançamentos, clientes e processos existentes.'
                    : 'O backend não retornou a fila operacional de inadimplência nesta execução.'}
              </p>
            </div>
            <div className="fin-aging-grid">
              {aging.buckets.map((bucket) => (
                <div key={bucket.label} className="fin-aging-card">
                  <p>{bucket.label} dias</p>
                  <strong>{formatMoney(bucket.amountCents)}</strong>
                  <span>{bucket.count} lançamentos</span>
                </div>
              ))}
            </div>
            <div className="fin-delinquency-grid">
              {delinquencyContacts.map((item) => (
                <FinanceDelinquencyCard key={item.id} item={item} formatMoney={formatMoney} />
              ))}
              {!delinquencyContacts.length && (
                <div className="fin-empty">Nenhum contato inadimplente encontrado para os filtros atuais.</div>
              )}
            </div>
          </div>
        )}

        {/* ── Parcelamentos ── */}
        {!loading && tab === 'parcelamentos' && (
          <div className="fin-section-stack">
            {/* Summary metric cards */}
            <div className="fin-plan-summary">
              <FinanceMetricCard label="Planos ativos" value={String(installmentPlans.length)} detail="Visão contratual" />
              <FinanceMetricCard label="Pagas" value={String(installmentSummary.paid)} tone="success" detail={`de ${installmentSummary.total} parcelas`} />
              <FinanceMetricCard label="Em dia" value={String(installmentSummary.onTime)} detail="Sem atraso" />
              <FinanceMetricCard label="Atrasadas" value={String(installmentSummary.overdue)} tone="danger" detail={`${installmentSummary.remaining} restantes`} />
            </div>

            {/* Backend capability note — only shown when not native */}
            {installmentCapability !== 'native' && (
              <div className="fin-inline-note">
                <span className={`fin-status-badge fin-status-badge--${installmentCapability === 'unavailable' ? 'unavailable' : 'error'}`}>
                  {installmentCapability === 'unavailable' ? 'aguardando endpoint' : 'falha no endpoint'}
                </span>
                <p>
                  {installmentCapability === 'unavailable'
                    ? 'A experiência de parcelamento ficará operacional quando o backend expuser /finance/installments/plans.'
                    : 'O backend respondeu com erro ao carregar parcelamentos nesta execução.'}
                </p>
              </div>
            )}

            {/* Two-column layout: card list + detail panel */}
            <div className="fin-plan-layout">
              {/* Left: plan cards list */}
              <div className="fin-plan-list">
                {installmentPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    className="fin-plan-list__item"
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <FinanceInstallmentPlanCard
                      plan={plan}
                      formatMoney={formatMoney}
                      isActive={selectedPlan?.id === plan.id}
                    />
                  </button>
                ))}
                {!installmentPlans.length && (
                  <div className="fin-empty">Nenhum plano de parcelamento disponível.</div>
                )}
              </div>

              {/* Right: detail panel */}
              <div className="fin-plan-detail">
                {selectedPlan ? (
                  <>
                    {/* Header */}
                    <div className="fin-plan-detail__header">
                      <div>
                        <h4 className="fin-plan-detail__title">{selectedPlan.contractLabel}</h4>
                        {selectedPlan.description && (
                          <p className="fin-plan-detail__desc">{selectedPlan.description}</p>
                        )}
                        <div className="fin-plan-detail__meta-row">
                          <span><CreditCard size={11} />{selectedPlan.clientName}</span>
                          {(selectedPlan.processNumber || selectedPlan.processTitle) && (
                            <span>{selectedPlan.processNumber || selectedPlan.processTitle}</span>
                          )}
                          <span>Todo dia {selectedPlan.dayOfMonth}</span>
                        </div>
                      </div>
                      <span className={`fin-plan-chip fin-plan-chip--${selectedPlan.status}`}>
                        {statusLabel(selectedPlan.status)}
                      </span>
                    </div>

                    {/* Stats strip */}
                    <div className="fin-plan-detail__stats">
                      <div className="fin-plan-stat">
                        <p>Saldo restante</p>
                        <strong>{formatMoney(selectedPlan.metrics.remainingAmountCents)}</strong>
                      </div>
                      <div className="fin-plan-stat fin-plan-stat--success">
                        <p>Pagas</p>
                        <strong>
                          {selectedPlan.metrics.paidCount}
                          <span>/{selectedPlan.installmentCount}</span>
                        </strong>
                      </div>
                      <div className={`fin-plan-stat${selectedPlan.metrics.overdueCount > 0 ? ' fin-plan-stat--error' : ''}`}>
                        <p>Atrasadas</p>
                        <strong>{selectedPlan.metrics.overdueCount}</strong>
                      </div>
                      <div className="fin-plan-stat">
                        <p>A vencer</p>
                        <strong>{selectedPlan.metrics.remainingCount}</strong>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="fin-plan-detail__progress-wrap">
                      <div className="fin-plan-progress-bar fin-plan-progress-bar--lg">
                        <div
                          className={`fin-plan-progress-fill${selectedPlan.metrics.overdueCount > 0 ? ' has-overdue' : ''}`}
                          style={{
                            width: `${selectedPlan.installmentCount > 0
                              ? Math.round((selectedPlan.metrics.paidCount / selectedPlan.installmentCount) * 100)
                              : 0}%`
                          }}
                        />
                      </div>
                      <span className="fin-plan-progress-pct">
                        {selectedPlan.installmentCount > 0
                          ? Math.round((selectedPlan.metrics.paidCount / selectedPlan.installmentCount) * 100)
                          : 0}%
                      </span>
                    </div>

                    {/* Installments table */}
                    <div className="fin-table-wrap">
                      <table className="fin-table fin-table--compact fin-plan-installs-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th>Liquidação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlan.installments.map((inst) => (
                            <tr
                              key={`${selectedPlan.id}-${inst.installmentNumber}`}
                              data-status={inst.status}
                            >
                              <td><span className="fin-cell-id">{inst.installmentNumber}/{selectedPlan.installmentCount}</span></td>
                              <td><span className="fin-cell-date">{formatDate(inst.dueDate)}</span></td>
                              <td><span className="fin-cell-amount">{formatMoney(inst.amountCents)}</span></td>
                              <td>
                                <span className={`fin-status-badge fin-status-badge--${inst.status}`}>
                                  {statusLabel(inst.status)}
                                </span>
                              </td>
                              <td>
                                <span className="fin-cell-muted">
                                  {inst.settlementDate ? formatDate(inst.settlementDate) : '—'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!selectedPlan.installments.length && (
                        <div className="fin-empty">Nenhuma parcela registrada neste plano.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="fin-empty" style={{ padding: 'var(--space-8)' }}>
                    Selecione um plano para acompanhar as parcelas.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Conciliação / Auditoria ── */}
        {!loading && tab === 'conciliacao' && (
          <div className="fin-audit-list">
            {audit.map((event) => (
              <article key={event.id} className="fin-audit-item">
                <div>
                  <strong>{event.summary}</strong>
                  <span>{event.scope}</span>
                </div>
                <div className="fin-audit-meta">
                  <span className={`fin-status-badge fin-status-badge--${event.status}`}>{statusLabel(event.status)}</span>
                  <time>{new Date(event.occurredAt).toLocaleString('pt-BR')}</time>
                </div>
              </article>
            ))}
            {!audit.length && (
              <div className="fin-empty">Nenhum evento de auditoria financeira disponível.</div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <>
          <button
            className="fin-modal-backdrop"
            onClick={closeModal}
            aria-label="Fechar modal"
          />

          <div className="fin-modal" role="dialog" aria-modal="true" aria-label="Novo Lançamento">
            {/* Header */}
            <div className="fin-modal-header">
              <div className="fin-modal-title">
                <div className="fin-modal-icon">
                  <Plus size={18} />
                </div>
                <div>
                  <h3>Novo Lançamento</h3>
                  <p>Adicione uma nova entrada avulsa ou plano parcelado</p>
                </div>
              </div>
              <button className="fin-modal-close" onClick={closeModal} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className="fin-modal-tabs-wrapper">
              <div className="fin-modal-tabs" role="tablist">
                <button
                  role="tab"
                  aria-selected={modalTab === 'avulso'}
                  className={`fin-modal-tab${modalTab === 'avulso' ? ' is-active' : ''}`}
                  onClick={() => setModalTab('avulso')}
                >
                  Lançamento Avulso
                </button>
                <button
                  role="tab"
                  aria-selected={modalTab === 'parcelado'}
                  className={`fin-modal-tab${modalTab === 'parcelado' ? ' is-active' : ''}`}
                  onClick={() => setModalTab('parcelado')}
                >
                  Plano Parcelado
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="fin-modal-body">

              {/* ── Avulso form ── */}
              {modalTab === 'avulso' && (
                <form id="fin-form-avulso" className="fin-form" onSubmit={handleCreateEntryModal}>
                  <div className="fin-form-row">
                    <label>
                      Tipo
                      <select
                        value={form.type}
                        onChange={(e) =>
                          setForm((cur) => ({
                            ...cur,
                            type: e.target.value as ApiFinanceEntry['type'],
                            categoryCode:
                              e.target.value === 'receivable'
                                ? receivableCategories[0]?.code || ''
                                : payableCategories[0]?.code || '',
                          }))
                        }
                      >
                        <option value="receivable">Receber</option>
                        <option value="payable">Pagar</option>
                      </select>
                    </label>
                    <label>
                      Categoria
                      <select
                        value={form.categoryCode}
                        onChange={(e) => setForm((cur) => ({ ...cur, categoryCode: e.target.value }))}
                      >
                        {categoriesForForm.map((cat) => (
                          <option key={cat.code} value={cat.code}>{cat.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="fin-form-row">
                    <label>
                      Cliente
                      <select
                        value={form.clientId}
                        onChange={(e) => setForm((cur) => ({ ...cur, clientId: e.target.value, processId: '' }))}
                      >
                        <option value="">Sem cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
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
                  </div>

                  <label>
                    Descrição
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
                      placeholder="Ex.: Honorários — 1ª parcela"
                      required
                    />
                  </label>

                  <div className="fin-form-row">
                    <label>
                      Valor (R$)
                      <div className="fin-amount-wrap">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={modalAmountStr}
                          onChange={(e) => setModalAmountStr(e.target.value)}
                          placeholder="0,00"
                          required
                        />
                      </div>
                    </label>
                    <label>
                      Vencimento
                      <input
                        type="date"
                        value={form.dueDate}
                        onChange={(e) => setForm((cur) => ({ ...cur, dueDate: e.target.value }))}
                        required
                      />
                    </label>
                  </div>

                  <label>
                    Observações <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 'var(--font-size-xs)', color: 'var(--neutral-400)' }}>(opcional)</span>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((cur) => ({ ...cur, notes: e.target.value }))}
                      rows={3}
                      placeholder="Notas internas sobre este lançamento"
                    />
                  </label>
                </form>
              )}

              {/* ── Parcelado form ── */}
              {modalTab === 'parcelado' && (
                <form id="fin-form-parcelado" className="fin-form" onSubmit={handleCreateInstallmentPlanModal}>
                  <div className="fin-form-row">
                    <label>
                      Cliente
                      <select
                        value={planForm.clientId}
                        onChange={(e) => setPlanForm((cur) => ({ ...cur, clientId: e.target.value, processId: '' }))}
                        required
                      >
                        <option value="">Selecione um cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
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
                  </div>

                  <label>
                    Rótulo do contrato
                    <input
                      type="text"
                      value={planForm.contractLabel}
                      onChange={(e) => setPlanForm((cur) => ({ ...cur, contractLabel: e.target.value }))}
                      placeholder="Ex.: Honorários — Ação Trabalhista"
                      required
                    />
                  </label>

                  <div className="fin-form-row">
                    <label>
                      Descrição
                      <input
                        type="text"
                        value={planForm.description}
                        onChange={(e) => setPlanForm((cur) => ({ ...cur, description: e.target.value }))}
                        placeholder="Ex.: 6 parcelas fixas todo dia 30"
                      />
                    </label>
                    <label>
                      Categoria
                      <select
                        value={planForm.categoryCode}
                        onChange={(e) => setPlanForm((cur) => ({ ...cur, categoryCode: e.target.value }))}
                      >
                        {receivableCategories.map((cat) => (
                          <option key={cat.code} value={cat.code}>{cat.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Parcelamento section */}
                  <div className="fin-form-section">
                    <p className="fin-form-section-title">Configuração das parcelas</p>

                    <div className="fin-form-row">
                      <label>
                        Valor total (R$)
                        <div className="fin-amount-wrap">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={totalAmountStr}
                            onChange={(e) => setTotalAmountStr(e.target.value)}
                            placeholder="0,00"
                            required
                          />
                        </div>
                      </label>
                      <label>
                        Número de parcelas
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={planForm.installmentCount}
                          onChange={(e) => setPlanForm((cur) => ({ ...cur, installmentCount: e.target.value }))}
                          required
                        />
                      </label>
                    </div>

                    <div className="fin-form-row">
                      <label>
                        Vencimento da 1ª parcela
                        <input
                          type="date"
                          value={planForm.firstDueDate}
                          onChange={(e) => setPlanForm((cur) => ({ ...cur, firstDueDate: e.target.value }))}
                          required
                        />
                      </label>
                      <label>
                        Dia base (recorrência)
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={planForm.dayOfMonth}
                          onChange={(e) => setPlanForm((cur) => ({ ...cur, dayOfMonth: e.target.value }))}
                        />
                      </label>
                    </div>

                    {/* Interest toggle */}
                    <div className="fin-interest-row">
                      <div className="fin-interest-label">
                        <span>Juros mensais compostos?</span>
                        <small>Se ativado, aplica PMT sobre o valor total</small>
                      </div>
                      <label className="fin-toggle">
                        <input
                          type="checkbox"
                          checked={withInterest}
                          onChange={(e) => setWithInterest(e.target.checked)}
                        />
                        <span className="fin-toggle-track" />
                      </label>
                    </div>

                    {withInterest && (
                      <label>
                        Taxa de juros (% ao mês)
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={interestRateStr}
                          onChange={(e) => setInterestRateStr(e.target.value)}
                          placeholder="Ex.: 1.5"
                        />
                      </label>
                    )}
                  </div>

                  {/* Installment preview */}
                  {installmentPreview.length > 0 && (
                    <div className="fin-preview">
                      <div className="fin-preview-header">
                        <span>Prévia das parcelas</span>
                        <strong>{formatMoney(previewTotal)}{withInterest && previewTotal > 0 ? ' total com juros' : ''}</strong>
                      </div>
                      <div className="fin-preview-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Vencimento</th>
                              <th style={{ textAlign: 'right' }}>Valor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installmentPreview.map((row) => (
                              <tr key={row.num}>
                                <td className="fin-preview-num">{row.num}/{installmentPreview.length}</td>
                                <td>{formatDate(row.date)}</td>
                                <td className="fin-preview-val">{formatMoney(row.amountCents)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="fin-preview-footer">
                        <span>{installmentPreview.length} parcelas</span>
                        <strong>{formatMoney(previewTotal)}</strong>
                      </div>
                    </div>
                  )}

                  <label>
                    Observações <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 'var(--font-size-xs)', color: 'var(--neutral-400)' }}>(opcional)</span>
                    <textarea
                      value={planForm.notes}
                      onChange={(e) => setPlanForm((cur) => ({ ...cur, notes: e.target.value }))}
                      rows={3}
                      placeholder="Notas sobre o contrato de parcelamento"
                    />
                  </label>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="fin-modal-footer">
              <button className="btn-secondary" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button
                className="btn-primary"
                type="submit"
                form={modalTab === 'avulso' ? 'fin-form-avulso' : 'fin-form-parcelado'}
                disabled={!canEntry || submitting}
              >
                {submitting ? 'Salvando…' : 'Salvar lançamento'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Financeiro
