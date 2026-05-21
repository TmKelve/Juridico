import type { FinanceChargeMethod, FinanceChargeStatus, FinancePaymentMethod } from '../shared';

export interface FinanceEntryRow {
  id: number;
  type: string;
  status: string;
  description: string;
  amountCents: number;
  settledAmountCents: number;
  dueDate: Date;
  settlementDate: Date | null;
  paymentMethod: string | null;
  currency: string;
  clientId: number | null;
  processId: number | null;
  categoryCode: string;
  category?: { code: string; label: string } | null;
  responsibleUserId: number | null;
  referenceNumber?: string | null;
  notes: string | null;
  externalRef?: string | null;
  createdAt: Date;
  updatedAt: Date;
  charges: Array<{ status: string; method: string }>;
}

export interface FinanceEntryRelations {
  clients?: Array<{ id: number }>;
  processes?: Array<{ id: number }>;
  users?: Array<{ id: number }>;
}

export interface FinanceEntryCreateInput {
  type: string;
  status: string;
  description: string;
  amountCents: number;
  settledAmountCents: number;
  dueDate: Date;
  settlementDate: Date | null;
  paymentMethod: FinancePaymentMethod | null;
  currency: string;
  clientId: number | null;
  processId: number | null;
  categoryCode: string;
  responsibleUserId: number | null;
  notes: string | null;
  referenceNumber?: string | null;
  externalRef?: string | null;
}

export interface FinanceEntryRepository {
  create(input: FinanceEntryCreateInput): Promise<FinanceEntryRow>;
  update(entryId: number, data: Partial<FinanceEntryCreateInput & { status: string }>): Promise<FinanceEntryRow>;
  findById(entryId: number): Promise<FinanceEntryRow | null>;
  list(filters?: { type?: string; status?: string }): Promise<FinanceEntryRow[]>;
  chargeStatusSnapshot(entryId: number): Promise<{ chargeStatus: FinanceChargeStatus | null; billingMethod: FinanceChargeMethod | null }>;
  assertClientExists(clientId: number | null): Promise<void>;
  assertProcessExists(processId: number | null): Promise<void>;
  assertUserExists(userId: number | null): Promise<void>;
}

export class InMemoryFinanceEntryRepository implements FinanceEntryRepository {
  private readonly entries = new Map<number, FinanceEntryRow>();
  private readonly clients: Set<number>;
  private readonly processes: Set<number>;
  private readonly users: Set<number>;
  private sequence = 1;

  constructor(relations: FinanceEntryRelations = {}) {
    this.clients = new Set((relations.clients ?? []).map((item) => item.id));
    this.processes = new Set((relations.processes ?? []).map((item) => item.id));
    this.users = new Set((relations.users ?? []).map((item) => item.id));
  }

  async create(input: FinanceEntryCreateInput) {
    const row: FinanceEntryRow = {
      id: this.sequence++,
      type: input.type,
      status: input.status,
      description: input.description,
      amountCents: input.amountCents,
      settledAmountCents: input.settledAmountCents,
      dueDate: input.dueDate,
      settlementDate: input.settlementDate,
      paymentMethod: input.paymentMethod,
      currency: input.currency,
      clientId: input.clientId,
      processId: input.processId,
      categoryCode: input.categoryCode,
      category: null,
      responsibleUserId: input.responsibleUserId,
      referenceNumber: input.referenceNumber ?? null,
      notes: input.notes ?? null,
      externalRef: input.externalRef ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      charges: [],
    };
    this.entries.set(row.id, row);
    return { ...row, charges: [...row.charges] };
  }

  async update(entryId: number, data: Partial<FinanceEntryCreateInput & { status: string }>) {
    const current = this.entries.get(entryId);
    if (!current) throw new Error(`Entry ${entryId} not found`);
    const next: FinanceEntryRow = {
      ...current,
      ...data,
      updatedAt: new Date(),
      charges: current.charges,
    };
    this.entries.set(entryId, next);
    return { ...next, charges: [...next.charges] };
  }

  async findById(entryId: number) {
    const current = this.entries.get(entryId);
    return current ? { ...current, charges: [...current.charges] } : null;
  }

  async list(filters: { type?: string; status?: string } = {}) {
    return [...this.entries.values()].filter((entry) => {
      if (filters.type && entry.type !== filters.type) return false;
      if (filters.status && entry.status !== filters.status) return false;
      return true;
    }).map((entry) => ({ ...entry, charges: [...entry.charges] }));
  }

  async chargeStatusSnapshot(entryId: number) {
    const row = this.entries.get(entryId);
    const latest = row?.charges && row.charges.length ? row.charges[row.charges.length - 1] : null;
    return {
      chargeStatus: (latest?.status ?? null) as FinanceChargeStatus | null,
      billingMethod: (latest?.method ?? null) as FinanceChargeMethod | null,
    };
  }

  async assertClientExists(clientId: number | null) {
    if (clientId !== null && !this.clients.has(clientId)) throw Object.assign(new Error('client'), { code: 'FIN_CLIENT_NOT_FOUND' });
  }

  async assertProcessExists(processId: number | null) {
    if (processId !== null && !this.processes.has(processId)) throw Object.assign(new Error('process'), { code: 'FIN_PROCESS_NOT_FOUND' });
  }

  async assertUserExists(userId: number | null) {
    if (userId !== null && !this.users.has(userId)) throw Object.assign(new Error('user'), { code: 'FIN_ENTRY_INVALID' });
  }

  upsertEntry(entry: Partial<FinanceEntryRow> & { id: number }) {
    const current = this.entries.get(entry.id);
    const row: FinanceEntryRow = {
      id: entry.id,
      type: entry.type ?? current?.type ?? 'receivable',
      status: entry.status ?? current?.status ?? 'open',
      description: entry.description ?? current?.description ?? '',
      amountCents: entry.amountCents ?? current?.amountCents ?? 0,
      settledAmountCents: entry.settledAmountCents ?? current?.settledAmountCents ?? 0,
      dueDate: entry.dueDate ?? current?.dueDate ?? new Date(),
      settlementDate: entry.settlementDate ?? current?.settlementDate ?? null,
      paymentMethod: entry.paymentMethod ?? current?.paymentMethod ?? null,
      currency: entry.currency ?? current?.currency ?? 'BRL',
      clientId: entry.clientId ?? current?.clientId ?? null,
      processId: entry.processId ?? current?.processId ?? null,
      categoryCode: entry.categoryCode ?? current?.categoryCode ?? '',
      category: entry.category ?? current?.category ?? null,
      responsibleUserId: entry.responsibleUserId ?? current?.responsibleUserId ?? null,
      referenceNumber: entry.referenceNumber ?? current?.referenceNumber ?? null,
      notes: entry.notes ?? current?.notes ?? null,
      externalRef: entry.externalRef ?? current?.externalRef ?? null,
      createdAt: entry.createdAt ?? current?.createdAt ?? new Date(),
      updatedAt: entry.updatedAt ?? current?.updatedAt ?? new Date(),
      charges: entry.charges ?? current?.charges ?? [],
    };
    this.entries.set(entry.id, row);
    this.sequence = Math.max(this.sequence, entry.id + 1);
  }
}

export class PrismaFinanceEntryRepository implements FinanceEntryRepository {
  constructor(private readonly prisma: any) {}

  private include = { category: true, charges: { orderBy: { createdAt: 'desc' }, take: 1 } };

  async create(input: FinanceEntryCreateInput) {
    return this.prisma.financeEntry.create({ data: input, include: this.include });
  }

  async update(entryId: number, data: Partial<FinanceEntryCreateInput & { status: string }>) {
    return this.prisma.financeEntry.update({ where: { id: entryId }, data, include: this.include });
  }

  async findById(entryId: number) {
    return this.prisma.financeEntry.findUnique({ where: { id: entryId }, include: this.include });
  }

  async list(filters: { type?: string; status?: string } = {}) {
    return this.prisma.financeEntry.findMany({
      where: {
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: this.include,
      orderBy: [{ dueDate: 'asc' }, { id: 'desc' }],
    });
  }

  async chargeStatusSnapshot(entryId: number) {
    const entry = await this.prisma.financeEntry.findUnique({
      where: { id: entryId },
      include: { charges: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    const latest = entry?.charges?.[0] ?? null;
    return {
      chargeStatus: (latest?.status ?? null) as FinanceChargeStatus | null,
      billingMethod: (latest?.method ?? null) as FinanceChargeMethod | null,
    };
  }

  async assertClientExists(clientId: number | null) {
    if (clientId === null) return;
    const found = await this.prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!found) throw Object.assign(new Error('client'), { code: 'FIN_CLIENT_NOT_FOUND' });
  }

  async assertProcessExists(processId: number | null) {
    if (processId === null) return;
    const found = await this.prisma.process.findUnique({ where: { id: processId }, select: { id: true } });
    if (!found) throw Object.assign(new Error('process'), { code: 'FIN_PROCESS_NOT_FOUND' });
  }

  async assertUserExists(userId: number | null) {
    if (userId === null) return;
    const found = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!found) throw Object.assign(new Error('user'), { code: 'FIN_ENTRY_INVALID' });
  }
}
