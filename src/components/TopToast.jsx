import { useEffect, useState } from 'react';

const EXIT_MS = 240;

export default function TopToast({ message }) {
  const [shownMessage, setShownMessage] = useState(message || '');
  const [phase, setPhase] = useState(message ? 'entering' : 'hidden');

  useEffect(() => {
    let timer;

    if (message) {
      setShownMessage(message);
      setPhase('entering');
      return undefined;
    }

    if (shownMessage) {
      setPhase('exiting');
      timer = window.setTimeout(() => {
        setShownMessage('');
        setPhase('hidden');
      }, EXIT_MS);
    }

    return () => window.clearTimeout(timer);
  }, [message, shownMessage]);

  if (!shownMessage || phase === 'hidden') return null;

  return (
    <div className={`topToast ${phase}`} role="alert" aria-live="assertive">
      <strong>Check this</strong>
      <span>{shownMessage}</span>
    </div>
  );
}
