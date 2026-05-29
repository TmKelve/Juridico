import type { PropsWithChildren } from 'react';
import { useCompanyContext } from '@/session/company-context';
import { isMutationBlockedByStatus } from '@/platform/access';
import './read-only.css';

export function ReadOnlyModeSurface({ children }: PropsWithChildren) {
  const context = useCompanyContext();
  const isReadOnly = isMutationBlockedByStatus(context.status);

  return (
    <div
      className={`read-only-surface${isReadOnly ? ' is-read-only' : ''}`}
      data-testid="read-only-surface"
      data-company-status={context.status}
    >
      {isReadOnly ? (
        <div className="read-only-surface__hint" role="status" aria-live="polite">
          Alterações podem ser recusadas pelo backend neste estado da conta.
        </div>
      ) : null}
      {children}
    </div>
  );
}
