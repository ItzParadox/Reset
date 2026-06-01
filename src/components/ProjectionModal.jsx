import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ProgressGraph from './ProgressGraph.jsx';
import { formatWeight, formatWeightDelta } from '../lib/units.js';
import useScrollLock from '../lib/useScrollLock.js';

export default function ProjectionModal({ state, current, start, target, projection, units, onClose }) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const hasProjection = !!(projection?.label);
  const weeklyCopy = Number.isFinite(Number(projection?.weeklyLossKg))
    ? formatWeightDelta(-Math.abs(Number(projection.weeklyLossKg)), units).replace('-', '')
    : null;

  function requestClose() {
    if (closing) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 240);
  }

  useScrollLock(true);

  useEffect(() => {
    return () => window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closing]);

  return createPortal((
    <div
      className={`modalBackdrop projectionBackdrop ${closing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="projection-title"
      onClick={requestClose}
    >
      <div
        className={`projectionModal card ${closing ? 'closing' : ''}`}
        onClick={(event) => event.stopPropagation()}
      >

        {/* Header row */}
        <div className="projModalHead">
          <div className="label">Weight timeline</div>
          <button className="projectionClose" type="button" onClick={requestClose} aria-label="Close projection">
            <span aria-hidden="true" />
          </button>
        </div>

        {/* Hero: projected arrival or no-data state */}
        {hasProjection ? (
          <div className="projArrival">
            <span className="projArrivalLabel">Projected arrival</span>
            <h2 id="projection-title" className="projArrivalDate">{projection.label}</h2>
            {weeklyCopy ? (
              <p className="projArrivalPace">~{weeklyCopy} / week at current pace</p>
            ) : null}
          </div>
        ) : (
          <div className="projNoData">
            <h2 id="projection-title" className="projNoDataTitle">Not enough data yet</h2>
            <p className="note">Log more weigh-ins or set a calorie plan and a projection will appear here.</p>
          </div>
        )}

        {/* Graph */}
        <ProgressGraph
          state={state}
          current={current}
          start={start}
          target={target}
          projection={projection}
          units={units}
        />

        {/* Single milestone row */}
        <div className="projMilestones">
          <div><span>Start</span><b>{formatWeight(start, units, '–')}</b></div>
          <div><span>Now</span><b>{formatWeight(current, units, '–')}</b></div>
          <div><span>Goal</span><b>{formatWeight(target, units, '–')}</b></div>
        </div>

        {/* Footer: legend + disclaimer */}
        <div className="projFooter">
          <div className="projectionLegend">
            <span><i className="actualKey" aria-hidden="true" /> Logged</span>
            {hasProjection ? <span><i className="projectedKey" aria-hidden="true" /> Estimate</span> : null}
          </div>
          <p className="note projFinePrint">
            {hasProjection ? 'Moves as your logs and plan change.' : 'Projection appears once enough data is available.'}
          </p>
        </div>

      </div>
    </div>
  ), document.body);
}
