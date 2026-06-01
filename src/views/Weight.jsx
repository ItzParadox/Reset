import { useState } from 'react';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { currentWeight } from '../lib/storage.js';
import { estimateTargetDate, weeklyChange } from '../lib/calculations.js';
import TopToast from '../components/TopToast.jsx';
import {
  formatWeight,
  formatWeightDelta,
  validateWeightInput,
  weightInputLimits,
  weightInputPlaceholder,
  weightInputToKg,
  weightUnit,
} from '../lib/units.js';

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function changeCopy(change, units) {
  if (change < -0.05) return `${formatWeightDelta(change, units).replace('-', '')} lost`;
  if (change > 0.05) return `${formatWeightDelta(change, units)} gained`;
  return 'Same as start';
}

// Returns the signed delta and a direction class for a log entry vs the one before it.
function entryDelta(logs, index) {
  const next = logs[index + 1]; // chronologically older
  if (!next) return null;
  const delta = Number(logs[index].weightKg) - Number(next.weightKg);
  if (Math.abs(delta) < 0.05) return { delta: 0, cls: 'deltaNeutral', arrow: '→' };
  return delta < 0
    ? { delta, cls: 'deltaDown', arrow: '↓' }
    : { delta, cls: 'deltaUp', arrow: '↑' };
}

export default function Weight({ state, logs, onSaveWeight, onDeleteWeight }) {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
  const units = state.settings.preferredUnits;
  const limits = weightInputLimits(units);
  const current = currentWeight(state);
  const start = Number(state.onboardingProfile.startWeightKg || current);
  const target = Number(state.onboardingProfile.goalWeightKg || 0);
  const change = Math.round((current - start) * 10) / 10;
  const changeClass = change < 0 ? 'progressGood' : change > 0 ? 'progressBad' : 'progressNeutral';
  const weekly = weeklyChange(logs);
  const projected = estimateTargetDate(logs, target);
  const toGoal = target ? Math.round((current - target) * 10) / 10 : null;

  function submit(event) {
    event.preventDefault();
    const problem = validateWeightInput(weight, units);
    if (problem) {
      setError(problem);
      return;
    }
    onSaveWeight(weightInputToKg(weight, units));
    setWeight('');
    setError('');
  }

  return (
    <>
      <TopToast message={error} />
      <div className="grid">
        <MetricCard className={changeClass} label="Total so far" value={changeCopy(change, units)} note={`started at ${formatWeight(start, units, 'unknown')}`} />
        <MetricCard
          label="Goal"
          value={formatWeight(target, units, 'not set')}
          note={toGoal === null ? 'set during setup' : toGoal > 0 ? `${formatWeightDelta(toGoal, units).replace('+', '')} to go` : 'goal reached'}
        />
      </div>

      <div className="grid">
        <MetricCard label="Right now" value={formatWeight(current, units, 'not logged')} note="most recent log" />
        <MetricCard
          label="This week"
          value={weekly === null ? 'not yet' : formatWeightDelta(weekly, units)}
          note={weekly === null ? 'need 2 weeks of logs' : weekly < 0 ? `heading down (${weightUnit(units)})` : weekly > 0 ? `heading up (${weightUnit(units)})` : 'holding steady'}
        />
      </div>

      <Card>
        <div className="label">Log today's weight</div>
        <form onSubmit={submit}>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" min={limits.min} max={limits.max} inputMode="decimal" placeholder={weightInputPlaceholder(units)} aria-label={`Weight in ${limits.unit}`} />
          <button className="main" type="submit">Save</button>
        </form>
        <p className="note">
          {projected
            ? `At your current rate: ${projected}.`
            : logs.length < 2
            ? 'Log your weight a couple of times and a projection will appear.'
            : 'Keep logging weekly and your goal date will show up here.'}
        </p>
      </Card>

      <Card>
        <div className="label">History</div>
        <div className="history weightHistory">
          {logs.length ? logs.map((log, index) => {
            const d = entryDelta(logs, index);
            const timeStr = formatTime(log.createdAt);
            return (
              <div className="weightHistoryRow" key={log.id}>
                <span className="weightHistoryDate">
                  {log.displayDate}
                  {timeStr ? <em>{timeStr}</em> : null}
                </span>
                <span className="weightHistoryVal">{formatWeight(log.weightKg, units)}</span>
                <span className={`weightHistoryDelta ${d ? d.cls : 'deltaNeutral'}`}>
                  {d ? `${d.arrow} ${d.delta === 0 ? '–' : formatWeightDelta(d.delta, units).replace('+', '')}` : '–'}
                </span>
                {onDeleteWeight ? (
                  <button
                    className="weightHistoryDelete"
                    type="button"
                    aria-label={`Remove log from ${log.displayDate}`}
                    onClick={() => onDeleteWeight(log.id)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            );
          }) : <p className="note">Nothing logged yet. Your first entry will show up here.</p>}
        </div>
      </Card>
    </>
  );
}
