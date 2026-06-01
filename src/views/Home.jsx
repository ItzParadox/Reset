import { currentWeight } from '../lib/storage.js';
import { bmiVisualStyle, formatDoseMg, goalProjection, weeklyChange } from '../lib/calculations.js';
import { formatWeight, formatWeightDelta } from '../lib/units.js';

function greeting(name) {
  const hour = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (hour < 12) return `Morning${suffix}.`;
  if (hour < 18) return `Afternoon${suffix}.`;
  return `Evening${suffix}.`;
}

function latestLogAgeDays(logs) {
  if (!Array.isArray(logs) || !logs.length) return null;
  const latest = [...logs].sort((a, b) =>
    String(b.loggedAt).localeCompare(String(a.loggedAt)) ||
    String(b.createdAt).localeCompare(String(a.createdAt))
  )[0];
  const logged = new Date(`${latest.loggedAt}T00:00:00`);
  if (Number.isNaN(logged.getTime())) return null;
  return Math.floor((new Date() - logged) / 86400000);
}

function smartInsight({ state, weekly, projection, units }) {
  const staleDays = latestLogAgeDays(state.weightLogs);
  const bmi = state.healthPlan.bmi;
  const bmiCat = state.healthPlan.bmiCategory;
  const profile = state.onboardingProfile;
  const onMed = profile.usesWeightLossMedication && profile.medicationName !== 'none';

  if (staleDays !== null && staleDays >= 5) {
    return { type: 'warn', stat: `${staleDays} days`, copy: 'since last weigh-in — log to keep your data honest.' };
  }
  if (weekly !== null) {
    const projStr = projection?.label ? ` — on track for ${projection.label}` : '';
    return {
      type: weekly < 0 ? 'good' : 'bad',
      stat: formatWeightDelta(weekly, units),
      copy: `per week${projStr}`,
    };
  }
  if (projection) {
    return { type: 'neutral', stat: projection.label, copy: 'projected arrival at current pace.' };
  }
  if (onMed) {
    const medName = profile.medicationOther || profile.medicationName;
    return { type: 'neutral', stat: medName, copy: 'smaller meals and fluid tracking today.' };
  }
  if (bmi) {
    return { type: 'neutral', stat: `BMI ${bmi}`, copy: bmiCat || 'your current reading.' };
  }
  return { type: 'neutral', stat: 'Keep going', copy: 'Log your weight to unlock weekly insights.' };
}

function nextReset({ state, doneCount, projection, units, weekly }) {
  const profile = state.onboardingProfile;
  const staleDays = latestLogAgeDays(state.weightLogs);
  const onMed = profile.usesWeightLossMedication && profile.medicationName !== 'none';
  const medName = profile.medicationOther || profile.medicationName;
  const dose = formatDoseMg(profile.medicationDose);
  const items = [];

  if (staleDays !== null && staleDays >= 7) {
    items.push({ title: 'Log your weight', body: `${staleDays} days since your last entry.` });
  } else if (weekly !== null && weekly > 0) {
    items.push({ title: 'Trending up', body: 'Check your calorie target and log honestly this week.' });
  } else if (projection) {
    items.push({ title: 'On track', body: `Projected arrival: ${projection.label}.` });
  } else {
    items.push({ title: 'Build the data', body: 'A few more weigh-ins and your trend becomes clear.' });
  }

  if (onMed) {
    items.push({ title: medName + (dose ? ` ${dose}` : ''), body: 'Smaller meals, fluids, and symptom notes.' });
  } else if (doneCount < 2) {
    items.push({ title: 'Start simple', body: 'One walk, one protein meal, hit your water goal.' });
  } else {
    items.push({ title: `${doneCount}/4 done`, body: 'Finish the easiest remaining one.' });
  }

  return items;
}

const BASICS = [
  { key: 'movementDone',    label: 'Move'    },
  { key: 'calorieTargetHit', label: 'Cals'  },
  { key: 'proteinDone',     label: 'Protein' },
  { key: 'hydrationDone',   label: 'Water'   },
];

export default function Home({ state, todayDailyLog, onChangeTab }) {
  const current     = currentWeight(state);
  const start       = Number(state.onboardingProfile.startWeightKg || current);
  const target      = Number(state.onboardingProfile.goalWeightKg || state.healthPlan.targetWeightKg || 0);
  const lost        = Math.max(0, Math.round((start - current) * 10) / 10);
  const totalToLose = Math.max(1, start - target);
  const pct         = Math.max(0, Math.min(100, (lost / totalToLose) * 100));
  const remaining   = Math.max(0, Math.round((current - target) * 10) / 10);
  const doneCount   = BASICS.filter(({ key }) => todayDailyLog[key]).length;
  const weekly      = weeklyChange(state.weightLogs);
  const projection  = goalProjection(state);
  const name        = state.profile.displayName || '';
  const units       = state.settings.preferredUnits;
  const bmiStyle    = bmiVisualStyle(state.healthPlan.bmi);

  const calorieTarget    = Number(state.settings.calorieTarget || state.healthPlan.calorieTarget || 0);
  const caloriesConsumed = (Array.isArray(todayDailyLog.foodEntries) ? todayDailyLog.foodEntries : [])
    .reduce((sum, e) => sum + (Number.parseInt(e.calories, 10) || 0), 0);
  const caloriePct = calorieTarget ? Math.min(100, Math.round((caloriesConsumed / calorieTarget) * 100)) : 0;
  const calorieOver = calorieTarget > 0 && caloriesConsumed > calorieTarget;

  const waterMl     = Number(todayDailyLog.waterMl || 0);
  const hydration   = Number(state.settings.hydrationTarget || 2000);
  const waterPct    = hydration ? Math.min(100, Math.round((waterMl / hydration) * 100)) : 0;
  const waterDone   = hydration > 0 && waterMl >= hydration;

  const insight = smartInsight({ state, weekly, projection, units });
  const resetItems = nextReset({ state, doneCount, projection, units, weekly });

  return (
    <div className="homeBento">

      {/* ── Hero ─────────────────────────────────────── */}
      <div className="card heroCard homeFull">
        <div className="homeGreeting">{greeting(name)}</div>
        <div className="big weightHeroNumber">{formatWeight(current, units, 'not set')}</div>

        {/* Progress bar */}
        <div className="homeProgress">
          <div className="homeProgressBar">
            <span className="track homePBarTrack">
              <span className="fill homePBarFill" style={{ width: `${pct}%` }} />
            </span>
          </div>
          <div className="homeProgressMeta">
            <span className="homeProgressLeft">
              {remaining > 0 ? `${formatWeight(remaining, units)} to go` : '🎯 Goal reached'}
            </span>
            <span className="homeProgressPct">{Math.round(pct)}%</span>
          </div>
        </div>

        {/* Daily basics pills */}
        <div className="homePills" role="group" aria-label="Today's basics">
          {BASICS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`homePill${todayDailyLog[key] ? ' on' : ''}`}
              onClick={() => onChangeTab('today')}
              aria-label={`${label}: ${todayDailyLog[key] ? 'done' : 'not done'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calories ─────────────────────────────────── */}
      <button
        type="button"
        className={`card homeCalCard${calorieOver ? ' calOver' : caloriePct >= 100 ? ' calDone' : ''}`}
        onClick={() => onChangeTab('food')}
        aria-label="Open food log"
      >
        <div className="label">Calories</div>
        <div className="homeCalRing" style={{ '--cpct': `${caloriePct}%` }}>
          <span className="homeCalNum">{caloriesConsumed}</span>
        </div>
        <p className="homeCalTarget note">{calorieTarget ? `${calorieTarget} target` : 'no target set'}</p>
      </button>

      {/* ── Water ────────────────────────────────────── */}
      <button
        type="button"
        className={`card homeWaterCard${waterDone ? ' waterDone' : ''}`}
        onClick={() => onChangeTab('water')}
        aria-label="Open water tracker"
      >
        <div className="label">Water</div>
        <div className="homeWaterNum mid">{waterMl}<span className="homeWaterUnit">ml</span></div>
        <div className="homeWaterBar">
          <div className="homeWaterBarInner" style={{ width: `${waterPct}%` }} />
        </div>
        <p className="note homeWaterTarget">{hydration ? `${hydration}ml target` : 'no target set'}</p>
      </button>

      {/* ── Smart insight ─────────────────────────────── */}
      <div
        className={`card homeInsightCard homeFull homeInsight-${insight.type}`}
        style={insight.type === 'neutral' && state.healthPlan.bmi && !weekly && !projection ? bmiStyle : undefined}
      >
        <div className="homeInsightInner">
          <span className="homeInsightStat">{insight.stat}</span>
          <span className="homeInsightCopy">{insight.copy}</span>
        </div>
      </div>

      {/* ── Your next reset ──────────────────────────────── */}
      <div className="card homeResetCard homeFull">
        <div className="homeResetHead">
          <span className="label">Your next reset</span>
          <button type="button" className="homeResetLink" onClick={() => onChangeTab('today')}>Open today →</button>
        </div>
        <div className="homeResetItems">
          {resetItems.map((item) => (
            <div key={item.title} className="homeResetItem">
              <b>{item.title}</b>
              <span>{item.body}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
