import type { ReactNode } from 'react';

interface DashboardShellProps {
  kpi: ReactNode;
  operational: ReactNode;
  context: ReactNode;
  analytics: ReactNode;
  support: ReactNode;
}

export function DashboardShell({ kpi, operational, context, analytics, support }: DashboardShellProps) {
  return (
    <div className="dashboard-page">
      {kpi}
      <section className="operational-core" aria-label="Núcleo operacional">
        {operational}
        {context}
      </section>
      {analytics}
      {support}
    </div>
  );
}
