import { useCompanyContext } from '@/session/company-context';
import { ACCESS_STATE_MESSAGES } from './access-state-copy';
import './access-state.css';

export function AccessStateBanner() {
  const context = useCompanyContext();
  const message = ACCESS_STATE_MESSAGES[context.status];

  if (!message) return null;

  return (
    <div
      className={`access-state-banner access-state-banner--${message.tone}`}
      role="alert"
      data-testid="access-state-banner"
      data-company-status={context.status}
    >
      <strong>{message.title}</strong>
      <p>{message.body}</p>
    </div>
  );
}
