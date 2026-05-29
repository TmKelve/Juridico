import { describe, expect, it } from 'vitest';
import { canMutate } from '@/auth/user-access';
import type { CompanyContextState } from '@/session/company-context';

function buildContext(overrides: Partial<CompanyContextState> = {}): CompanyContextState {
  return {
    companyId: '1',
    companyName: 'Empresa Teste',
    status: 'active',
    userType: 'internal',
    role: 'ADMIN',
    ...overrides,
  };
}

describe('canMutate', () => {
  it('blocks mutation for read_only/suspended/cancelled statuses', () => {
    const blockedStatuses: CompanyContextState['status'][] = ['read_only', 'suspended', 'cancelled'];
    for (const status of blockedStatuses) {
      const result = canMutate(buildContext({ status }));
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('blocked_by_company_status');
    }
  });

  it('blocks mutation for external users', () => {
    const result = canMutate(buildContext({ userType: 'external' }));
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('blocked_by_user_type');
  });

  it('allows mutation for active internal admin', () => {
    const result = canMutate(buildContext());
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('ok');
  });

  it('allows mutation for past_due status', () => {
    const result = canMutate(buildContext({ status: 'past_due' }));
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('ok');
  });
});
