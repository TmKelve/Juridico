/**
 * Lexora – Finance seed
 * Creates realistic finance data: 3 installment plans + ~60 entries
 *
 * Usage:
 *   npm run db:seed:finance                     (reads DATABASE_URL from env / .env)
 *   DATABASE_URL="postgres://..." npx ts-node prisma/seed-finance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function addMonths(base: Date, n: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + n);
  return d;
}

type EntryStatus = 'open' | 'overdue' | 'paid' | 'partially_paid';
type EntryType = 'receivable' | 'payable';

interface PlanEntry {
  installmentNumber: number;
  dueDate: Date;
  status: EntryStatus;
  settledAmountCents: number;
  settlementDate: Date | null;
  paymentMethod: string | null;
}

// ── Categories (idempotent) ──────────────────────────────────────────────────

async function ensureCategories() {
  const categories = [
    { code: 'honorarios', label: 'Honorários', type: 'receivable', sortOrder: 10 },
    { code: 'acordo', label: 'Acordo', type: 'receivable', sortOrder: 20 },
    { code: 'mensalidade', label: 'Mensalidade', type: 'receivable', sortOrder: 30 },
    { code: 'custas', label: 'Custas', type: 'payable', sortOrder: 40 },
    { code: 'fornecedor', label: 'Fornecedor', type: 'payable', sortOrder: 50 },
  ];
  for (const cat of categories) {
    await prisma.financeCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: { ...cat, active: true },
    });
  }
  console.log('  ✓ Categories ensured');
}

// ── Resolve client/process IDs ───────────────────────────────────────────────

async function resolveIds() {
  const clients = await prisma.client.findMany({ take: 10, orderBy: { id: 'asc' } });
  const processes = await prisma.process.findMany({ take: 11, orderBy: { id: 'asc' } });

  if (clients.length < 5 || processes.length < 5) {
    throw new Error(
      `Insufficient base data: ${clients.length} clients, ${processes.length} processes.\n` +
      'Run the main seed first: psql $DATABASE_URL -f prisma/seed.sql',
    );
  }

  const c = (idx: number) => clients[idx - 1]?.id ?? null;
  const p = (idx: number) => processes[idx - 1]?.id ?? null;

  return { c, p };
}

// ── Installment plan factory ──────────────────────────────────────────────────

function buildPlanEntries(opts: {
  count: number;
  amountCents: number;
  firstDueDate: Date;
  paidCount: number;
  overdueIndex?: number; // 1-based index that is overdue
}): PlanEntry[] {
  return Array.from({ length: opts.count }, (_, i) => {
    const num = i + 1;
    const dueDate = addMonths(opts.firstDueDate, i);
    const isPaid = num <= opts.paidCount;
    const isOverdue = num === opts.overdueIndex;
    const status: EntryStatus = isPaid ? 'paid' : isOverdue ? 'overdue' : 'open';

    return {
      installmentNumber: num,
      dueDate,
      status,
      settledAmountCents: isPaid ? opts.amountCents : 0,
      settlementDate: isPaid ? addMonths(opts.firstDueDate, i) : null,
      paymentMethod: isPaid ? 'pix' : null,
    };
  });
}

// ── Main seed ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱  Starting Lexora finance seed…\n');

  await ensureCategories();
  const { c, p } = await resolveIds();

  // ── Guard: skip if already seeded ──────────────────────────────────────────
  const existing = await prisma.financeEntry.count();
  if (existing > 0) {
    console.log(`  ⚠  Finance entries already exist (${existing} found). Skipping to avoid duplicates.`);
    console.log('     Delete existing data first if you want to re-seed.');
    return;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAN 1 — João da Silva · Honorários Trabalhista 12×R$800
  // ══════════════════════════════════════════════════════════════════════════
  const plan1First = monthsAgo(11);
  const plan1Entries = buildPlanEntries({
    count: 12, amountCents: 80000, firstDueDate: plan1First,
    paidCount: 10, overdueIndex: 11,
  });

  const plan1 = await prisma.financeInstallmentPlan.create({
    data: {
      description: 'Honorários – Ação Trabalhista João da Silva',
      clientId: c(1),
      processId: p(1),
      categoryCode: 'honorarios',
      installmentCount: 12,
      installmentAmountCents: 80000,
      totalAmountCents: 960000,
      dueDay: 10,
      firstDueDate: plan1First,
      active: true,
      notes: 'Parcelamento aprovado em reunião inicial. 12×R$800,00.',
      createdBy: 'carlos.mendes@lexora.dev',
    },
  });

  await prisma.financeEntry.createMany({
    data: plan1Entries.map((e) => ({
      type: 'receivable' as EntryType,
      status: e.status,
      description: `Honorários Trabalhista – Parcela ${e.installmentNumber}/12`,
      amountCents: 80000,
      settledAmountCents: e.settledAmountCents,
      dueDate: e.dueDate,
      settlementDate: e.settlementDate,
      paymentMethod: e.paymentMethod,
      clientId: c(1),
      processId: p(1),
      installmentPlanId: plan1.id,
      installmentNumber: e.installmentNumber,
      categoryCode: 'honorarios',
      createdBy: 'carlos.mendes@lexora.dev',
    })),
  });
  console.log(`  ✓ Plan 1 created (id=${plan1.id}) — João da Silva 12×R$800`);

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAN 2 — Empresa ABC · Honorários Êxito 6×R$3.000
  // ══════════════════════════════════════════════════════════════════════════
  const plan2First = monthsAgo(5);
  const plan2Entries = buildPlanEntries({
    count: 6, amountCents: 300000, firstDueDate: plan2First,
    paidCount: 3, overdueIndex: 4,
  });
  // Make parcela 4 partially paid
  plan2Entries[3].status = 'partially_paid';
  plan2Entries[3].settledAmountCents = 150000;

  const plan2 = await prisma.financeInstallmentPlan.create({
    data: {
      description: 'Honorários de Êxito – Ação Cobrança Empresa ABC',
      clientId: c(3),
      processId: p(5),
      categoryCode: 'honorarios',
      installmentCount: 6,
      installmentAmountCents: 300000,
      totalAmountCents: 1800000,
      dueDay: 15,
      firstDueDate: plan2First,
      active: true,
      notes: 'Honorários de êxito parcelado. 6×R$3.000,00.',
      createdBy: 'ana.santos@lexora.dev',
    },
  });

  await prisma.financeEntry.createMany({
    data: plan2Entries.map((e) => ({
      type: 'receivable' as EntryType,
      status: e.status,
      description: `Honorários de Êxito – Parcela ${e.installmentNumber}/6`,
      amountCents: 300000,
      settledAmountCents: e.settledAmountCents,
      dueDate: e.dueDate,
      settlementDate: e.settlementDate,
      paymentMethod: e.paymentMethod,
      clientId: c(3),
      processId: p(5),
      installmentPlanId: plan2.id,
      installmentNumber: e.installmentNumber,
      categoryCode: 'honorarios',
      createdBy: 'ana.santos@lexora.dev',
    })),
  });
  console.log(`  ✓ Plan 2 created (id=${plan2.id}) — Empresa ABC 6×R$3.000`);

  // ══════════════════════════════════════════════════════════════════════════
  //  PLAN 3 — Tech Solutions · Retainer Tributário 24×R$3.500
  // ══════════════════════════════════════════════════════════════════════════
  const plan3First = monthsAgo(23);
  const plan3Entries = buildPlanEntries({
    count: 24, amountCents: 350000, firstDueDate: plan3First,
    paidCount: 21, overdueIndex: 22,
  });

  const plan3 = await prisma.financeInstallmentPlan.create({
    data: {
      description: 'Contrato de Assessoria Tributária – Tech Solutions',
      clientId: c(5),
      processId: p(6),
      categoryCode: 'mensalidade',
      installmentCount: 24,
      installmentAmountCents: 350000,
      totalAmountCents: 8400000,
      dueDay: 5,
      firstDueDate: plan3First,
      active: true,
      notes: 'Retainer mensal 24 meses. Assessoria tributária ICMS/ISS.',
      createdBy: 'carlos.mendes@lexora.dev',
    },
  });

  await prisma.financeEntry.createMany({
    data: plan3Entries.map((e) => ({
      type: 'receivable' as EntryType,
      status: e.status,
      description: `Mensalidade Assessoria – ${addMonths(plan3First, e.installmentNumber - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
      amountCents: 350000,
      settledAmountCents: e.settledAmountCents,
      dueDate: e.dueDate,
      settlementDate: e.settlementDate,
      paymentMethod: e.paymentMethod,
      clientId: c(5),
      processId: p(6),
      installmentPlanId: plan3.id,
      installmentNumber: e.installmentNumber,
      categoryCode: 'mensalidade',
      createdBy: 'carlos.mendes@lexora.dev',
    })),
  });
  console.log(`  ✓ Plan 3 created (id=${plan3.id}) — Tech Solutions 24×R$3.500`);

  // ══════════════════════════════════════════════════════════════════════════
  //  AVULSOS – CONTAS A RECEBER
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.financeEntry.createMany({
    data: [
      // Pedro Costa – CIV-003 honorários vencidos (inadimplente)
      { type: 'receivable', status: 'overdue', description: 'Honorários – Fase Instrução (CIV-2024-003)', amountCents: 1200000, settledAmountCents: 0, dueDate: daysAgo(45), clientId: c(4), processId: p(3), categoryCode: 'honorarios', notes: 'Honorários fase instrução. Vencido há mais de 30 dias.', createdBy: 'carlos.mendes@lexora.dev' },
      // Pedro Costa – CIV-008 honorários (open)
      { type: 'receivable', status: 'open', description: 'Honorários – Ação Indenizatória (CIV-2024-008)', amountCents: 800000, settledAmountCents: 0, dueDate: daysFromNow(10), clientId: c(4), processId: p(8), categoryCode: 'honorarios', createdBy: 'carlos.mendes@lexora.dev' },
      // Roberto Alves – TRB-007 acordo de êxito (overdue)
      { type: 'receivable', status: 'overdue', description: 'Honorários de Êxito – Sentença Trabalhista (TRB-2024-007)', amountCents: 1500000, settledAmountCents: 0, dueDate: daysAgo(30), clientId: c(7), processId: p(7), categoryCode: 'acordo', notes: 'Honorários de êxito pós-sentença. R$15.000 combinados.', createdBy: 'carlos.mendes@lexora.dev' },
      // Maria Oliveira – PRV-004 (overdue)
      { type: 'receivable', status: 'overdue', description: 'Honorários – Benefício Previdenciário (PRV-2024-004)', amountCents: 500000, settledAmountCents: 0, dueDate: daysAgo(20), clientId: c(2), processId: p(4), categoryCode: 'honorarios', notes: 'Parcela em aberto após concessão do benefício.', createdBy: 'ana.santos@lexora.dev' },
      // Fernanda Lima – TRB-002 1ª parcela (pago)
      { type: 'receivable', status: 'paid', description: 'Honorários Iniciais – Ação Trabalhista (TRB-2024-002)', amountCents: 600000, settledAmountCents: 600000, dueDate: daysAgo(40), settlementDate: daysAgo(38), paymentMethod: 'pix', clientId: c(6), processId: p(2), categoryCode: 'honorarios', createdBy: 'carlos.mendes@lexora.dev' },
      // Fernanda Lima – TRB-002 2ª parcela (open)
      { type: 'receivable', status: 'open', description: 'Honorários – Preparação para AIJ (TRB-2024-002)', amountCents: 600000, settledAmountCents: 0, dueDate: daysFromNow(15), clientId: c(6), processId: p(2), categoryCode: 'honorarios', createdBy: 'carlos.mendes@lexora.dev' },
      // Construtora XYZ – honorários (pago)
      { type: 'receivable', status: 'paid', description: 'Honorários Defesa – Ação de Danos (Construtora XYZ)', amountCents: 2500000, settledAmountCents: 2500000, dueDate: daysAgo(60), settlementDate: daysAgo(57), paymentMethod: 'boleto', clientId: c(8), processId: null, categoryCode: 'honorarios', createdBy: 'carlos.mendes@lexora.dev' },
      // Indústria Nacional – acordo FGTS (open)
      { type: 'receivable', status: 'open', description: 'Honorários – Parcelamento FGTS (TRI-2024-010)', amountCents: 800000, settledAmountCents: 0, dueDate: daysFromNow(20), clientId: c(10), processId: p(10), categoryCode: 'acordo', createdBy: 'carlos.mendes@lexora.dev' },
      // Cláudia Mendonça – caso hospitalar honorários iniciais (open)
      { type: 'receivable', status: 'open', description: 'Honorários Iniciais – Caso Hospitalar (CIV-2024-009)', amountCents: 350000, settledAmountCents: 0, dueDate: daysFromNow(30), clientId: c(9), processId: p(9), categoryCode: 'honorarios', notes: 'Valor combinado na triagem. Aguardando assinatura do contrato.', createdBy: 'ana.santos@lexora.dev' },
      // Tech Solutions – honorários tributário (parcialmente pago)
      { type: 'receivable', status: 'partially_paid', description: 'Honorários Tributários – Recurso ICMS (TRI-2024-006)', amountCents: 1800000, settledAmountCents: 900000, dueDate: daysAgo(10), clientId: c(5), processId: p(6), categoryCode: 'honorarios', notes: '50% recebido. Restante aguarda resultado do acórdão.', createdBy: 'ana.santos@lexora.dev' },
    ].map((e) => ({ ...e, updatedAt: new Date() })),
  });
  console.log('  ✓ Avulsos a receber criados (10)');

  // ══════════════════════════════════════════════════════════════════════════
  //  AVULSOS – CONTAS A PAGAR
  // ══════════════════════════════════════════════════════════════════════════
  await prisma.financeEntry.createMany({
    data: [
      // Custas TRB-001 (pago)
      { type: 'payable', status: 'paid', description: 'Custas processuais – Distribuição (TRB-2024-001)', amountCents: 120000, settledAmountCents: 120000, dueDate: daysAgo(90), settlementDate: daysAgo(89), paymentMethod: 'boleto', clientId: c(1), processId: p(1), categoryCode: 'custas', createdBy: 'lucas.ferreira@lexora.dev' },
      // Custas CIV-003 perícia (open)
      { type: 'payable', status: 'open', description: 'Custas perícia judicial – DARE (CIV-2024-003)', amountCents: 250000, settledAmountCents: 0, dueDate: daysFromNow(5), clientId: c(4), processId: p(3), categoryCode: 'custas', notes: 'DARE pericial conforme despacho de 10/04/2024.', createdBy: 'carlos.mendes@lexora.dev' },
      // Custas TRI-006 preparo recursal (pago)
      { type: 'payable', status: 'paid', description: 'Preparo recursal – TJSP (TRI-2024-006)', amountCents: 125000, settledAmountCents: 125000, dueDate: daysAgo(50), settlementDate: daysAgo(49), paymentMethod: 'boleto', clientId: c(5), processId: p(6), categoryCode: 'custas', createdBy: 'lucas.ferreira@lexora.dev' },
      // Fornecedor perito CIV-003 (overdue)
      { type: 'payable', status: 'overdue', description: 'Honorários perito judicial – CIV-2024-003', amountCents: 600000, settledAmountCents: 0, dueDate: daysAgo(15), clientId: c(4), processId: p(3), categoryCode: 'fornecedor', notes: 'Dr. Marcos Vieira (perito). NF emitida em 12/04.', createdBy: 'carlos.mendes@lexora.dev' },
      // Fornecedor software (pago)
      { type: 'payable', status: 'paid', description: 'Licença sistema de gestão – abr/2024', amountCents: 89000, settledAmountCents: 89000, dueDate: daysAgo(60), settlementDate: daysAgo(59), paymentMethod: 'debito_automatico', clientId: null, processId: null, categoryCode: 'fornecedor', createdBy: 'lucas.ferreira@lexora.dev' },
      // Custas PRV-004 recurso (open)
      { type: 'payable', status: 'open', description: 'Custas recurso administrativo INSS – PRV-2024-004', amountCents: 35000, settledAmountCents: 0, dueDate: daysFromNow(12), clientId: c(2), processId: p(4), categoryCode: 'custas', createdBy: 'ana.santos@lexora.dev' },
      // Custas TRB-007 impugnação (open)
      { type: 'payable', status: 'open', description: 'Custas impugnação de cálculos – TRB-2024-007', amountCents: 180000, settledAmountCents: 0, dueDate: daysFromNow(18), clientId: c(7), processId: p(7), categoryCode: 'custas', notes: 'DARE conforme despacho de 22/04/2024.', createdBy: 'carlos.mendes@lexora.dev' },
      // Fornecedor diligência cartório (open)
      { type: 'payable', status: 'open', description: 'Diligência – Cartório 3° Ofício SP', amountCents: 22000, settledAmountCents: 0, dueDate: daysFromNow(7), clientId: null, processId: null, categoryCode: 'fornecedor', notes: 'Registro de procuração e autenticação de documentos.', createdBy: 'lucas.ferreira@lexora.dev' },
      // Fornecedor software licença mensal maio (open)
      { type: 'payable', status: 'open', description: 'Licença sistema de gestão – mai/2024', amountCents: 89000, settledAmountCents: 0, dueDate: daysFromNow(4), clientId: null, processId: null, categoryCode: 'fornecedor', createdBy: 'lucas.ferreira@lexora.dev' },
      // Custas TRB-002 AIJ (open)
      { type: 'payable', status: 'open', description: 'Custas audiência de instrução – TRB-2024-002', amountCents: 45000, settledAmountCents: 0, dueDate: daysFromNow(20), clientId: c(6), processId: p(2), categoryCode: 'custas', notes: 'DARE para AIJ de 20/05/2024.', createdBy: 'carlos.mendes@lexora.dev' },
    ].map((e) => ({ ...e, updatedAt: new Date() })),
  });
  console.log('  ✓ Avulsos a pagar criados (10)');

  // ── Final count ──────────────────────────────────────────────────────────────
  const [totalEntries, totalPlans] = await Promise.all([
    prisma.financeEntry.count(),
    prisma.financeInstallmentPlan.count(),
  ]);

  console.log(`\n✅  Finance seed complete!`);
  console.log(`   Installment plans: ${totalPlans}`);
  console.log(`   Finance entries:   ${totalEntries}`);
  console.log(`   (${await prisma.financeEntry.count({ where: { status: 'overdue' } })} overdue, ` +
              `${await prisma.financeEntry.count({ where: { status: 'paid' } })} paid, ` +
              `${await prisma.financeEntry.count({ where: { status: 'open' } })} open)\n`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
