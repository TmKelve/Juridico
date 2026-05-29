import { assertCompanyScopeAllowed } from './cross-tenant.guard';
import { withCompanyScope } from './query-scope';

type AnyRecord = Record<string, unknown>;

export type CompanyScopedRecord = {
  companyId: string | number;
};

export function createCompanyScopePrismaAdapter(authenticatedCompanyId: string | number) {
  return {
    scopeWhere<TWhere extends AnyRecord>(where?: TWhere | null) {
      return withCompanyScope(where, authenticatedCompanyId);
    },
    assertRecordScope(record: CompanyScopedRecord, message?: string) {
      assertCompanyScopeAllowed({
        authenticatedCompanyId,
        targetCompanyId: record.companyId,
        message,
      });
    },
  };
}

