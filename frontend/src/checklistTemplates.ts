// ── Shared checklist types and templates ────────────────────────────────────
// Used by Documents.tsx and ProcessDocumentModal.tsx

export type DocCategory = 'Peticao' | 'Contrato' | 'Prova' | 'Financeiro' | 'Checklist';

export interface ChecklistTemplateItem {
  id: string;
  title: string;
  required: boolean;   // obrigatório para o processo
  blocking: boolean;   // bloqueia andamento sem ele
  category: DocCategory;
}

export interface ChecklistItem extends ChecklistTemplateItem {
  status: 'faltante' | 'aguardando_validacao' | 'validado' | 'rejeitado';
  linkedDocumentId: number | null;
}

export type ProcessPhase = 'Inicial' | 'Contestacao' | 'Instrucao' | 'Sentenca' | 'Recurso';

export const PHASES_ORDER: ProcessPhase[] = [
  'Inicial',
  'Contestacao',
  'Instrucao',
  'Sentenca',
  'Recurso',
];

export const PHASE_LABELS: Record<ProcessPhase, string> = {
  Inicial:    'Inicial',
  Contestacao: 'Contestação',
  Instrucao:  'Instrução',
  Sentenca:   'Sentença',
  Recurso:    'Recurso',
};

export const AREA_LABELS: Record<string, string> = {
  Trabalhista:    'Trabalhista',
  Civel:          'Cível',
  Tributario:     'Tributário',
  Empresarial:    'Empresarial',
  Previdenciario: 'Previdenciário',
  _default:       'Geral',
};

// ── Templates: 5 áreas × 5 fases ────────────────────────────────────────────
export const CHECKLIST_BY_AREA_PHASE: Record<string, Record<ProcessPhase, ChecklistTemplateItem[]>> = {

  // ── Trabalhista ─────────────────────────────────────────────────────────────
  Trabalhista: {
    Inicial: [
      { id: 'trb-ini-1', title: 'Procuração assinada',              required: true,  blocking: true,  category: 'Contrato'   },
      { id: 'trb-ini-2', title: 'Documento de identidade (RG/CPF)', required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'trb-ini-3', title: 'Carteira de Trabalho (CTPS)',      required: true,  blocking: false, category: 'Prova'      },
      { id: 'trb-ini-4', title: 'Contrato de trabalho / rescisão',  required: true,  blocking: false, category: 'Contrato'   },
      { id: 'trb-ini-5', title: 'Holerites (últimos 3 meses)',      required: true,  blocking: false, category: 'Prova'      },
      { id: 'trb-ini-6', title: 'Comprovante de residência',        required: false, blocking: false, category: 'Checklist'  },
      { id: 'trb-ini-7', title: 'Termo de rescisão / TRCT',         required: false, blocking: false, category: 'Contrato'   },
    ],
    Contestacao: [
      { id: 'trb-con-1', title: 'Procuração atualizada',            required: true,  blocking: true,  category: 'Contrato'   },
      { id: 'trb-con-2', title: 'Defesa / contestação do réu',      required: true,  blocking: true,  category: 'Peticao'    },
      { id: 'trb-con-3', title: 'Documentos contra-probatórios',    required: true,  blocking: false, category: 'Prova'      },
      { id: 'trb-con-4', title: 'Comprovantes de pagamento / FGTS', required: false, blocking: false, category: 'Financeiro' },
      { id: 'trb-con-5', title: 'Ata de audiência prévia (se houver)', required: false, blocking: false, category: 'Checklist' },
    ],
    Instrucao: [
      { id: 'trb-ins-1', title: 'Rol de testemunhas',               required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'trb-ins-2', title: 'Laudos periciais (se aplicável)',   required: false, blocking: false, category: 'Prova'      },
      { id: 'trb-ins-3', title: 'Documentos complementares da fase', required: true, blocking: false, category: 'Prova'      },
      { id: 'trb-ins-4', title: 'Memoriais / alegações finais',      required: false, blocking: false, category: 'Peticao'   },
    ],
    Sentenca: [
      { id: 'trb-sen-1', title: 'Cópia da sentença',                required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'trb-sen-2', title: 'Cálculos trabalhistas (liquidação)', required: true, blocking: false, category: 'Financeiro' },
      { id: 'trb-sen-3', title: 'Guia de depósito recursal',         required: false, blocking: false, category: 'Financeiro' },
    ],
    Recurso: [
      { id: 'trb-rec-1', title: 'Recurso ordinário / RO',           required: true,  blocking: true,  category: 'Peticao'    },
      { id: 'trb-rec-2', title: 'Comprovante de preparo',           required: true,  blocking: true,  category: 'Financeiro' },
      { id: 'trb-rec-3', title: 'Contrarrazões (se intimado)',       required: false, blocking: false, category: 'Peticao'   },
      { id: 'trb-rec-4', title: 'Acórdão / decisão do recurso',     required: false, blocking: false, category: 'Checklist'  },
    ],
  },

  // ── Cível ────────────────────────────────────────────────────────────────────
  Civel: {
    Inicial: [
      { id: 'civ-ini-1', title: 'Procuração assinada',              required: true,  blocking: true,  category: 'Contrato'   },
      { id: 'civ-ini-2', title: 'Documento de identidade (RG/CPF)', required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'civ-ini-3', title: 'Contrato ou documento base da ação', required: true, blocking: false, category: 'Contrato'  },
      { id: 'civ-ini-4', title: 'Comprovante de dano / prova dos fatos', required: true, blocking: false, category: 'Prova' },
      { id: 'civ-ini-5', title: 'Comprovante de residência',        required: false, blocking: false, category: 'Checklist'  },
      { id: 'civ-ini-6', title: 'Laudos / perícias iniciais',       required: false, blocking: false, category: 'Prova'      },
    ],
    Contestacao: [
      { id: 'civ-con-1', title: 'Contestação fundamentada',         required: true,  blocking: true,  category: 'Peticao'    },
      { id: 'civ-con-2', title: 'Documentos refutando alegações',   required: true,  blocking: false, category: 'Prova'      },
      { id: 'civ-con-3', title: 'Reconvenção (se aplicável)',       required: false, blocking: false, category: 'Peticao'    },
    ],
    Instrucao: [
      { id: 'civ-ins-1', title: 'Rol de testemunhas',               required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'civ-ins-2', title: 'Laudos / perícias',                required: false, blocking: false, category: 'Prova'      },
      { id: 'civ-ins-3', title: 'Alegações finais',                 required: true,  blocking: false, category: 'Peticao'    },
    ],
    Sentenca: [
      { id: 'civ-sen-1', title: 'Cópia da sentença',                required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'civ-sen-2', title: 'Cálculo de liquidação',            required: false, blocking: false, category: 'Financeiro' },
    ],
    Recurso: [
      { id: 'civ-rec-1', title: 'Apelação / recurso cabível',       required: true,  blocking: true,  category: 'Peticao'    },
      { id: 'civ-rec-2', title: 'Comprovante de custas / preparo',  required: true,  blocking: true,  category: 'Financeiro' },
      { id: 'civ-rec-3', title: 'Contrarrazões (se intimado)',       required: false, blocking: false, category: 'Peticao'   },
    ],
  },

  // ── Tributário ───────────────────────────────────────────────────────────────
  Tributario: {
    Inicial: [
      { id: 'tri-ini-1', title: 'Procuração assinada',              required: true,  blocking: true,  category: 'Contrato'   },
      { id: 'tri-ini-2', title: 'CNPJ / Contrato social',           required: true,  blocking: true,  category: 'Checklist'  },
      { id: 'tri-ini-3', title: 'Certidão de débitos (CND/PGFN)',   required: true,  blocking: false, category: 'Checklist'  },
      { id: 'tri-ini-4', title: 'Guias de recolhimento contestadas', required: true, blocking: false, category: 'Financeiro' },
      { id: 'tri-ini-5', title: 'Balanço / DRE (último exercício)', required: false, blocking: false, category: 'Financeiro' },
      { id: 'tri-ini-6', title: 'Declarações fiscais (SPED/ECF)',   required: false, blocking: false, category: 'Financeiro' },
    ],
    Contestacao: [
      { id: 'tri-con-1', title: 'Impugnação administrativa / defesa', required: true, blocking: true, category: 'Peticao'    },
      { id: 'tri-con-2', title: 'Comprovantes de recolhimento correto', required: true, blocking: false, category: 'Financeiro' },
      { id: 'tri-con-3', title: 'Pareceres / declarações fiscais',   required: false, blocking: false, category: 'Financeiro' },
    ],
    Instrucao: [
      { id: 'tri-ins-1', title: 'SPED / ECF / escrituração fiscal',  required: true,  blocking: false, category: 'Financeiro' },
      { id: 'tri-ins-2', title: 'Laudos periciais contábeis',        required: false, blocking: false, category: 'Prova'      },
      { id: 'tri-ins-3', title: 'Memoriais / alegações de mérito',   required: true,  blocking: false, category: 'Peticao'    },
    ],
    Sentenca: [
      { id: 'tri-sen-1', title: 'Acórdão administrativo / sentença', required: true, blocking: true,  category: 'Checklist'  },
      { id: 'tri-sen-2', title: 'Cálculo do crédito/débito fiscal',  required: false, blocking: false, category: 'Financeiro' },
    ],
    Recurso: [
      { id: 'tri-rec-1', title: 'Recurso / embargos fiscais',        required: true,  blocking: true,  category: 'Peticao'    },
      { id: 'tri-rec-2', title: 'Comprovante de depósito / garantia', required: false, blocking: false, category: 'Financeiro' },
      { id: 'tri-rec-3', title: 'Decisão do tribunal fiscal',        required: false, blocking: false, category: 'Checklist'  },
    ],
  },

  // ── Empresarial ──────────────────────────────────────────────────────────────
  Empresarial: {
    Inicial: [
      { id: 'emp-ini-1', title: 'Procuração / ata de representação', required: true, blocking: true,  category: 'Contrato'   },
      { id: 'emp-ini-2', title: 'Contrato social consolidado',        required: true, blocking: true,  category: 'Contrato'   },
      { id: 'emp-ini-3', title: 'CNPJ atualizado',                   required: true, blocking: false, category: 'Checklist'  },
      { id: 'emp-ini-4', title: 'Certidão de registro na Junta',     required: true, blocking: false, category: 'Checklist'  },
      { id: 'emp-ini-5', title: 'Documento base do litígio',         required: true, blocking: false, category: 'Prova'      },
      { id: 'emp-ini-6', title: 'Atas societárias relevantes',       required: false, blocking: false, category: 'Contrato'  },
    ],
    Contestacao: [
      { id: 'emp-con-1', title: 'Contestação empresarial',           required: true, blocking: true,  category: 'Peticao'    },
      { id: 'emp-con-2', title: 'Documentos societários de defesa',  required: true, blocking: false, category: 'Contrato'   },
      { id: 'emp-con-3', title: 'Balanços / demonstrações financeiras', required: false, blocking: false, category: 'Financeiro' },
    ],
    Instrucao: [
      { id: 'emp-ins-1', title: 'Prova pericial (se requerida)',      required: false, blocking: false, category: 'Prova'    },
      { id: 'emp-ins-2', title: 'Documentos complementares',         required: true, blocking: false, category: 'Prova'      },
      { id: 'emp-ins-3', title: 'Alegações finais',                  required: true, blocking: false, category: 'Peticao'    },
    ],
    Sentenca: [
      { id: 'emp-sen-1', title: 'Sentença / acórdão',                required: true, blocking: true,  category: 'Checklist'  },
      { id: 'emp-sen-2', title: 'Cálculos de execução (se cabível)', required: false, blocking: false, category: 'Financeiro' },
    ],
    Recurso: [
      { id: 'emp-rec-1', title: 'Recurso cabível',                   required: true, blocking: true,  category: 'Peticao'    },
      { id: 'emp-rec-2', title: 'Comprovante de custas / garantia',  required: false, blocking: false, category: 'Financeiro' },
      { id: 'emp-rec-3', title: 'Decisão recursal',                  required: false, blocking: false, category: 'Checklist'  },
    ],
  },

  // ── Previdenciário ───────────────────────────────────────────────────────────
  Previdenciario: {
    Inicial: [
      { id: 'prv-ini-1', title: 'Procuração assinada',               required: true, blocking: true,  category: 'Contrato'   },
      { id: 'prv-ini-2', title: 'Documento de identidade (RG/CPF)',  required: true, blocking: true,  category: 'Checklist'  },
      { id: 'prv-ini-3', title: 'Extrato CNIS',                      required: true, blocking: true,  category: 'Prova'      },
      { id: 'prv-ini-4', title: 'Laudos médicos (se incapacidade)',   required: true, blocking: false, category: 'Prova'     },
      { id: 'prv-ini-5', title: 'Carteira de trabalho (CTPS)',        required: true, blocking: false, category: 'Prova'     },
      { id: 'prv-ini-6', title: 'Declaração de IR (últimos 2 anos)', required: false, blocking: false, category: 'Financeiro' },
      { id: 'prv-ini-7', title: 'Comprovante de residência',         required: false, blocking: false, category: 'Checklist'  },
    ],
    Contestacao: [
      { id: 'prv-con-1', title: 'Contestação ao INSS / ofício',      required: true, blocking: true,  category: 'Peticao'    },
      { id: 'prv-con-2', title: 'Laudos médicos atualizados',        required: true, blocking: false, category: 'Prova'      },
      { id: 'prv-con-3', title: 'Documentos comprobatórios',         required: true, blocking: false, category: 'Prova'      },
    ],
    Instrucao: [
      { id: 'prv-ins-1', title: 'Perícia médica (requerida ao juízo)', required: true, blocking: false, category: 'Prova'    },
      { id: 'prv-ins-2', title: 'Documentos de histórico laboral',    required: true, blocking: false, category: 'Prova'     },
      { id: 'prv-ins-3', title: 'Memoriais / alegações finais',       required: false, blocking: false, category: 'Peticao'  },
    ],
    Sentenca: [
      { id: 'prv-sen-1', title: 'Cópia da sentença',                 required: true, blocking: true,  category: 'Checklist'  },
      { id: 'prv-sen-2', title: 'Cálculo do benefício / atrasados',  required: true, blocking: false, category: 'Financeiro' },
    ],
    Recurso: [
      { id: 'prv-rec-1', title: 'Recurso ordinário / apelação',      required: true, blocking: true,  category: 'Peticao'    },
      { id: 'prv-rec-2', title: 'Documentos médicos atualizados',    required: false, blocking: false, category: 'Prova'     },
      { id: 'prv-rec-3', title: 'Acórdão / decisão do recurso',      required: false, blocking: false, category: 'Checklist'  },
    ],
  },

  // ── Default (área desconhecida) ──────────────────────────────────────────────
  _default: {
    Inicial: [
      { id: 'def-ini-1', title: 'Procuração assinada',               required: true, blocking: true,  category: 'Contrato'   },
      { id: 'def-ini-2', title: 'Documento de identidade (RG/CPF)',  required: true, blocking: true,  category: 'Checklist'  },
      { id: 'def-ini-3', title: 'Documentos da causa',               required: true, blocking: false, category: 'Prova'      },
    ],
    Contestacao: [
      { id: 'def-con-1', title: 'Defesa / contestação',              required: true, blocking: true,  category: 'Peticao'    },
      { id: 'def-con-2', title: 'Documentos probatórios',            required: true, blocking: false, category: 'Prova'      },
    ],
    Instrucao: [
      { id: 'def-ins-1', title: 'Prova documental adicional',        required: true, blocking: false, category: 'Prova'      },
      { id: 'def-ins-2', title: 'Memoriais',                         required: false, blocking: false, category: 'Peticao'   },
    ],
    Sentenca: [
      { id: 'def-sen-1', title: 'Cópia da decisão',                  required: true, blocking: true,  category: 'Checklist'  },
    ],
    Recurso: [
      { id: 'def-rec-1', title: 'Recurso cabível',                   required: true, blocking: true,  category: 'Peticao'    },
      { id: 'def-rec-2', title: 'Comprovante de preparo',            required: false, blocking: false, category: 'Financeiro' },
    ],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

export function getChecklistForPhase(area: string, phase: string): ChecklistTemplateItem[] {
  const areaTemplates = CHECKLIST_BY_AREA_PHASE[area] ?? CHECKLIST_BY_AREA_PHASE['_default'];
  const normalized = normalizePhase(phase);
  return areaTemplates[normalized] ?? areaTemplates['Inicial'];
}

export function normalizePhase(phase: string): ProcessPhase {
  // Try exact match first
  if (PHASES_ORDER.includes(phase as ProcessPhase)) return phase as ProcessPhase;
  // Try case-insensitive
  const found = PHASES_ORDER.find((p) => p.toLowerCase() === phase.toLowerCase());
  return found ?? 'Inicial';
}

export function deriveArea(processLabel: string): string {
  const prefix = processLabel.split('-')[0]?.toUpperCase() ?? '';
  const areaMap: Record<string, string> = {
    TRB: 'Trabalhista',
    CIV: 'Civel',
    TRI: 'Tributario',
    EMP: 'Empresarial',
    PRV: 'Previdenciario',
  };
  return areaMap[prefix] ?? '_default';
}
