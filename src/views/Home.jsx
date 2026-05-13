import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { currentWeight } from '../lib/storage.js';
import { bmiClassName, bmiVisualStyle, estimatePlanGoalDate, estimateTargetDate, weeklyChange } from '../lib/calculations.js';

function greeting(name) {
  const hour = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (hour < 12) return `Morning${suffix}.`;
  if (hour < 18) return `Afternoon${suffix}.`;
  return `Evening${suffix}.`;
}

function lostCopy(lost) {
  if (lost <= 0) return 'Every consistent day counts.';
  if (lost < 2) return `${lost.toFixed(1)}kg down. You've started.`;
  if (lost < 10) return `${lost.toFixed(1)}kg down. Keep going.`;
  return `${lost.toFixed(1)}kg down. That's real.`;
}

export default function Home({ state, todayDailyLog, onChangeTab }) {
  const current = currentWeight(state);
  const start = Number(state.onboardingProfile.startWeightKg || current);
  const target = Number(state.onboardingProfile.goalWeightKg || state.healthPlan.targetWeightKg || 0);
  const lost = Math.max(0, Math.round((start - current) * 10) / 10);
  const totalToLose = Math.max(1, start - target);
  const pct = Math.max(0, Math.min(100, (lost / totalToLose) * 100));
  const doneCount = ['movementDone', 'calorieTargetHit', 'proteinDone', 'hydrationDone'].filter((key) => todayDailyLog[key]).length;
  const weekly = weeklyChange(state.weightLogs);
  const projected = estimateTargetDate(state.weightLogs, target);
  const planProjected = estimatePlanGoalDate(state);
  const name = state.profile.displayName || '';
  const bmiClass = bmiClassName(state.healthPlan.bmiCategory);
  const bmiStyle = bmiVisualStyle(state.healthPlan.bmi);

  const todayNote = doneCount === 4 ? 'all done today' : doneCount === 0 ? 'not started yet' : 'in progress';

  return (
    <div className="staggerStack">
      <Card className="heroCard">
        <div className="heroGreeting">{greeting(name)}</div>
        <div className="big weightHeroNumber">{current ? `${current.toFixed(1)}kg` : 'not set'}</div>
        <p className="note">{lostCopy(lost)} Goal: {target ? `${target}kg` : 'not set yet'}.</p>
        <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
      </Card>

      <div className="grid">
        <MetricCard label="Calories" value={state.settings.calorieTarget || 'not set'} note="your daily target" />
        <MetricCard label="Today" value={`${doneCount}/4`} note={todayNote} />
      </div>

      <Card className={`profileCard bmiFeature ${bmiClass}`} style={bmiStyle}>
        <div className="bmiFeatureGrid">
          <span className="bmiFeatureLabel">BMI</span>
          <b className="bmiFeatureNumber">{state.healthPlan.bmi || 'pending'}</b>
          <span className="bmiFeatureResult">{state.healthPlan.bmiCategory}</span>
        </div>
        <p className="note">A rough signal, not a verdict. The weight trend and how you actually feel matter more.</p>
      </Card>

      <div className="grid">
        <MetricCard
          label="This week"
          value={weekly === null ? 'not yet' : `${weekly > 0 ? '+' : ''}${weekly}kg`}
          note={weekly === null ? 'need 2 weeks of logs' : '7-day trend'}
        />
        <MetricCard
          label="Goal date"
          value={projected || planProjected?.label || 'keep logging'}
          note={projected ? 'at your current rate' : planProjected ? 'based on your plan' : 'need a few weigh-ins'}
        />
      </div>

      {planProjected ? (
        <Card>
          <div className="label">Projected goal date</div>
          <div className="mid">{planProjected.label}</div>
          <p className="note">
            Based on your current calorie target. Keep showing up and this date gets more accurate as your logs build.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="label">Keep it simple</div>
        <div className="list">
          <div className="item"><b>Your minimum today</b><span>Move a little, stay inside calories, get some protein in, drink enough water. That's the whole job.</span></div>
          <div className="item"><b>Trust the average</b><span>One messy day won't undo progress. What you do most of the time is what actually moves the needle.</span></div>
        </div>
        <button className="main secondary" type="button" onClick={() => onChangeTab('today')}>Open today</button>
      </Card>
    </div>
  );
}
