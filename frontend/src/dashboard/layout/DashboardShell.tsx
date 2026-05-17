import type { ReactNode } from 'react';

interface DashboardShellProps {
  header?: ReactNode;
  kpi: ReactNode;
  nextAction?: ReactNode;
  operational: ReactNode;
  context: ReactNode;
  analytics: ReactNode;
  support: ReactNode;
}

export function DashboardShell({ header, kpi, nextAction, operational, context, analytics, support }: DashboardShellProps) {
  return (
    <div className="dashboard-page">
      {header}
      {kpi}
      <section className="operational-core" aria-label="Núcleo operacional">
        <div className="operational-core-main">
          {nextAction}
          {operational}
        </div>
        {context}
      </section>
      {analytics}
      {support}
    </div>
  );
}
