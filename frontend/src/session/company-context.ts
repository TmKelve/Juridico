import { createContext, useContext } from 'react';
import type { CompanyStatus } from '@/platform/access';

export type UserType = 'internal' | 'external';
export type UserRole = 'OWNER' | 'ADMIN' | 'LAWYER' | 'ASSISTANT' | 'VIEWER';

export type CompanyContextState = {
  companyId: string;
  companyName: string;
  status: CompanyStatus;
  userType: UserType;
  role: UserRole;
};

const DEFAULT_COMPANY_CONTEXT: CompanyContextState = {
  companyId: 'unknown',
  companyName: 'Unknown Company',
  status: 'active',
  userType: 'internal',
  role: 'VIEWER',
};

export const CompanyContext = createContext<CompanyContextState>(DEFAULT_COMPANY_CONTEXT);

export function useCompanyContext(): CompanyContextState {
  return useContext(CompanyContext);
}
