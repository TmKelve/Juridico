import type { FinancePermission } from '../../finance/shared/types';

export const financeRolePermissions: Record<string, FinancePermission[]> = {
  ADM: [
    'finance:view',
    'finance:entry',
    'finance:billing',
    'finance:settlement',
    'finance:reconciliation',
    'finance:export',
  ],
  FIN: [
    'finance:view',
    'finance:entry',
    'finance:billing',
    'finance:settlement',
    'finance:reconciliation',
    'finance:export',
  ],
  ADV: [
    'finance:view',
  ],
  ATD: [],
};

export function listFinancePermissions(role: string) {
  return financeRolePermissions[role] ?? [];
}

export function hasFinancePermission(role: string, permission: FinancePermission) {
  return listFinancePermissions(role).includes(permission);
}
