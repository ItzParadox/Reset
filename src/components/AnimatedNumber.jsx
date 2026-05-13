import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({ value, decimals = 1, suffix = '', className = '', animateOnMount = false }) {
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;
  const initialValue = animateOnMount ? 0 : safeValue;
  const [display, setDisplay] = useState(initialValue);
  const [rolling, setRolling] = useState(false);
  const [rollKey, setRollKey] = useState(0);
  const previousRef = useRef(initialValue);

  useEffect(() => {
    const start = previousRef.current;
    const end = safeValue;
    previousRef.current = end;

    if (!Number.isFinite(end)) return undefined;
    if (Math.abs(start - end) < 0.001) {
      setDisplay(end);
      return undefined;
    }

    let frame = 0;
    const duration = 520;
    const startedAt = performance.now();
    setRolling(true);
    setRollKey((key) => key + 1);

    function animate(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        setDisplay(end);
        window.setTimeout(() => setRolling(false), 80);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [safeValue]);

  if (!Number.isFinite(numeric)) return <span className={className}>—</span>;

  return (
    <span className={`rollingNumber ${rolling ? 'isRolling' : ''} ${className}`.trim()} aria-label={`${safeValue.toFixed(decimals)}${suffix}`}>
      <span key={rollKey}>{display.toFixed(decimals)}{suffix}</span>
    </span>
  );
}
