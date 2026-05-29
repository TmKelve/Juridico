import { expect, test } from '@playwright/test'

import { normalizeCompanyFoundation } from './src/admin/company-foundation'

test('normaliza company foundation com fallback e diferencia platform/tenant', async () => {
  const normalized = normalizeCompanyFoundation({
    company: { id: 'cmp-01', name: 'Jurídico Base', status: 'active' },
    memberships: [
      { id: 1, userName: 'Ana Souza', email: 'ana@juridico.com', role: 'ADMIN', scope: 'platform' },
      { id: 2, userName: 'Carlos Lima', email: 'carlos@juridico.com', role: 'ADV', scope: 'tenant' },
    ],
  })

  expect(normalized.companyId).toBe('cmp-01')
  expect(normalized.status).toBe('active')
  expect(normalized.memberships).toHaveLength(2)
  expect(normalized.memberships[0]?.scope).toBe('platform')
  expect(normalized.memberships[1]?.scope).toBe('tenant')
})
