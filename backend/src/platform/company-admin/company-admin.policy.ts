import type { PlatformCompanyAction, PlatformCompanyRole } from '../company-management/company-management.types';

export class PlatformCompanyAccessError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

const roleSet = new Set<PlatformCompanyRole>(['platform_admin', 'platform_billing', 'platform_support']);
const readActions = new Set<PlatformCompanyAction>(['list', 'detail', 'summary']);
const billingActions = new Set<PlatformCompanyAction>(['activate', 'cancel', 'reactivate']);

export function ensurePlatformCompanyPermission(role: string, action: PlatformCompanyAction) {
  if (!roleSet.has(role as PlatformCompanyRole)) {
    throw new PlatformCompanyAccessError('PLATFORM_COMPANY_ROLE_REQUIRED', 403, 'Acesso restrito ao perfil de plataforma.');
  }

  if (role === 'platform_admin') return;
  if (role === 'platform_support') {
    if (!readActions.has(action)) {
      throw new PlatformCompanyAccessError('PLATFORM_COMPANY_SUPPORT_READ_ONLY', 403, 'Perfil support possui acesso somente leitura.');
    }
    return;
  }

  if (role === 'platform_billing') {
    if (action === 'block') {
      throw new PlatformCompanyAccessError(
        'PLATFORM_COMPANY_BILLING_ACTION_DENIED',
        403,
        'Perfil billing não pode executar bloqueio operacional.',
      );
    }
    if (!readActions.has(action) && !billingActions.has(action)) {
      throw new PlatformCompanyAccessError('PLATFORM_COMPANY_BILLING_ACTION_DENIED', 403, 'Ação não permitida para billing.');
    }
  }
}

