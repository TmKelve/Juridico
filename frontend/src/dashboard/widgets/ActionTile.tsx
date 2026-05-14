import type { LucideIcon } from 'lucide-react';

interface ActionTileProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}

export function ActionTile({ icon: Icon, label, onClick }: ActionTileProps) {
  return (
    <button type="button" className="action-tile" onClick={onClick}>
      <Icon size={18} className="action-tile-icon" aria-hidden="true" />
      <span className="action-tile-label">{label}</span>
    </button>
  );
}
