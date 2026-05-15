import type { ReactNode } from 'react';

interface DashboardShellProps {
  header?: ReactNode;
  kpi: ReactNode;
  operational: ReactNode;
  context: ReactNode;
  analytics: ReactNode;
  support: ReactNode;
}

export function DashboardShell({ header, kpi, operational, context, analytics, support }: DashboardShellProps) {
  return (
    <div className="dashboard-page">
      {header}
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
