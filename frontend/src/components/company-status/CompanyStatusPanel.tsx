import type { CompanyStatus } from '../../platform/access';

export function CompanyStatusPanel({ status }: { status: CompanyStatus }) {
  return (
    <section>
      <h3>Status da empresa</h3>
      <p>{status}</p>
    </section>
  );
}
