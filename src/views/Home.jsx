import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
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

function parseDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortDate(value) {
  const date = parseDate(value);
  if (!date) return 'Today';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function buildProjectionChart({ state, current, start, target, projection, units }) {
  const logs = Array.isArray(state.weightLogs) ? state.weightLogs : [];
  const actual = logs
    .map((log) => ({
      dateKey: log.loggedAt,
      weightKg: Number(log.weightKg ?? log.weight),
    }))
    .filter((point) => parseDate(point.dateKey) && Number.isFinite(point.weightKg) && point.weightKg > 0)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  const todayKey = localDateKey();
  if (!actual.length && Number.isFinite(start) && start > 0) {
    actual.push({ dateKey: todayKey, weightKg: start });
  }

  const latestActual = actual[actual.length - 1];
  if (Number.isFinite(current) && current > 0 && (!latestActual || Math.abs(latestActual.weightKg - current) > 0.05)) {
    actual.push({ dateKey: todayKey, weightKg: current });
  }

  const projectionDays = Number(projection?.days || 0);
  const hasProjection = projectionDays > 0 && Number.isFinite(target) && target > 0 && current > target;
  const projectionDate = hasProjection ? new Date() : null;
  if (projectionDate) projectionDate.setDate(projectionDate.getDate() + projectionDays);

  const future = hasProjection
    ? { dateKey: localDateKey(projectionDate), weightKg: target }
    : null;
  const allWeights = [...actual, ...(future ? [future] : []), { weightKg: start }, { weightKg: target }]
    .map((point) => Number(point.weightKg))
    .filter((value) => Number.isFinite(value) && value > 0);

  const weightDomain = allWeights.length ? allWeights : [0, 1];
  const minWeight = Math.min(...weightDomain);
  const maxWeight = Math.max(...weightDomain);
  const pad = Math.max(1, (maxWeight - minWeight) * 0.12);
  const yMin = minWeight - pad;
  const yMax = maxWeight + pad;
  const firstDate = actual[0]?.dateKey || todayKey;
  const lastDate = future?.dateKey || actual[actual.length - 1]?.dateKey || todayKey;
  const spanDays = Math.max(1, daysBetween(firstDate, lastDate));
  const xFor = (dateKey) => 8 + (daysBetween(firstDate, dateKey) / spanDays) * 84;
  const yFor = (weightKg) => 12 + ((yMax - weightKg) / Math.max(1, yMax - yMin)) * 76;
  const toSvgPoint = (point) => ({
    ...point,
    x: xFor(point.dateKey),
    y: yFor(point.weightKg),
  });
  const actualSvg = actual.map(toSvgPoint);
  const futureSvg = future ? toSvgPoint(future) : null;
  const actualPath = actualSvg.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const futurePath = latestActual && futureSvg
    ? `M ${xFor(latestActual.dateKey).toFixed(2)} ${yFor(latestActual.weightKg).toFixed(2)} L ${futureSvg.x.toFixed(2)} ${futureSvg.y.toFixed(2)}`
    : '';

  return {
    actual: actualSvg,
    future: futureSvg,
    actualPath,
    futurePath,
    firstDate,
    lastDate,
    maxWeight,
    minWeight,
    hasProjection,
    aboveStart: current > start,
    projectionDays,
    weeklyLossKg: projection?.weeklyLossKg,
    units,
  };
}

function ProjectionModal({ state, current, start, target, projection, units, onClose }) {
  const chart = buildProjectionChart({ state, current, start, target, projection, units });
  const latest = chart.actual[chart.actual.length - 1];

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modalBackdrop projectionBackdrop" role="dialog" aria-modal="true" aria-labelledby="projection-title" onClick={onClose}>
      <div className="projectionModal card" onClick={(event) => event.stopPropagation()}>
        <button className="projectionClose" type="button" onClick={onClose} aria-label="Close projection">X</button>
        <div className="label">Projection</div>
        <h2 id="projection-title">Weight timeline</h2>
        <p className="note">
          {projection
            ? `Based on your current weight, goal, and active calorie plan, Reset projects ${projection.label}.`
            : 'Log more weight data or set a calorie plan to calculate a projected arrival.'}
        </p>

        <div className="projectionChart">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1="8" y1="12" x2="92" y2="12" />
            <line x1="8" y1="50" x2="92" y2="50" />
            <line x1="8" y1="88" x2="92" y2="88" />
            {chart.actualPath ? <path className="actualLine" d={chart.actualPath} /> : null}
            {chart.futurePath ? <path className="projectedLine" d={chart.futurePath} /> : null}
            {chart.actual.map((point, index) => (
              <circle key={`${point.dateKey}-${index}`} className={index === chart.actual.length - 1 ? 'currentDot' : 'actualDot'} cx={point.x} cy={point.y} r="1.8" />
            ))}
            {chart.future ? <circle className="goalDot" cx={chart.future.x} cy={chart.future.y} r="2.1" /> : null}
          </svg>
          <span className="chartWeight high">{formatWeight(chart.maxWeight, units, '')}</span>
          <span className="chartWeight low">{formatWeight(chart.minWeight, units, '')}</span>
          <span className="chartDate start">{shortDate(chart.firstDate)}</span>
          <span className="chartDate end">{shortDate(chart.lastDate)}</span>
        </div>

        <div className="projectionStats">
          <div><span>Current</span><b>{formatWeight(current, units, 'not set')}</b></div>
          <div><span>Goal</span><b>{formatWeight(target, units, 'not set')}</b></div>
          <div><span>Projected</span><b>{projection?.label || 'Need data'}</b></div>
        </div>

        <div className="projectionLegend">
          <span><i className="actualKey" /> Logged weight</span>
          <span><i className="projectedKey" /> Projection</span>
        </div>
        <p className="note">
          {chart.aboveStart
            ? 'Your current weight is above your starting weight, so the chart shows that rise before projecting down toward the goal.'
            : chart.hasProjection
              ? `Projected pace is roughly ${chart.weeklyLossKg || 'calculating'}kg per week from the active plan.`
              : 'The graph will add a projected segment once there is enough plan data.'}
        </p>
        {latest ? <p className="note projectionFinePrint">Latest logged point: {formatWeight(latest.weightKg, units, '')} on {shortDate(latest.dateKey)}.</p> : null}
      </div>
    </div>
  );
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
              <small>Open accurate projection graph</small>
            </span>
            <em>{Math.round(pct)}%</em>
          </span>
          <span className="track"><span className="fill" style={{ width: `${pct}%` }} /></span>
        </button>
      </Card>

      <div className="grid compactMetrics">
        <MetricCard label="Calories" value={state.settings.calorieTarget || 'not set'} note="your daily target" />
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
