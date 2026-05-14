import type { ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  meta?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionCard({ title, meta, action, children, className }: SectionCardProps) {
  return (
    <div className={`section-card${className ? ` ${className}` : ''}`}>
      <div className="section-card-head">
        <div className="section-card-head-left">
          <h2 className="section-card-title">{title}</h2>
          {meta && <span className="section-card-meta">{meta}</span>}
        </div>
        {action && <div className="section-card-head-right">{action}</div>}
      </div>
      <div className="section-card-body">
        {children}
      </div>
    </div>
  );
}
