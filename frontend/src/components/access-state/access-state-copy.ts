import type { CompanyStatus } from '@/platform/access';

export type AccessStateMessage = {
  title: string;
  body: string;
  tone: 'warning' | 'critical';
};

export const ACCESS_STATE_MESSAGES: Partial<Record<CompanyStatus, AccessStateMessage>> = {
  past_due: {
    title: 'Assinatura com pagamento pendente',
    body: 'Regularize o financeiro para evitar bloqueio de edição. O acesso de consulta permanece disponível.',
    tone: 'warning',
  },
  read_only: {
    title: 'Conta em modo somente leitura',
    body: 'Criações e alterações podem ser recusadas pelo backend até a regularização da assinatura.',
    tone: 'warning',
  },
  suspended: {
    title: 'Conta suspensa',
    body: 'A operação está restrita. Consulte o responsável da conta para normalizar o acesso.',
    tone: 'critical',
  },
  cancelled: {
    title: 'Conta cancelada',
    body: 'A conta está encerrada para alterações. Reative a assinatura para voltar a operar.',
    tone: 'critical',
  },
};
