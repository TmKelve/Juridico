export class PrismaBiSourceRepository {
  constructor(private readonly prisma: any) {}

  async listProductivitySnapshots(input: {
    scopeType: string;
    scopeId: string | null;
    from: string;
    to: string;
  }) {
    const rows = await this.prisma.productivitySnapshot.findMany({
      where: {
        referenceDate: {
          gte: new Date(`${input.from}T00:00:00.000Z`),
          lte: new Date(`${input.to}T23:59:59.999Z`),
        },
        scopeType: input.scopeType,
        scopeId: input.scopeId ?? undefined,
      },
      orderBy: { referenceDate: 'asc' },
    }).catch(() => []);

    return rows.map((row: any) => ({
      referenceDate: new Date(row.referenceDate).toISOString().slice(0, 10),
      tasksCompleted: row.tasksCompleted,
      tasksOverdue: row.tasksOverdue,
      attendancesHandled: row.attendancesHandled,
      avgResolutionHours: row.avgResolutionHours ?? null,
    }));
  }

  async listFinanceSnapshots(input: { from: string; to: string }) {
    const rows = await this.prisma.financeEntry.findMany({
      where: {
        dueDate: {
          gte: new Date(`${input.from}T00:00:00.000Z`),
          lte: new Date(`${input.to}T23:59:59.999Z`),
        },
      },
      orderBy: { dueDate: 'asc' },
    }).catch(() => []);

    const grouped = new Map();
    for (const row of rows) {
      const referenceDate = new Date(row.dueDate).toISOString().slice(0, 10);
      const current = grouped.get(referenceDate) ?? {
        referenceDate,
        receivablesOpenCents: 0,
        receivablesOverdueCents: 0,
        payablesOpenCents: 0,
        cashflowNetCents: 0,
      };
      if (row.type === 'receivable') {
        current.receivablesOpenCents += row.amountCents;
        if (row.status === 'overdue') current.receivablesOverdueCents += row.amountCents;
        current.cashflowNetCents += row.amountCents;
      } else {
        current.payablesOpenCents += row.amountCents;
        current.cashflowNetCents -= row.amountCents;
      }
      grouped.set(referenceDate, current);
    }

    return [...grouped.values()].sort((left, right) => left.referenceDate.localeCompare(right.referenceDate));
  }
}
