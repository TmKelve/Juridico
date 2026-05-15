import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
}

export function ActionCard({ icon: Icon, title, description, onClick }: ActionCardProps) {
  return (
    <button type="button" className="action-card" onClick={onClick}>
      <span className="action-card-icon" aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="action-card-copy">
        <span className="action-card-title">{title}</span>
        <span className="action-card-description">{description}</span>
      </span>
    </button>
  );
}
