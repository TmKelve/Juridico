import { buildFinanceInstallmentPlanPayload } from '../../finance.contract';
import { assertCategoryMatchesType, type FinanceCategoryRepository } from '../categories/finance-category.repository';
import type { FinanceEntryCreateInput, FinanceEntryRepository, FinanceEntryRow } from '../accounts/finance-entry.repository';
import { FinanceAuditService, FinanceDomainError, type FinanceActor } from '../shared';

export interface FinanceInstallmentPlanRow {
  id: number;
  description: string;
  clientId: number | null;
  clientRecord?: { id: number; name: string; email?: string | null; phone?: string | null } | null;
  processId: number | null;
  process?: { id: number; title: string; processNumber?: string | null } | null;
  categoryCode: string;
  installmentCount: number;
  installmentAmountCents: number;
  totalAmountCents: number;
  dueDay: number;
  firstDueDate: Date;
  active: boolean;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  entries?: FinanceEntryRow[];
}

export interface FinanceInstallmentPlanCreateInput {
  description: string;
  clientId: number | null;
  processId: number | null;
  categoryCode: string;
  installmentCount: number;
  installmentAmountCents: number;
  dueDay: number;
  firstDueDate: string;
  responsibleUserId: number | null;
  notes?: string | null;
  idempotencyKey?: string | null;
}

export interface FinanceInstallmentPlanRepository {
  create(input: Omit<FinanceInstallmentPlanRow, 'id' | 'createdAt' | 'updatedAt' | 'entries'>): Promise<FinanceInstallmentPlanRow>;
  attachEntries(planId: number, entryIds: number[]): Promise<void>;
  list(): Promise<FinanceInstallmentPlanRow[]>;
}

function normalizeDateOnly(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new FinanceDomainError('Data inicial do parcelamento inválida', 400, 'FIN_INSTALLMENT_PLAN_INVALID', { value });
  }
  return date;
}

function clampDueDate(date: Date, dueDay: number, monthOffset: number) {
  const baseYear = date.getUTCFullYear();
  const baseMonth = date.getUTCMonth() + monthOffset;
  const year = baseYear + Math.floor(baseMonth / 12);
  const month = ((baseMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(Math.max(dueDay, 1), lastDay)));
}

function resolveInitialStatus(dueDate: Date, now = new Date()) {
  return dueDate.getTime() < new Date(now.toISOString().slice(0, 10)).getTime() ? 'overdue' : 'open';
}

export class InMemoryFinanceInstallmentPlanRepository implements FinanceInstallmentPlanRepository {
  private readonly rows = new Map<number, FinanceInstallmentPlanRow>();
  private sequence = 1;

  async create(input: Omit<FinanceInstallmentPlanRow, 'id' | 'createdAt' | 'updatedAt' | 'entries'>) {
    const row: FinanceInstallmentPlanRow = {
      ...input,
      id: this.sequence++,
      createdAt: new Date(),
      updatedAt: new Date(),
      entries: [],
    };
    this.rows.set(row.id, row);
    return { ...row, entries: [] };
  }

  async attachEntries(planId: number, entryIds: number[]) {
    const current = this.rows.get(planId);
    if (!current) return;
    current.updatedAt = new Date();
    current.entries = (current.entries ?? []).map((entry) => ({ ...entry }));
    current.notes = current.notes ?? null;
    this.rows.set(planId, current);
  }

  async list() {
    return [...this.rows.values()].map((row) => ({ ...row, entries: row.entries ? [...row.entries] : [] }));
  }

  upsertPlan(plan: FinanceInstallmentPlanRow) {
    this.rows.set(plan.id, { ...plan, entries: plan.entries ? [...plan.entries] : [] });
    this.sequence = Math.max(this.sequence, plan.id + 1);
  }
}

export class PrismaFinanceInstallmentPlanRepository implements FinanceInstallmentPlanRepository {
  constructor(private readonly prisma: any) {}

  async create(input: Omit<FinanceInstallmentPlanRow, 'id' | 'createdAt' | 'updatedAt' | 'entries'>) {
    return this.prisma.financeInstallmentPlan.create({
      data: {
        description: input.description,
        clientId: input.clientId,
        processId: input.processId,
        categoryCode: input.categoryCode,
        installmentCount: input.installmentCount,
        installmentAmountCents: input.installmentAmountCents,
        totalAmountCents: input.totalAmountCents,
        dueDay: input.dueDay,
        firstDueDate: input.firstDueDate,
        active: input.active,
        notes: input.notes,
        createdBy: input.createdBy,
      },
      include: {
        clientRecord: { select: { id: true, name: true, email: true, phone: true } },
        process: { select: { id: true, title: true, processNumber: true } },
        entries: { include: { category: true, charges: { orderBy: { createdAt: 'desc' }, take: 1 }, clientRecord: { select: { id: true, name: true, email: true, phone: true } }, process: { select: { id: true, title: true, processNumber: true } } } },
      },
    });
  }

  async attachEntries(planId: number, entryIds: number[]) {
    await this.prisma.financeEntry.updateMany({
      where: { id: { in: entryIds } },
      data: { installmentPlanId: planId },
    });
  }

  async list() {
    return this.prisma.financeInstallmentPlan.findMany({
      include: {
        clientRecord: { select: { id: true, name: true, email: true, phone: true } },
        process: { select: { id: true, title: true, processNumber: true } },
        entries: {
          include: {
            category: true,
            charges: { orderBy: { createdAt: 'desc' }, take: 1 },
            clientRecord: { select: { id: true, name: true, email: true, phone: true } },
            process: { select: { id: true, title: true, processNumber: true } },
          },
          orderBy: [{ installmentNumber: 'asc' }, { dueDate: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class FinanceInstallmentPlanService {
  constructor(
    private readonly dependencies: {
      plans: FinanceInstallmentPlanRepository;
      entries: FinanceEntryRepository;
      categories: FinanceCategoryRepository;
      auditService: FinanceAuditService;
      now?: () => Date;
    },
  ) {}

  async createPlan(input: FinanceInstallmentPlanCreateInput, actor: FinanceActor) {
    const now = this.dependencies.now?.() ?? new Date();
    const description = input.description.trim();
    const installmentCount = Math.trunc(input.installmentCount);
    const installmentAmountCents = Math.trunc(input.installmentAmountCents);
    const dueDay = Math.trunc(input.dueDay);
    const firstDueDate = normalizeDateOnly(input.firstDueDate);

    if (!description || installmentCount <= 0 || installmentAmountCents <= 0 || dueDay < 1 || dueDay > 31) {
      throw new FinanceDomainError('Plano de parcelamento inválido', 400, 'FIN_INSTALLMENT_PLAN_INVALID');
    }

    const category = await this.dependencies.categories.findByCode(input.categoryCode);
    assertCategoryMatchesType(category, 'receivable');
    await this.dependencies.entries.assertClientExists(input.clientId);
    await this.dependencies.entries.assertProcessExists(input.processId);
    await this.dependencies.entries.assertUserExists(input.responsibleUserId);

    const result = await this.dependencies.auditService.runIdempotent({
      key: input.idempotencyKey,
      scope: 'finance.installmentPlan.create',
      entityType: 'installment_plan',
      entityId: input.clientId ?? input.processId ?? description,
      action: 'create',
      responseCode: 201,
      payload: {
        ...input,
        description,
        installmentCount,
        installmentAmountCents,
        dueDay,
        firstDueDate: firstDueDate.toISOString(),
      },
      execute: async () => {
        const plan = await this.dependencies.plans.create({
          description,
          clientId: input.clientId,
          processId: input.processId,
          categoryCode: input.categoryCode,
          installmentCount,
          installmentAmountCents,
          totalAmountCents: installmentCount * installmentAmountCents,
          dueDay,
          firstDueDate,
          active: true,
          notes: input.notes ?? null,
          createdBy: actor.email ?? null,
        });

        const createdEntries: FinanceEntryRow[] = [];
        for (let index = 0; index < installmentCount; index += 1) {
          const dueDate = index === 0 ? firstDueDate : clampDueDate(firstDueDate, dueDay, index);
          const entryInput: FinanceEntryCreateInput = {
            type: 'receivable',
            status: resolveInitialStatus(dueDate, now),
            description: `${description} - parcela ${index + 1}/${installmentCount}`,
            amountCents: installmentAmountCents,
            settledAmountCents: 0,
            dueDate,
            settlementDate: null,
            paymentMethod: null,
            currency: 'BRL',
            clientId: input.clientId,
            processId: input.processId,
            installmentPlanId: plan.id,
            installmentNumber: index + 1,
            categoryCode: input.categoryCode,
            responsibleUserId: input.responsibleUserId,
            notes: input.notes ?? null,
            referenceNumber: `FIN-PLAN-${plan.id}-${index + 1}`,
            externalRef: null,
          };
          createdEntries.push(await this.dependencies.entries.create(entryInput));
        }

        await this.dependencies.plans.attachEntries(plan.id, createdEntries.map((entry) => entry.id));
        return {
          plan: buildFinanceInstallmentPlanPayload({ ...plan, entries: createdEntries.map((entry) => ({ ...entry, category })) }),
          entries: createdEntries.map((entry) => ({
            ...entry,
            category,
          })),
        };
      },
    });

    const auditEvent = await this.dependencies.auditService.record({
      scope: 'finance.audit.event',
      entityType: 'installment_plan',
      entityId: result.data.plan.id,
      action: 'installment_plan_created',
      status: 'success',
      summary: `Plano de parcelamento #${result.data.plan.id} criado`,
      details: {
        clientId: result.data.plan.clientId,
        processId: result.data.plan.processId,
        installmentCount: result.data.plan.installmentCount,
        installmentAmountCents: result.data.plan.installmentAmountCents,
      },
      actor,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      ...result.data,
      auditEvent,
      idempotency: result.mode,
    };
  }

  async listPlans() {
    const rows = await this.dependencies.plans.list();
    return rows.map((row) => buildFinanceInstallmentPlanPayload(row));
  }
}
