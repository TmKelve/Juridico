import type { ReactNode } from 'react';

interface DashboardShellProps {
  header?: ReactNode;
  responsibility?: ReactNode;
  kpi: ReactNode;
  nextAction?: ReactNode;
  operational: ReactNode;
  context: ReactNode;
}

export function DashboardShell({ header, responsibility, kpi, nextAction, operational, context }: DashboardShellProps) {
  return (
    <div className="dashboard-page">
      {header}
      {responsibility}
      {kpi}
      <section className="operational-core" aria-label="Núcleo operacional">
        <div className="operational-core-main">
          {nextAction}
          {operational}
        </div>
        {context}
      </section>
    </div>
  );
}
