import type { SubscriptionSummary } from '../../company-status/model';

export function PlatformBillingPanel({ subscription }: { subscription: SubscriptionSummary | null }) {
  if (!subscription) return <section><h3>Billing SaaS</h3><p>Sem assinatura ativa.</p></section>;
  return (
    <section>
      <h3>Billing SaaS</h3>
      <p>Plano: {subscription.planName}</p>
      <p>Status: {subscription.status}</p>
      <p>Fim do ciclo: {subscription.periodEnd ?? '-'}</p>
    </section>
  );
}
