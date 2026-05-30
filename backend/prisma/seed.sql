-- ============================================================
--  LEXORA – Seed de dados fictícios para desenvolvimento local
--  Senha de todos os usuários: senha123
-- ============================================================

BEGIN;

-- ── 0. RESET SEQUENCES ──────────────────────────────────────
-- Garante que os IDs começam em 1 independente de tentativas anteriores
SELECT setval('"User_id_seq"',      1, false);
SELECT setval('"Client_id_seq"',    1, false);
SELECT setval('"Process_id_seq"',   1, false);
SELECT setval('"Documento_id_seq"', 1, false);
SELECT setval('"Prazo_id_seq"',     1, false);
SELECT setval('"Task_id_seq"',      1, false);
SELECT setval('"Atendimento_id_seq"',1, false);
SELECT setval('"Publication_id_seq"',1, false);

-- ── 1. USUÁRIOS ─────────────────────────────────────────────
-- Roles corretas do sistema: ADM, ADV, FIN, ATD (BL-060)
INSERT INTO "User" (email, password, role) VALUES
  ('carlos.mendes@lexora.dev',   '$2b$10$ayPYAdUI/XfOrYRDe/abMeoApUdOLy2MFBh6XVghH1s4MmyIeiPfy', 'ADM'),
  ('ana.santos@lexora.dev',      '$2b$10$ayPYAdUI/XfOrYRDe/abMeoApUdOLy2MFBh6XVghH1s4MmyIeiPfy', 'ADV'),
  ('lucas.ferreira@lexora.dev',  '$2b$10$ayPYAdUI/XfOrYRDe/abMeoApUdOLy2MFBh6XVghH1s4MmyIeiPfy', 'ATD'),
  ('patricia.lima@lexora.dev',   '$2b$10$ayPYAdUI/XfOrYRDe/abMeoApUdOLy2MFBh6XVghH1s4MmyIeiPfy', 'FIN')
ON CONFLICT (email) DO NOTHING;

-- ── 2. CLIENTES ─────────────────────────────────────────────
INSERT INTO "Client" (name, type, "cpfCnpj", phone, email, address, status, "legalArea", responsible, notes, "createdAt") VALUES
  ('João da Silva',         'PF', '123.456.789-01', '(11) 98765-4321', 'joao.silva@email.com',     'Rua das Flores, 123 – São Paulo/SP',   'ativo',    'Trabalhista',    'Dr. Carlos Mendes',  'Cliente desde 2022. Ação trabalhista contra ex-empregador.', NOW()),
  ('Maria Oliveira',        'PF', '234.567.890-12', '(11) 97654-3210', 'maria.oliveira@email.com', 'Av. Paulista, 456 – São Paulo/SP',    'ativo',    'Previdenciário', 'Dr. Carlos Mendes',  'Pedido de aposentadoria por invalidez. CNIS em análise.',    NOW()),
  ('Empresa ABC Ltda',      'PJ', '12.345.678/0001-90', '(11) 3333-4444', 'juridico@abc.com.br',  'Av. Faria Lima, 789 – São Paulo/SP',  'ativo',    'Empresarial',    'Dra. Ana Santos',    'Ação de cobrança contra fornecedor inadimplente.',           NOW()),
  ('Pedro Costa',           'PF', '345.678.901-23', '(21) 96543-2109', 'pedro.costa@email.com',   'Rua Copacabana, 321 – Rio de Janeiro/RJ', 'ativo', 'Cível',          'Dr. Carlos Mendes',  'Disputa condominial. Réu é construtora.',                    NOW()),
  ('Tech Solutions Ltda',   'PJ', '23.456.789/0001-01', '(11) 2222-3333', 'legal@techsolutions.com.br', 'Rua Vergueiro, 111 – São Paulo/SP', 'ativo', 'Tributário',    'Dra. Ana Santos',    'Autuação fiscal ICMS 2023. Valores elevados.',               NOW()),
  ('Fernanda Lima',         'PF', '456.789.012-34', '(11) 95432-1098', 'fernanda.lima@email.com', 'Rua Augusta, 654 – São Paulo/SP',     'ativo',    'Trabalhista',    'Dr. Carlos Mendes',  'Rescisão indireta. Assédio moral documentado.',              NOW()),
  ('Roberto Alves',         'PF', '567.890.123-45', '(31) 94321-0987', 'roberto.alves@email.com', 'Av. Afonso Pena, 987 – Belo Horizonte/MG', 'ativo', 'Previdenciário', 'Dra. Ana Santos',  'Benefício negado pelo INSS. Recurso administrativo.',        NOW()),
  ('Construtora XYZ S.A.',  'PJ', '34.567.890/0001-12', '(11) 4444-5555', 'juridico@xyz.com.br', 'Av. Berrini, 555 – São Paulo/SP',     'ativo',    'Empresarial',    'Dr. Carlos Mendes',  'Defesa em ação de danos de obra. Laudo pericial pendente.',  NOW()),
  ('Cláudia Mendonça',      'PF', '678.901.234-56', '(85) 93210-9876', 'claudia.mendonca@email.com', 'Rua Meireles, 222 – Fortaleza/CE', 'prospecto', 'Cível',         'Dra. Ana Santos',    'Contato inicial. Possível ação indenizatória.',              NOW()),
  ('Indústria Nacional S.A.','PJ', '45.678.901/0001-23', '(11) 5555-6666', 'advogados@industnac.com', 'Rua Industrial, 888 – Guarulhos/SP', 'ativo', 'Tributário',   'Dr. Carlos Mendes',  'Parcelamento de débitos FGTS. Negociação em andamento.',    NOW())
ON CONFLICT (name) DO NOTHING;

-- ── 3. PROCESSOS ────────────────────────────────────────────
INSERT INTO "Process" (title, "processNumber", client, "clientId", phase, status, "ownerId") VALUES
  ('Silva vs Empresa Metalúrgica Brasil',   'TRB-2024-001', 'João da Silva',        1,  'Inicial',    'ativo',    1),
  ('Lima vs Tech Solutions – Verb. Resist.','TRB-2024-002', 'Fernanda Lima',        6,  'Contestacao','ativo',    1),
  ('Costa vs Construtora XYZ – Vícios',     'CIV-2024-003', 'Pedro Costa',          4,  'Instrucao',  'ativo',    1),
  ('Oliveira – Benefício Previdenciário',   'PRV-2024-004', 'Maria Oliveira',        2,  'Inicial',    'ativo',    2),
  ('ABC vs Tech Solutions – Cobr. Contrat.','EMP-2024-005', 'Empresa ABC Ltda',     3,  'Sentenca',   'ativo',    2),
  ('Tech Solutions – Impugn. ICMS 2023',    'TRI-2024-006', 'Tech Solutions Ltda',  5,  'Recurso',    'ativo',    2),
  ('Alves vs Construtora XYZ – Horas Extra','TRB-2024-007', 'Roberto Alves',        7,  'Sentenca',   'ativo',    1),
  ('Costa vs ABC – Indenização Contratual', 'CIV-2024-008', 'Pedro Costa',          4,  'Inicial',    'ativo',    1),
  ('Mendonça – Dano Moral Hospitalar',      'CIV-2024-009', 'Cláudia Mendonça',     9,  'Inicial',    'ativo',    2),
  ('Indústria Nacional – Parcel. FGTS',     'TRI-2024-010', 'Indústria Nacional S.A.', 10, 'Contestacao','ativo', 1)
ON CONFLICT ("processNumber") DO NOTHING;

-- ── 4. DOCUMENTOS ───────────────────────────────────────────
-- TRB-2024-001 (Inicial)
INSERT INTO "Documento" (title, description, "processId", status, category, version, "isLatestVersion", origin, "uploadedAt", "updatedAt", responsible, "requiredChecklist", "pendingForAdvance", "mimeType") VALUES
  ('Procuração assinada',            'Procuração ad judicia para representação no processo',     1, 'validado',             'Contrato',  1, true,  'upload',   NOW() - INTERVAL '20 days', NOW(), 'Lucas Ferreira', true,  true,  'application/pdf'),
  ('Documento de identidade – RG',   'RG frente e verso do cliente João da Silva',               1, 'validado',             'Checklist', 1, true,  'cliente',  NOW() - INTERVAL '19 days', NOW(), 'Lucas Ferreira', true,  false, 'image/jpeg'),
  ('Carteira de Trabalho (CTPS)',     'CTPS com páginas do vínculo empregatício',                 1, 'aguardando_validacao', 'Prova',     1, true,  'cliente',  NOW() - INTERVAL '5 days',  NOW(), 'Ana Santos',     true,  false, 'application/pdf'),
  ('Holerites – últimos 3 meses',    'Holerites de janeiro, fevereiro e março de 2024',          1, 'pendente',             'Prova',     1, true,  'cliente',  NOW() - INTERVAL '2 days',  NOW(), 'Lucas Ferreira', true,  false, 'application/pdf'),
  ('Contrato de trabalho',           'Contrato de trabalho original firmado em 2019',             1, 'pendente',             'Contrato',  1, true,  'cliente',  NOW() - INTERVAL '1 day',   NOW(), 'Lucas Ferreira', true,  false, 'application/pdf'),

-- TRB-2024-002 (Contestação)
  ('Procuração atualizada',          'Procuração renovada para fase de contestação',              2, 'validado',             'Contrato',  1, true,  'upload',   NOW() - INTERVAL '30 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Contestação – Verbas Rescisórias','Peça de defesa apresentada em 15/03/2024',                2, 'validado',             'Peticao',   1, true,  'interno',  NOW() - INTERVAL '15 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Comprovantes de pagamento FGTS', 'Extratos FGTS e guias de recolhimento',                    2, 'aguardando_validacao', 'Financeiro',1, true,  'cliente',  NOW() - INTERVAL '3 days',  NOW(), 'Ana Santos',     false, false, 'application/pdf'),

-- CIV-2024-003 (Instrução)
  ('Laudo pericial preliminar',       'Laudo de vistoria do imóvel – perito oficial',            3, 'validado',             'Prova',     1, true,  'interno',  NOW() - INTERVAL '45 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Rol de testemunhas',              'Lista de 3 testemunhas arroladas pela parte autora',       3, 'validado',             'Checklist', 1, true,  'interno',  NOW() - INTERVAL '40 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Alegações finais',                'Memorial final aguardando prazo do juízo',                 3, 'pendente',             'Peticao',   1, true,  'interno',  NOW() - INTERVAL '1 day',   NOW(), 'Carlos Mendes',  true,  false, 'application/pdf'),

-- PRV-2024-004 (Inicial)
  ('Extrato CNIS',                    'CNIS atualizado em 01/04/2024',                            4, 'validado',             'Prova',     1, true,  'cliente',  NOW() - INTERVAL '10 days', NOW(), 'Lucas Ferreira', true,  true,  'application/pdf'),
  ('Laudo médico – incapacidade',     'Laudo do Dr. Rodrigo Pereira, CRM 12345',                 4, 'aguardando_validacao', 'Prova',     1, true,  'cliente',  NOW() - INTERVAL '4 days',  NOW(), 'Ana Santos',     true,  true,  'application/pdf'),
  ('Carteira de trabalho (CTPS)',     'CTPS com histórico de vínculos previdenciários',           4, 'pendente',             'Prova',     1, true,  'cliente',  NOW() - INTERVAL '2 days',  NOW(), 'Lucas Ferreira', true,  false, 'application/pdf'),

-- EMP-2024-005 (Sentença)
  ('Cópia da sentença',               'Sentença prolatada em 20/04/2024 – procedente parcial',   5, 'validado',             'Checklist', 1, true,  'interno',  NOW() - INTERVAL '7 days',  NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Cálculo de liquidação',           'Memória de cálculo elaborada pelo contador',               5, 'aguardando_validacao', 'Financeiro',1, true,  'interno',  NOW() - INTERVAL '2 days',  NOW(), 'Ana Santos',     true,  false, 'application/pdf'),

-- TRI-2024-006 (Recurso)
  ('Recurso ordinário – ICMS',        'RO protocolado em 10/03/2024 – TJSP',                     6, 'validado',             'Peticao',   1, true,  'interno',  NOW() - INTERVAL '50 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Comprovante de preparo',          'DARE pago em 09/03/2024 – R$ 1.250,00',                   6, 'validado',             'Financeiro',1, true,  'upload',   NOW() - INTERVAL '50 days', NOW(), 'Lucas Ferreira', true,  true,  'application/pdf'),
  ('Contrarrazões ao recurso',        'Contrarrazões da parte contrária recebidas',               6, 'rejeitado',            'Peticao',   1, true,  'cliente',  NOW() - INTERVAL '20 days', NOW(), 'Ana Santos',     false, false, 'application/pdf'),

-- TRB-2024-007 (Sentença)
  ('Sentença trabalhista',            'Sentença de procedência parcial – 1ª Vara do Trabalho',   7, 'validado',             'Checklist', 1, true,  'interno',  NOW() - INTERVAL '14 days', NOW(), 'Carlos Mendes',  true,  true,  'application/pdf'),
  ('Cálculos trabalhistas',           'Liquidação elaborada pelo perito judicial',                7, 'aguardando_validacao', 'Financeiro',1, true,  'interno',  NOW() - INTERVAL '3 days',  NOW(), 'Ana Santos',     true,  false, 'application/pdf'),

-- CIV-2024-008 (Inicial)
  ('Procuração assinada',             'Procuração para ação indenizatória',                       8, 'validado',             'Contrato',  1, true,  'upload',   NOW() - INTERVAL '8 days',  NOW(), 'Lucas Ferreira', true,  true,  'application/pdf'),
  ('Contrato de prestação de serviços','Contrato base da ação – Empresa ABC',                     8, 'pendente',             'Contrato',  1, true,  'cliente',  NOW() - INTERVAL '2 days',  NOW(), 'Lucas Ferreira', true,  false, 'application/pdf'),

-- CIV-2024-009 (Inicial)
  ('Relatório médico hospitalar',     'Relatório de alta com diagnóstico',                        9, 'pendente',             'Prova',     1, true,  'cliente',  NOW() - INTERVAL '1 day',   NOW(), 'Lucas Ferreira', false, false, 'application/pdf');

-- ── 5. PRAZOS ────────────────────────────────────────────────
INSERT INTO "Prazo" ("processId", title, "dueDate", status, priority, notes, origin, responsible, "updatedAt") VALUES
  (1, 'Prazo para manifestação sobre documentos',         NOW() + INTERVAL '5 days',  'aberto',   'alta',   'Manifestação sobre CTPS juntada pelo réu',                    'publicacao', 'Dr. Carlos Mendes', NOW()),
  (3, 'Apresentação das alegações finais',                NOW() + INTERVAL '2 days',  'critico',  'alta',   'Memorial final – improrrogável conforme despacho',            'audiencia',  'Dr. Carlos Mendes', NOW()),
  (4, 'Prazo para perícia médica agendada',               NOW() + INTERVAL '10 days', 'aberto',   'media',  'Perícia pelo INSS para avaliação de incapacidade',            'interno',    'Dra. Ana Santos',   NOW()),
  (5, 'Interposição de recurso de apelação',              NOW() + INTERVAL '8 days',  'aberto',   'alta',   'Prazo de 15 dias contados da intimação – 12/04/2024',         'publicacao', 'Dr. Carlos Mendes', NOW()),
  (6, 'Manifestação sobre contrarrazões do FISCO',        NOW() - INTERVAL '2 days',  'atrasado', 'alta',   'Contrarrazões recebidas em 20/04/2024 – resposta urgente',    'publicacao', 'Dra. Ana Santos',   NOW()),
  (7, 'Prazo para impugnação dos cálculos',               NOW() + INTERVAL '15 days', 'aberto',   'media',  'Impugnar ou concordar com cálculos do perito judicial',       'interno',    'Dr. Carlos Mendes', NOW()),
  (2, 'Audiência de instrução e julgamento',              NOW() + INTERVAL '22 days', 'aberto',   'alta',   'AIJ designada para 20/05/2024 às 14h – 3ª Vara do Trabalho', 'audiencia',  'Dr. Carlos Mendes', NOW()),
  (8, 'Manifestação inicial sobre réplica',               NOW() + INTERVAL '3 days',  'aberto',   'baixa',  'Réplica à contestação da Empresa ABC',                        'interno',    'Dra. Ana Santos',   NOW());

-- ── 6. TAREFAS ──────────────────────────────────────────────
INSERT INTO "Task" (title, description, "processId", "clientId", "clientName", origin, "dueDate", status, priority, owner, "createdBy", notes, "immediateAction", "linkedToDocument", "ownerUserId", "updatedAt") VALUES
  ('Solicitar CTPS atualizada ao cliente',        'Contatar João da Silva para envio da CTPS original ou digitalizada',              1, 1, 'João da Silva',       'documento',  NOW() + INTERVAL '2 days',  'pendente',     'alta',   'Lucas Ferreira', 'Ana Santos',    '',                                            false, true,  3, NOW()),
  ('Revisar cálculos trabalhistas – TRB-007',     'Conferir memória de cálculo antes de apresentar ao juízo',                       7, 7, 'Roberto Alves',       'processo',   NOW() + INTERVAL '5 days',  'em_andamento', 'media',  'Ana Santos',     'Carlos Mendes', 'Perito apresentou valor de R$ 48.200,00',      false, false, 2, NOW()),
  ('Protocolar alegações finais – CIV-003',       'Finalizar e protocolar memorial no sistema do TJSP',                             3, 4, 'Pedro Costa',         'prazo',      NOW() + INTERVAL '2 days',  'em_andamento', 'critica','Carlos Mendes',  'Carlos Mendes', 'Prazo fatal – não pode ser perdido',            true,  false, 1, NOW()),
  ('Contato inicial com Cláudia Mendonça',        'Marcar reunião para colher mais detalhes do caso hospitalar',                    9, 9, 'Cláudia Mendonça',    'atendimento',NOW() + INTERVAL '3 days',  'pendente',     'media',  'Ana Santos',     'Ana Santos',    'Cliente chegou por indicação',                false, false, 2, NOW()),
  ('Verificar andamento do recurso ICMS',         'Checar publicação do acórdão no TJ e tomar providências',                       6, 5, 'Tech Solutions Ltda', 'publicacao', NOW() + INTERVAL '7 days',  'pendente',     'alta',   'Carlos Mendes',  'Carlos Mendes', '',                                            false, false, 1, NOW()),
  ('Juntar laudo médico ao processo PRV-004',     'Protocolar o laudo digitalizado recebido do cliente Maria Oliveira',            4, 2, 'Maria Oliveira',      'documento',  NOW() + INTERVAL '1 day',   'pendente',     'alta',   'Lucas Ferreira', 'Ana Santos',    'Laudo está em validação, aguardar aprovação',  false, true,  3, NOW()),
  ('Elaborar petição inicial – CIV-009',          'Redigir inicial com base no relatório hospitalar e danos sofridos',             9, 9, 'Cláudia Mendonça',    'processo',   NOW() + INTERVAL '14 days', 'pendente',     'media',  'Carlos Mendes',  'Carlos Mendes', '',                                            false, false, 1, NOW()),
  ('Enviar guia de preparo recursal',             'Calcular e enviar DARE para recolhimento antes da interposição',                5, 3, 'Empresa ABC Ltda',    'prazo',      NOW() + INTERVAL '6 days',  'pendente',     'alta',   'Lucas Ferreira', 'Carlos Mendes', 'Valor estimado R$ 3.400,00',                   false, false, 3, NOW());

-- ── 7. ATENDIMENTOS ─────────────────────────────────────────
INSERT INTO "Atendimento" (title, description, notes, date, channel, type, status, priority, "processId", "clientId", "responsibleUserId", "actorEmail", "updatedAt") VALUES
  ('Dúvida sobre andamento do processo trabalhista', 'Cliente perguntou sobre prazo para audiência e solicitou atualização',                                                  'Tom calmo. Informado sobre AIJ em maio.',                             NOW() - INTERVAL '3 days', 'whatsapp',   'rotina',  'resolvido',          'baixa', 2, 6, 1, 'carlos.mendes@lexora.dev', NOW()),
  ('Urgência – prazo vencendo ICMS',                 'Tech Solutions ligou informando que encontrou documentação adicional do período autuado',                               'Documentos podem mudar a tese. Solicitar envio urgente.',             NOW() - INTERVAL '1 day',  'telefone',   'urgencia','aberto',             'alta',  6, 5, 2, 'ana.santos@lexora.dev',    NOW()),
  ('Questionamento sobre sentença EMP-005',          'ABC Ltda solicitou reunião para entender os termos da sentença parcialmente procedente',                                'Reunião agendada para próxima semana',                                NOW() - INTERVAL '5 days', 'email',      'consulta','agendado',           'media', 5, 3, 1, 'carlos.mendes@lexora.dev', NOW()),
  ('Envio de documentos – PRV-004',                  'Maria Oliveira trouxe pessoalmente o laudo médico e extratos previdenciários',                                         'Documentos em bom estado. Escaneados e protocolados.',                NOW() - INTERVAL '4 days', 'presencial', 'rotina',  'resolvido',          'baixa', 4, 2, 3, 'lucas.ferreira@lexora.dev',NOW()),
  ('Primeira reunião – caso hospitalar',             'Cláudia Mendonça relatou evento de dano ocorrido em internação no Hospital Central em fev/2024',                       'Alta potencial de procedência. Solicitar prontuário completo.',        NOW() - INTERVAL '2 days', 'presencial', 'triagem', 'aguardando_cliente', 'alta',  9, 9, 2, 'ana.santos@lexora.dev',    NOW());

-- ── 8. PUBLICAÇÕES ──────────────────────────────────────────
INSERT INTO "Publication" ("processId", "clientId", "publicationType", status, impact, tribunal, origin, "publishedAt", summary, "relevantText", "requiresAction", "convertedToDeadline", read, "derivedDeadlineLabel", "updatedAt") VALUES
  (3, 4, 'despacho',  'em_analise', 'alto',   'TJSP',  'DJE-SP', NOW() - INTERVAL '2 days',  'Despacho determinando apresentação de alegações finais no prazo de 15 dias', 'Vistos. Encerrada a instrução, abra-se vista às partes para apresentação de alegações finais, no prazo de 15 (quinze) dias, sucessivamente.',               true,  false, false, 'Alegações finais – 15 dias', NOW()),
  (6, 5, 'acordao',   'nova',       'critico','TJSP',  'DJE-SP', NOW() - INTERVAL '1 day',   'Acórdão do recurso tributário – resultado desfavorável parcial',               'Acordam os Desembargadores da 11ª Câmara de Direito Público em dar provimento parcial ao recurso, mantendo a autuação fiscal relativa ao ICMS diferencial de alíquota, reformando apenas a multa aplicada.', true,  false, false, NULL,                         NOW()),
  (1, 1, 'intimacao', 'nova',       'alto',   'TRT-2', 'DEJT',   NOW() - INTERVAL '3 days',  'Intimação para manifestação sobre documentos juntados pelo réu',               'Intime-se o reclamante para, no prazo de 5 (cinco) dias úteis, manifestar-se acerca dos documentos juntados pela reclamada às fls. 234/251.',             true,  false, false, 'Manifestação – 5 dias úteis', NOW()),
  (5, 3, 'sentenca',  'lida',       'alto',   'TJSP',  'DJE-SP', NOW() - INTERVAL '7 days',  'Sentença de procedência parcial – ação de cobrança contratual',               'Ante o exposto, julgo PROCEDENTE EM PARTE o pedido para condenar a ré ao pagamento de R$ 87.500,00, devidamente atualizado, rejeitando os pedidos de lucros cessantes por ausência de comprovação.', false, false, true,  NULL,                         NOW()),
  (2, 6, 'despacho',  'tratada',    'medio',  'TRT-2', 'DEJT',   NOW() - INTERVAL '10 days', 'Despacho designando audiência de instrução e julgamento',                      'Designo audiência de instrução e julgamento para o dia 20 de maio de 2024, às 14 horas, na sala de audiências desta Vara.',                               false, true,  true,  'AIJ – 20/05/2024',           NOW());

COMMIT;

-- Verificação final
SELECT 'Usuários' as tabela, COUNT(*) as registros FROM "User"
UNION ALL SELECT 'Clientes',    COUNT(*) FROM "Client"
UNION ALL SELECT 'Processos',   COUNT(*) FROM "Process"
UNION ALL SELECT 'Documentos',  COUNT(*) FROM "Documento"
UNION ALL SELECT 'Prazos',      COUNT(*) FROM "Prazo"
UNION ALL SELECT 'Tarefas',     COUNT(*) FROM "Task"
UNION ALL SELECT 'Atendimentos',COUNT(*) FROM "Atendimento"
UNION ALL SELECT 'Publicações', COUNT(*) FROM "Publication";
