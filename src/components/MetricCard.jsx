import Card from './Card.jsx';

export default function MetricCard({ label, value, note, className = '' }) {
  return (
    <Card className={className}>
      <div className="label">{label}</div>
      <div className="mid">{value}</div>
      {note ? <p className="note">{note}</p> : null}
    </Card>
  );
}
