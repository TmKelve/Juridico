import type { CompanyStatus } from './company-status.types';
import type { SubscriptionStatus } from '../subscription/subscription.types';

const subscriptionToCompanyStatusMap: Record<SubscriptionStatus, CompanyStatus> = {
  draft: 'active',
  checkout_pending: 'active',
  active: 'active',
  past_due: 'grace_period',
  grace_period: 'grace_period',
  read_only: 'read_only',
  suspended: 'suspended',
  cancelled: 'cancelled',
};

/**
 * Regra soberana de sincronizacao assinatura -> status da empresa.
 * - Estados comerciais intermediarios (draft/checkout_pending) nao bloqueiam operacao da empresa.
 * - Estados de cobranca (past_due/grace_period) degradam para grace_period.
 * - Estados restritivos mapeiam 1:1.
 */
export function deriveCompanyStatusFromSubscriptionStatus(status: SubscriptionStatus): CompanyStatus {
  return subscriptionToCompanyStatusMap[status];
}
