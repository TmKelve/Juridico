import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <header className="page-header-shell">
      <div>
        {badge ? <div className="page-header-badge">{badge}</div> : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
