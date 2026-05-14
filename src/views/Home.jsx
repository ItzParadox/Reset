import { useEffect, useRef, useState } from 'react';
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

export default function Home({ state, todayDailyLog, onChangeTab }) {
  const [showTrend, setShowTrend] = useState(false);
  const [trendClosing, setTrendClosing] = useState(false);
  const closeTrendTimer = useRef(null);
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
  const timelineCopy = projection?.note || 'Keep logging and your projected timeline will appear here.';

  const todayNote = doneCount === 4 ? 'all done today' : doneCount === 0 ? 'not started yet' : 'in progress';
  const currentMarkerBottom = Math.max(19, 72 - pct * 0.53);

  useEffect(() => () => window.clearTimeout(closeTrendTimer.current), []);

  function toggleTrend() {
    window.clearTimeout(closeTrendTimer.current);
    if (!showTrend || trendClosing) {
      setShowTrend(true);
      setTrendClosing(false);
      return;
    }

    setTrendClosing(true);
    closeTrendTimer.current = window.setTimeout(() => {
      setShowTrend(false);
      setTrendClosing(false);
    }, 280);
  }

  return (
    <div className="staggerStack">
      <Card className="heroCard">
        <div className="heroGreeting">{greeting(name)}</div>
        <div className="big weightHeroNumber">{formatWeight(current, units, 'not set')}</div>
        <p className="note">{lostCopy(lost, units)} Goal: {formatWeight(target, units, 'not set yet')}.</p>
        <button className="progressOpen" type="button" onClick={toggleTrend} aria-expanded={showTrend && !trendClosing}>
          <span className="progressOpenTop">
            <span>
              <b>{formatWeight(remaining, units, 'Set a goal')} left</b>
              <small>{showTrend && !trendClosing ? 'Hide projected timeline' : 'View projected timeline'}</small>
            </span>
            <em>{Math.round(pct)}%</em>
          </span>
          <span className="track"><span className="fill" style={{ width: `${pct}%` }} /></span>
        </button>
        {showTrend ? (
          <div className={`trendPanel ${trendClosing ? 'closing' : 'open'}`}>
            <div className="trendPanelInner">
              <div className="trendChart" aria-hidden="true">
                <svg className="trendLine" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                  <path d="M 8 22 C 29 24, 35 40, 48 48 S 74 72, 92 78" />
                </svg>
                <i style={{ left: '5%', bottom: '72%' }}>{formatWeight(start, units, '')}</i>
                <i style={{ left: '47%', bottom: `${currentMarkerBottom}%` }}>{formatWeight(current, units, '')}</i>
                <i style={{ right: '0', bottom: '19%' }}>{formatWeight(target, units, '')}</i>
              </div>
              <p className="note">{timelineCopy}</p>
            </div>
          </div>
        ) : null}
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
  );
}
