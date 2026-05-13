import { useState } from 'react';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { currentWeight } from '../lib/storage.js';
import { estimateTargetDate, weeklyChange } from '../lib/calculations.js';
import TopToast from '../components/TopToast.jsx';
import { INPUT_LIMITS, validateWeightKg } from '../lib/validation.js';

function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function changeCopy(change) {
  if (change < -0.05) return `${change.toFixed(1)}kg lost`;
  if (change > 0.05) return `+${change.toFixed(1)}kg gained`;
  return 'Same as start';
}

export default function Weight({ state, logs, onSaveWeight }) {
  const [weight, setWeight] = useState('');
  const [error, setError] = useState('');
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
    const number = Number(weight);
    const problem = validateWeightKg(number);
    if (problem) {
      setError(problem);
      return;
    }
    onSaveWeight(number);
    setWeight('');
    setError('');
  }

  return (
    <>
      <TopToast message={error} />
      <div className="grid">
        <MetricCard className={changeClass} label="Total so far" value={changeCopy(change)} note={`started at ${start ? `${start.toFixed(1)}kg` : 'unknown'}`} />
        <MetricCard
          label="Goal"
          value={target ? `${target.toFixed(1)}kg` : 'not set'}
          note={toGoal === null ? 'set during setup' : toGoal > 0 ? `${toGoal.toFixed(1)}kg to go` : 'goal reached'}
        />
      </div>

      <div className="grid">
        <MetricCard label="Right now" value={current ? `${current.toFixed(1)}kg` : 'not logged'} note="most recent log" />
        <MetricCard
          label="This week"
          value={weekly === null ? 'not yet' : `${weekly > 0 ? '+' : ''}${weekly}kg`}
          note={weekly === null ? 'need 2 weeks of logs' : weekly < 0 ? 'heading down' : weekly > 0 ? 'heading up' : 'holding steady'}
        />
      </div>

      <Card>
        <div className="label">Log today's weight</div>
        <form onSubmit={submit}>
          <input value={weight} onChange={(e) => setWeight(e.target.value)} type="number" step="0.1" min={INPUT_LIMITS.weightKg.min} max={INPUT_LIMITS.weightKg.max} inputMode="decimal" placeholder="e.g. 138.5" />
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
        <div className="history">
          {logs.length ? logs.map((log) => (
            <div className="historyRow" key={log.id}>
              <span>{log.displayDate}{formatTime(log.createdAt) ? ` · ${formatTime(log.createdAt)}` : ''}</span>
              <span>{Number(log.weightKg).toFixed(1)}kg</span>
            </div>
          )) : <p className="note">Nothing logged yet. Your first entry will show up here.</p>}
        </div>
      </Card>
    </>
  );
}
