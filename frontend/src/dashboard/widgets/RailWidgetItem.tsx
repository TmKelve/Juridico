interface RailWidgetItemProps {
  time?: string;
  title: string;
  meta?: string;
  accent?: 'error' | 'warning' | 'default';
}

export function RailWidgetItem({ time, title, meta, accent = 'default' }: RailWidgetItemProps) {
  return (
    <li className="rail-widget-item" data-accent={accent}>
      {time && <span className="rail-widget-time">{time}</span>}
      <div className="rail-widget-content">
        <p className="rail-widget-title">{title}</p>
        {meta && <small className="rail-widget-meta">{meta}</small>}
      </div>
    </li>
  );
}
