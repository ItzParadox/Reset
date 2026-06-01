import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import ProgressGraph from '../components/ProgressGraph.jsx';
import { currentWeight } from '../lib/storage.js';
import { bmiClassName, bmiVisualStyle, formatDoseMg, goalProjection, weeklyChange } from '../lib/calculations.js';
import { formatWeight, formatWeightDelta, weightUnit } from '../lib/units.js';

function greeting(name) {
  const hour = new Date().getHours();
  const suffix = name ? `, ${name}` : '';
  if (hour < 12) return `Morning${suffix}.`;
  if (hour < 18) return `Afternoon${suffix}.`;
  return `Evening${suffix}.`;
}

function lostCopy(lost, units) {
  if (lost <= 0) return 'Every consistent day counts.';
  const displayLost = formatWeightDelta(-lost, units).replace('-', '');
  if (lost < 2) return `${displayLost} down. You've started.`;
  if (lost < 10) return `${displayLost} down. Keep going.`;
  return `${displayLost} down. That's real.`;
}

function latestLogAgeDays(logs) {
  if (!Array.isArray(logs) || !logs.length) return null;
  const latest = [...logs].sort((a, b) => String(b.loggedAt).localeCompare(String(a.loggedAt)) || String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  const logged = new Date(`${latest.loggedAt}T00:00:00`);
  if (Number.isNaN(logged.getTime())) return null;
  return Math.floor((new Date() - logged) / 86400000);
}

function guidanceItems({ state, current, target, pct, doneCount, projection, units }) {
  const profile = state.onboardingProfile;
  const onMedication = profile.usesWeightLossMedication && profile.medicationName !== 'none';
  const remaining = Math.max(0, current - target);
  const staleDays = latestLogAgeDays(state.weightLogs);
  const injection = profile.injectionDay ? ` Your injection day is ${profile.injectionDay}.` : '';
  const medName = profile.medicationOther || profile.medicationName;
  const dose = formatDoseMg(profile.medicationDose);

  const items = [];
  if (remaining > 0 && pct >= 80) {
    items.push({
      title: 'Close range',
      body: `${formatWeight(remaining, units)} to go. Keep the plan steady and let the final stretch be boring.`,
    });
  } else if (pct < 12) {
    items.push({
      title: 'Early phase',
      body: 'The first job is reliable data: weigh in, hit the basics, and let the trend settle before judging the plan.',
    });
  } else {
    items.push({
      title: 'Current focus',
      body: projection
        ? 'Your timeline will move with your logs, your calorie target, and the plan you choose.'
        : 'Log a few more weigh-ins and Reset can turn your trend into a clearer timeline.',
    });
  }

  if (onMedication) {
    items.push({
      title: 'Medication-aware',
      body: `${medName}${dose ? ` ${dose}` : ''}: smaller protein-led meals, fluids, and symptom notes are worth tracking.${injection}`,
    });
  } else if (doneCount < 2) {
    items.push({
      title: 'Minimum viable day',
      body: 'Start with one walk, one protein anchor, and water. Then decide whether calories need tightening.',
    });
  } else {
    items.push({
      title: 'Today is moving',
      body: `${doneCount}/4 basics are done. Finish the next easiest one instead of trying to perfect the day.`,
    });
  }

  if (staleDays !== null && staleDays >= 7) {
    items.push({
      title: 'Fresh weigh-in',
      body: `Last weight log was ${staleDays} days ago. A quick update will keep your projection honest.`,
    });
  } else {
    items.push({
      title: 'Trust the average',
      body: 'One messy day does not decide the result. The weekly average is the signal.',
    });
  }

  return items.slice(0, 3);
}

function ProjectionModal({ state, current, start, target, projection, units, onClose }) {
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

  useEffect(() => {
    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previousBody = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    const previousHtmlOverflow = html.style.overflow;

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(closeTimer.current);
      body.style.overflow = previousBody.overflow;
      body.style.position = previousBody.position;
      body.style.top = previousBody.top;
      body.style.left = previousBody.left;
      body.style.right = previousBody.right;
      body.style.width = previousBody.width;
      html.style.overflow = previousHtmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closing]);

  return createPortal((
    <div className={`modalBackdrop projectionBackdrop ${closing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="projection-title" onClick={requestClose}>
      <div className={`projectionModal card ${closing ? 'closing' : ''}`} onClick={(event) => event.stopPropagation()}>

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

        {/* Single milestone row — no duplication */}
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

export default function Home({ state, todayDailyLog, onChangeTab }) {
  const [showProjection, setShowProjection] = useState(false);
  const current = currentWeight(state);
  const start = Number(state.onboardingProfile.startWeightKg || current);
  const target = Number(state.onboardingProfile.goalWeightKg || state.healthPlan.targetWeightKg || 0);
  const lost = Math.max(0, Math.round((start - current) * 10) / 10);
  const totalToLose = Math.max(1, start - target);
  const pct = Math.max(0, Math.min(100, (lost / totalToLose) * 100));
  const doneCount = ['movementDone', 'calorieTargetHit', 'proteinDone', 'hydrationDone'].filter((key) => todayDailyLog[key]).length;
  const weekly = weeklyChange(state.weightLogs);
  const projection = goalProjection(state);
  const name = state.profile.displayName || '';
  const bmiClass = bmiClassName(state.healthPlan.bmiCategory);
  const bmiStyle = bmiVisualStyle(state.healthPlan.bmi);
  const units = state.settings.preferredUnits;
  const remaining = Math.max(0, Math.round((current - target) * 10) / 10);
  const guidance = guidanceItems({ state, current, target, pct, doneCount, projection, units });
  const calorieTarget = Number(state.settings.calorieTarget || state.healthPlan.calorieTarget || 0);
  const caloriesConsumed = (Array.isArray(todayDailyLog.foodEntries) ? todayDailyLog.foodEntries : [])
    .reduce((total, entry) => total + (Number.parseInt(entry.calories, 10) || 0), 0);
  const caloriePct = calorieTarget ? Math.min(100, Math.round((caloriesConsumed / calorieTarget) * 100)) : 0;

  const todayNote = doneCount === 4 ? 'all done today' : doneCount === 0 ? 'not started yet' : 'in progress';

  return (
    <>
    <div className="staggerStack">
      <Card className="heroCard">
        <div className="heroGreeting">{greeting(name)}</div>
        <div className="big weightHeroNumber">{formatWeight(current, units, 'not set')}</div>
        <p className="note">{lostCopy(lost, units)} Goal: {formatWeight(target, units, 'not set yet')}.</p>
        <button className="progressOpen" type="button" onClick={() => setShowProjection(true)}>
          <span className="progressOpenTop">
            <span>
              <b>{formatWeight(remaining, units, 'Set a goal')} left</b>
              <small>Open projection graph</small>
            </span>
            <em>{Math.round(pct)}%</em>
          </span>
          <span className="track"><span className="fill" style={{ width: `${pct}%` }} /></span>
        </button>
      </Card>

      <div className="grid compactMetrics">
        <Card className="homeCalorieCard">
          <div className="label">Calories</div>
          <div className="homeCalorieTop">
            <div className="mid">{caloriesConsumed}</div>
            <span>{calorieTarget || 'not set'} target</span>
          </div>
          <div className="track calorieTrack" aria-hidden="true"><span className="fill" style={{ width: `${caloriePct}%` }} /></div>
          <button className="textButton" type="button" onClick={() => onChangeTab('food')}>Open Calories</button>
        </Card>
        <Card className="todayStatusCard">
          <div className="label">Today</div>
          <div className="todayStatusTop">
            <div className="mid">{doneCount}/4</div>
            <span>{todayNote}</span>
          </div>
          <div className="todayDots" aria-hidden="true">
            {['movementDone', 'calorieTargetHit', 'proteinDone', 'hydrationDone'].map((key) => (
              <i key={key} className={todayDailyLog[key] ? 'on' : ''} />
            ))}
          </div>
          <button className="textButton" type="button" onClick={() => onChangeTab('today')}>Open Today</button>
        </Card>
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
          value={weekly === null ? 'not yet' : formatWeightDelta(weekly, units)}
          note={weekly === null ? 'need 2 weeks of logs' : `7-day trend (${weightUnit(units)})`}
        />
        <MetricCard
          label="Projected arrival"
          value={projection?.label || 'keep logging'}
          note={projection?.source === 'logs' ? 'from recent weigh-ins' : projection ? 'from your active plan' : 'need a few weigh-ins'}
        />
      </div>

      <Card>
        <div className="label">Your next reset</div>
        <div className="list">
          {guidance.map((item) => (
            <div className="item" key={item.title}><b>{item.title}</b><span>{item.body}</span></div>
          ))}
        </div>
        <button className="main secondary" type="button" onClick={() => onChangeTab('today')}>Open today</button>
      </Card>
    </div>
    {showProjection ? (
      <ProjectionModal
        state={state}
        current={current}
        start={start}
        target={target}
        projection={projection}
        units={units}
        onClose={() => setShowProjection(false)}
      />
    ) : null}
    </>
  );
}
