interface AgendaTimelineItemProps {
  time: string;
  title: string;
  context: string;
  eventType?: string;
}

export function AgendaTimelineItem({ time, title, context, eventType }: AgendaTimelineItemProps) {
  return (
    <li className="agenda-timeline-item">
      <span className="agenda-timeline-time">{time}</span>
      <div className="agenda-timeline-node" data-event-type={eventType || 'default'} aria-hidden="true" />
      <div className="agenda-timeline-content">
        <p className="agenda-timeline-title">{title}</p>
        <small className="agenda-timeline-meta">{context}</small>
      </div>
    </li>
  );
}
