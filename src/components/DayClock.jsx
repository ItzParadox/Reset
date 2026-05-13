function formatTime(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date).toLowerCase();
}

function timeLeftToday(date) {
  const midnight = new Date(date);
  midnight.setHours(24, 0, 0, 0);
  const diff = Math.max(0, midnight.getTime() - date.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours <= 0) return `${minutes}m left`;
  return `${hours}h ${minutes.toString().padStart(2, '0')}m left`;
}

function dayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function DayClock({ now }) {
  return (
    <div className="dayClock" aria-label="Local time and time remaining today">
      <time>{formatTime(now)}</time>
      <span>{dayLabel(now)} · {timeLeftToday(now)}</span>
    </div>
  );
}
