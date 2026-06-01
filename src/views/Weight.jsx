import { useState } from 'react';
import Card from '../components/Card.jsx';
import WeightChart from '../components/WeightChart.jsx';
import { currentWeight, localDateKey } from '../lib/storage.js';
import { estimateTargetDate, weeklyChange } from '../lib/calculations.js';
import TopToast from '../components/TopToast.jsx';
import {
  formatWeight,
  formatWeightDelta,
  validateWeightInput,
  weightInputLimits,
  weightInputPlaceholder,
  weightInputToKg,
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

function entryDelta(logs, index) {
  const next = logs[index + 1];
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
  // Duplicate day prompt state
  const [pendingKg, setPendingKg] = useState(null);
  const [wrongDayDate, setWrongDayDate] = useState('');
  const [showWrongDay, setShowWrongDay] = useState(false);

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
  const todayKey = localDateKey();

  function submit(event) {
    event.preventDefault();
    const problem = validateWeightInput(weight, units);
    if (problem) { setError(problem); return; }

    const kg = weightInputToKg(weight, units);
    const alreadyToday = logs.some((l) => l.loggedAt === todayKey);

    if (alreadyToday) {
      // Ask if this was for a different day
      setPendingKg(kg);
      setWrongDayDate('');
      setShowWrongDay(true);
      setWeight('');
      setError('');
    } else {
      onSaveWeight(kg);
      setWeight('');
      setError('');
    }
  }

  function confirmToday() {
    onSaveWeight(pendingKg);
    setPendingKg(null);
    setShowWrongDay(false);
  }

  function confirmWrongDay() {
    if (!wrongDayDate) return;
    onSaveWeight(pendingKg, wrongDayDate);
    setPendingKg(null);
    setWrongDayDate('');
    setShowWrongDay(false);
  }

  function dismissWrongDay() {
    setPendingKg(null);
    setWrongDayDate('');
    setShowWrongDay(false);
  }

  return (
    <>
      <TopToast message={error} />
      <WeightChart state={state} units={units} />

      <Card>
        <div className="label">Log today's weight</div>
        <form onSubmit={submit}>
          <input
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            type="number"
            step="0.1"
            min={limits.min}
            max={limits.max}
            inputMode="decimal"
            placeholder={weightInputPlaceholder(units)}
            aria-label={`Weight in ${limits.unit}`}
          />
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

      {/* Duplicate day prompt */}
      {showWrongDay && (
        <Card className="wrongDayCard">
          <div className="label">Already logged today</div>
          <p className="note" style={{ marginTop: 0 }}>
            You already have a reading for today. Was this entry for a different day?
          </p>
          <div className="wrongDayOptions">
            <button className="main secondary" type="button" onClick={confirmToday}>
              No, it&apos;s for today
            </button>
            <div className="wrongDayPicker">
              <label>
                Yes — set the date
                <input
                  type="date"
                  value={wrongDayDate}
                  max={todayKey}
                  onChange={(e) => setWrongDayDate(e.target.value)}
                />
              </label>
              <button
                className="main"
                type="button"
                onClick={confirmWrongDay}
                disabled={!wrongDayDate}
              >
                Save with this date
              </button>
            </div>
          </div>
          <button className="weightHistoryDelete wrongDayDismiss" type="button" onClick={dismissWrongDay} aria-label="Dismiss">×</button>
        </Card>
      )}

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
