-- ============================================================
--  LEXORA – Seed financeiro para desenvolvimento e produção
--  Popula: FinanceInstallmentPlan + FinanceEntry
--  Pré-requisito: clientes (id 1-10) e processos (id 1-10)
--                 já existentes + FinanceCategory populada
-- ============================================================

BEGIN;

-- ── Garante categorias (idempotente) ────────────────────────
INSERT INTO "FinanceCategory" (code, label, type, active, "sortOrder", "createdAt", "updatedAt")
VALUES
  ('honorarios',  'Honorários',  'receivable', true, 10, NOW(), NOW()),
  ('acordo',      'Acordo',      'receivable', true, 20, NOW(), NOW()),
  ('mensalidade', 'Mensalidade', 'receivable', true, 30, NOW(), NOW()),
  ('custas',      'Custas',      'payable',    true, 40, NOW(), NOW()),
  ('fornecedor',  'Fornecedor',  'payable',    true, 50, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- ============================================================
--  PLANOS DE PARCELAMENTO
-- ============================================================

-- Plano 1: João da Silva – Honorários Trabalhista 12x R$800
--   clientId=1, processId=1
WITH plan1 AS (
  INSERT INTO "FinanceInstallmentPlan"
    (description, "clientId", "processId", "categoryCode",
     "installmentCount", "installmentAmountCents", "totalAmountCents",
     "dueDay", "firstDueDate", active, notes, "createdBy", "createdAt", "updatedAt")
  VALUES
    ('Honorários – Ação Trabalhista João da Silva', 1, 1, 'honorarios',
     12, 80000, 960000,
     10, NOW() - INTERVAL '11 months', true,
     'Parcelamento aprovado em reunião inicial. 12x R$800,00.', 'carlos.mendes@lexora.dev', NOW() - INTERVAL '11 months', NOW())
  RETURNING id
),
-- Plano 2: Empresa ABC – Honorários Empresarial 6x R$3.000
--   clientId=3, processId=5
plan2 AS (
  INSERT INTO "FinanceInstallmentPlan"
    (description, "clientId", "processId", "categoryCode",
     "installmentCount", "installmentAmountCents", "totalAmountCents",
     "dueDay", "firstDueDate", active, notes, "createdBy", "createdAt", "updatedAt")
  VALUES
    ('Honorários – Ação Cobrança Empresa ABC', 3, 5, 'honorarios',
     6, 300000, 1800000,
     15, NOW() - INTERVAL '5 months', true,
     'Honorários de êxito parcelado. 6x R$3.000,00.', 'ana.santos@lexora.dev', NOW() - INTERVAL '5 months', NOW())
  RETURNING id
),
-- Plano 3: Tech Solutions – Mensalidade Retainer 24x R$3.500
--   clientId=5, processId=6
plan3 AS (
  INSERT INTO "FinanceInstallmentPlan"
    (description, "clientId", "processId", "categoryCode",
     "installmentCount", "installmentAmountCents", "totalAmountCents",
     "dueDay", "firstDueDate", active, notes, "createdBy", "createdAt", "updatedAt")
  VALUES
    ('Contrato de Assessoria Tributária – Tech Solutions', 5, 6, 'mensalidade',
     24, 350000, 8400000,
     5, NOW() - INTERVAL '23 months', true,
     'Retainer mensal 24 meses. Assessoria tributária ICMS/ISS.', 'carlos.mendes@lexora.dev', NOW() - INTERVAL '23 months', NOW())
  RETURNING id
),

-- ── Parcelas do Plano 1 (João da Silva, 12x R$800) ──────────
entries_plan1 AS (
  INSERT INTO "FinanceEntry"
    (type, status, description, "amountCents", "settledAmountCents",
     "dueDate", "settlementDate", "paymentMethod",
     "clientId", "processId", "installmentPlanId", "installmentNumber",
     "categoryCode", notes, "createdBy", "createdAt", "updatedAt")
  SELECT
    'receivable',
    CASE
      WHEN i <= 10 THEN 'paid'
      WHEN (NOW() - INTERVAL '1 month' * (12 - i))::date < CURRENT_DATE THEN 'overdue'
      ELSE 'open'
    END,
    'Honorários Trabalhista – Parcela ' || i || '/12',
    80000, -- R$800,00
    CASE WHEN i <= 10 THEN 80000 ELSE 0 END,
    (NOW() - INTERVAL '11 months' + INTERVAL '1 month' * (i - 1))::date,
    CASE WHEN i <= 10 THEN (NOW() - INTERVAL '11 months' + INTERVAL '1 month' * (i - 1) + INTERVAL '3 days')::date ELSE NULL END,
    CASE WHEN i <= 10 THEN 'pix' ELSE NULL END,
    1, 1, (SELECT id FROM plan1), i,
    'honorarios', NULL, 'carlos.mendes@lexora.dev', NOW() - INTERVAL '11 months', NOW()
  FROM generate_series(1, 12) AS i
  RETURNING id, "installmentPlanId"
),

-- ── Parcelas do Plano 2 (Empresa ABC, 6x R$3.000) ──────────
entries_plan2 AS (
  INSERT INTO "FinanceEntry"
    (type, status, description, "amountCents", "settledAmountCents",
     "dueDate", "settlementDate", "paymentMethod",
     "clientId", "processId", "installmentPlanId", "installmentNumber",
     "categoryCode", notes, "createdBy", "createdAt", "updatedAt")
  SELECT
    'receivable',
    CASE
      WHEN i <= 4 THEN 'paid'
      WHEN i = 5 THEN 'overdue'
      ELSE 'open'
    END,
    'Honorários de Êxito – Parcela ' || i || '/6',
    300000,
    CASE WHEN i <= 4 THEN 300000 WHEN i = 5 THEN 150000 ELSE 0 END,
    (NOW() - INTERVAL '5 months' + INTERVAL '1 month' * (i - 1))::date,
    CASE WHEN i <= 4 THEN (NOW() - INTERVAL '5 months' + INTERVAL '1 month' * (i - 1) + INTERVAL '2 days')::date ELSE NULL END,
    CASE WHEN i <= 4 THEN 'boleto' ELSE NULL END,
    3, 5, (SELECT id FROM plan2), i,
    'honorarios', NULL, 'ana.santos@lexora.dev', NOW() - INTERVAL '5 months', NOW()
  FROM generate_series(1, 6) AS i
  RETURNING id, "installmentPlanId"
),

-- ── Parcelas do Plano 3 (Tech Solutions, 24x R$3.500) ──────
entries_plan3 AS (
  INSERT INTO "FinanceEntry"
    (type, status, description, "amountCents", "settledAmountCents",
     "dueDate", "settlementDate", "paymentMethod",
     "clientId", "processId", "installmentPlanId", "installmentNumber",
     "categoryCode", notes, "createdBy", "createdAt", "updatedAt")
  SELECT
    'receivable',
    CASE
      WHEN i <= 21 THEN 'paid'
      WHEN i = 22 THEN 'overdue'
      ELSE 'open'
    END,
    'Mensalidade Assessoria Tributária – ' || TO_CHAR(NOW() - INTERVAL '23 months' + INTERVAL '1 month' * (i - 1), 'MM/YYYY'),
    350000,
    CASE WHEN i <= 21 THEN 350000 ELSE 0 END,
    (NOW() - INTERVAL '23 months' + INTERVAL '1 month' * (i - 1))::date,
    CASE WHEN i <= 21 THEN (NOW() - INTERVAL '23 months' + INTERVAL '1 month' * (i - 1) + INTERVAL '5 days')::date ELSE NULL END,
    CASE WHEN i <= 21 THEN 'pix' ELSE NULL END,
    5, 6, (SELECT id FROM plan3), i,
    'mensalidade', NULL, 'carlos.mendes@lexora.dev', NOW() - INTERVAL '23 months', NOW()
  FROM generate_series(1, 24) AS i
  RETURNING id, "installmentPlanId"
),

-- ============================================================
--  LANÇAMENTOS AVULSOS – CONTAS A RECEBER
-- ============================================================
avulsos_receber AS (
  INSERT INTO "FinanceEntry"
    (type, status, description, "amountCents", "settledAmountCents",
     "dueDate", "settlementDate", "paymentMethod",
     "clientId", "processId", "categoryCode", notes, "createdBy", "createdAt", "updatedAt")
  VALUES
    -- Pedro Costa – honorários CIV-003 (inadimplente)
    ('receivable','overdue','Honorários – Ação Cível Pedro Costa (fase instrução)',
     1200000, 0, (NOW() - INTERVAL '45 days')::date, NULL, NULL,
     4, 3, 'honorarios','Honorários fase instrução. Vencido há mais de 30 dias.','carlos.mendes@lexora.dev',NOW() - INTERVAL '50 days', NOW()),

    -- Pedro Costa – 2ª cobrança
    ('receivable','open','Honorários – Ação Indenizatória Pedro Costa (CIV-008)',
     800000, 0, (NOW() + INTERVAL '10 days')::date, NULL, NULL,
     4, 8, 'honorarios', NULL,'carlos.mendes@lexora.dev', NOW() - INTERVAL '5 days', NOW()),

    -- Roberto Alves – acordo trabalhista (inadimplente)
    ('receivable','overdue','Honorários de Êxito – Sentença Trabalhista Roberto Alves',
     1500000, 0, (NOW() - INTERVAL '30 days')::date, NULL, NULL,
     7, 7, 'acordo','Honorários de êxito pós-sentença. Valor combinado R$15.000,00.','carlos.mendes@lexora.dev', NOW() - INTERVAL '35 days', NOW()),

    -- Maria Oliveira – previdenciário (inadimplente)
    ('receivable','overdue','Honorários – Benefício Previdenciário Maria Oliveira',
     500000, 0, (NOW() - INTERVAL '20 days')::date, NULL, NULL,
     2, 4, 'honorarios','Parcela em aberto após concessão do benefício.','ana.santos@lexora.dev', NOW() - INTERVAL '25 days', NOW()),

    -- Fernanda Lima – honorários TRB-002 (pago)
    ('receivable','paid','Honorários Iniciais – Ação Trabalhista Fernanda Lima',
     600000, 600000, (NOW() - INTERVAL '40 days')::date, (NOW() - INTERVAL '38 days')::date, 'pix',
     6, 2, 'honorarios', NULL,'carlos.mendes@lexora.dev', NOW() - INTERVAL '45 days', NOW()),

    -- Fernanda Lima – 2ª parcela (open)
    ('receivable','open','Honorários – Preparação para AIJ Fernanda Lima',
     600000, 0, (NOW() + INTERVAL '15 days')::date, NULL, NULL,
     6, 2, 'honorarios', NULL,'carlos.mendes@lexora.dev', NOW() - INTERVAL '10 days', NOW()),

    -- Construtora XYZ – honorários (pago)
    ('receivable','paid','Honorários Defesa – Ação Danos Construtora XYZ',
     2500000, 2500000, (NOW() - INTERVAL '60 days')::date, (NOW() - INTERVAL '57 days')::date, 'boleto',
     8, NULL, 'honorarios', NULL,'carlos.mendes@lexora.dev', NOW() - INTERVAL '65 days', NOW()),

    -- Indústria Nacional – acordo (open)
    ('receivable','open','Honorários – Parcelamento FGTS Indústria Nacional',
     800000, 0, (NOW() + INTERVAL '20 days')::date, NULL, NULL,
     10, 10, 'acordo', NULL,'carlos.mendes@lexora.dev', NOW() - INTERVAL '3 days', NOW()),

    -- Cláudia Mendonça – honorários iniciais (open)
    ('receivable','open','Honorários Iniciais – Caso Hospitalar Cláudia Mendonça',
     350000, 0, (NOW() + INTERVAL '30 days')::date, NULL, NULL,
     9, 9, 'honorarios','Valor combinado na triagem. Aguardando assinatura do contrato.','ana.santos@lexora.dev', NOW() - INTERVAL '2 days', NOW()),

    -- Tech Solutions – honorários tributário (parcialmente pago)
    ('receivable','partially_paid','Honorários Tributários – Recurso ICMS Tech Solutions',
     1800000, 900000, (NOW() - INTERVAL '10 days')::date, NULL, NULL,
     5, 6, 'honorarios','50% recebido. Restante aguarda resultado do acórdão.','ana.santos@lexora.dev', NOW() - INTERVAL '15 days', NOW())

  RETURNING id
),

-- ============================================================
--  LANÇAMENTOS AVULSOS – CONTAS A PAGAR
-- ============================================================
avulsos_pagar AS (
  INSERT INTO "FinanceEntry"
    (type, status, description, "amountCents", "settledAmountCents",
     "dueDate", "settlementDate", "paymentMethod",
     "clientId", "processId", "categoryCode", notes, "createdBy", "createdAt", "updatedAt")
  VALUES
    -- Custas TRB-001 (pago)
    ('payable','paid','Custas processuais – TRB-2024-001 (distribuição)',
     120000, 120000, (NOW() - INTERVAL '90 days')::date, (NOW() - INTERVAL '89 days')::date, 'boleto',
     1, 1, 'custas', NULL,'lucas.ferreira@lexora.dev', NOW() - INTERVAL '92 days', NOW()),

    -- Custas CIV-003 (em aberto)
    ('payable','open','Custas perícia judicial – CIV-2024-003',
     250000, 0, (NOW() + INTERVAL '5 days')::date, NULL, NULL,
     4, 3, 'custas','DARE pericial conforme despacho de 10/04/2024.','carlos.mendes@lexora.dev', NOW() - INTERVAL '7 days', NOW()),

    -- Custas TRI-006 (pago)
    ('payable','paid','Preparo recursal – TRI-2024-006 (TJSP)',
     125000, 125000, (NOW() - INTERVAL '50 days')::date, (NOW() - INTERVAL '49 days')::date, 'boleto',
     5, 6, 'custas', NULL,'lucas.ferreira@lexora.dev', NOW() - INTERVAL '52 days', NOW()),

    -- Fornecedor perito CIV-003 (inadimplente – vencido)
    ('payable','overdue','Honorários perito judicial – CIV-2024-003',
     600000, 0, (NOW() - INTERVAL '15 days')::date, NULL, NULL,
     4, 3, 'fornecedor','Dr. Marcos Vieira (perito). NF emitida em 12/04.','carlos.mendes@lexora.dev', NOW() - INTERVAL '20 days', NOW()),

    -- Fornecedor software escritório (pago)
    ('payable','paid','Licença sistema escritório – março/2024',
     89000, 89000, (NOW() - INTERVAL '60 days')::date, (NOW() - INTERVAL '59 days')::date, 'debito_automatico',
     NULL, NULL, 'fornecedor', NULL,'lucas.ferreira@lexora.dev', NOW() - INTERVAL '62 days', NOW()),

    -- Custas PRV-004 (em aberto)
    ('payable','open','Custas recurso administrativo – PRV-2024-004',
     35000, 0, (NOW() + INTERVAL '12 days')::date, NULL, NULL,
     2, 4, 'custas', NULL,'ana.santos@lexora.dev', NOW() - INTERVAL '4 days', NOW()),

    -- Custas TRB-007 (em aberto)
    ('payable','open','Custas impugnação de cálculos – TRB-2024-007',
     180000, 0, (NOW() + INTERVAL '18 days')::date, NULL, NULL,
     7, 7, 'custas','DARE conforme despacho de 22/04/2024.','carlos.mendes@lexora.dev', NOW() - INTERVAL '3 days', NOW()),

    -- Fornecedor outsourcing (em aberto)
    ('payable','open','Serviços de diligência – Cartório 3° Ofício SP',
     22000, 0, (NOW() + INTERVAL '7 days')::date, NULL, NULL,
     NULL, NULL, 'fornecedor','Registro de procuração e autenticação de documentos.','lucas.ferreira@lexora.dev', NOW() - INTERVAL '1 day', NOW()),

    -- Fornecedor software licença mensal (em aberto)
    ('payable','open','Licença sistema escritório – maio/2024',
     89000, 0, (NOW() + INTERVAL '4 days')::date, NULL, NULL,
     NULL, NULL, 'fornecedor', NULL,'lucas.ferreira@lexora.dev', NOW(), NOW()),

    -- Custas TRB-002 AIJ (em aberto)
    ('payable','open','Custas audiência de instrução – TRB-2024-002',
     45000, 0, (NOW() + INTERVAL '20 days')::date, NULL, NULL,
     6, 2, 'custas','DARE para AIJ de 20/05/2024.','carlos.mendes@lexora.dev', NOW() - INTERVAL '2 days', NOW())

  RETURNING id
)

SELECT 'Seed financeiro concluído.' AS status;

COMMIT;
