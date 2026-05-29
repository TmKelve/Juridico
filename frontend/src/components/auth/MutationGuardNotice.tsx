import { useCompanyContext } from '@/session/company-context';
import { canMutate } from '@/auth/user-access';

export function MutationGuardNotice() {
  const context = useCompanyContext();
  const access = canMutate(context);

  if (access.allowed) return null;

  return (
    <div role="alert" data-testid="mutation-guard-notice">
      Mutações desativadas para este contexto ({access.reason}).
    </div>
  );
}
