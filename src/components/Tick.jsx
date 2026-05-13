export default function Tick({ checked, label = 'Toggle item', onToggle }) {
  return (
    <button
      type="button"
      className={`tick ${checked ? 'on' : ''}`}
      aria-label={label}
      aria-pressed={checked}
      onClick={onToggle}
    />
  );
}
