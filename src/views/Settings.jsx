import { useState } from 'react';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { MEDICATION_OPTIONS, bmiClassName, bmiVisualStyle } from '../lib/calculations.js';
import { currentWeight } from '../lib/storage.js';

export default function Settings({ state, onSaveSettings, onExportData, onCopyExport, onResetLocalData }) {
  const [walkMinutes, setWalkMinutes] = useState(state.settings.walkMinutes ?? '');
  const [hydrationTarget, setHydrationTarget] = useState(state.settings.hydrationTarget ?? '');
  const [exportText, setExportText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  function save(event) {
    event.preventDefault();
    onSaveSettings({
      walkMinutes: walkMinutes === '' ? null : Number(walkMinutes),
      hydrationTarget: hydrationTarget === '' ? null : Number(hydrationTarget),
    });
  }

  async function copy() {
    if (!exportText) return;
    const result = await onCopyExport(exportText);
    setCopyStatus(result);
  }

  const med = state.onboardingProfile.medicationName === 'other'
    ? state.onboardingProfile.medicationOther
    : MEDICATION_OPTIONS.find((item) => item.value === state.onboardingProfile.medicationName)?.label;
  const name = state.profile.displayName || 'You';
  const bmiClass = bmiClassName(state.healthPlan.bmiCategory);
  const bmiStyle = bmiVisualStyle(state.healthPlan.bmi);
  const current = currentWeight(state);
  const start = Number(state.onboardingProfile.startWeightKg || current || 0);

  return (
    <div className="staggerStack">
      <Card className={`profileCard profileSummary ${bmiClass}`} style={bmiStyle}>
        <div className="profileTop">
          <div>
            <div className="label">Your profile</div>
            <strong>{name}</strong>
            <p className="profileSubline">Here's where you stand right now</p>
          </div>
        </div>
        <div className="currentWeightBlock">
          <div className="label">Current weight</div>
          <strong className="profileWeightNumber">{current ? `${current.toFixed(1)}kg` : 'not logged'}</strong>
          <p>Started at {start ? `${start.toFixed(1)}kg` : '-'}</p>
        </div>
        <div className="profileMetrics">
          <MetricCard label="Goal" value={state.onboardingProfile.goalWeightKg ? `${state.onboardingProfile.goalWeightKg}kg` : 'not set'} note="target weight" />
          <MetricCard className="bmiMetricCard" label="BMI" value={state.healthPlan.bmi || 'pending'} note="current estimate" />
          <MetricCard label="Calories" value={state.settings.calorieTarget || 'not set'} note="daily target" />
          <MetricCard label="Maintenance" value={state.healthPlan.maintenanceCalories || 'calculating'} note="estimated kcal/day" />
        </div>
        <p className="note">{state.onboardingProfile.heightCm}cm {' | '} {state.onboardingProfile.activityLevel} activity {' | '} {med || 'no medication'}</p>
      </Card>

      <Card>
        <div className="label">Daily targets</div>
        <form onSubmit={save} className="formGrid">
          <label>
            Movement target <span className="unitSuffix">min/day</span>
            <input type="number" inputMode="numeric" value={walkMinutes} onChange={(e) => setWalkMinutes(e.target.value)} placeholder="optional" />
          </label>
          <label>
            Hydration target <span className="unitSuffix">ml/day</span>
            <input type="number" inputMode="numeric" value={hydrationTarget} onChange={(e) => setHydrationTarget(e.target.value)} placeholder="e.g. 2000" />
          </label>
          <button className="main" type="submit">Save targets</button>
        </form>
        <p className="note">Calories come from your plan. Hydration is in ml, so 2000 ml is 2L.</p>
      </Card>

      <Card>
        <div className="label">Back up your data</div>
        <button className="main" type="button" onClick={() => { setExportText(onExportData()); setCopyStatus(''); }}>Export data</button>
        <button className="main secondary" type="button" onClick={copy}>Copy to clipboard</button>
        {copyStatus ? <p className="note">{copyStatus}</p> : null}
        {exportText ? <pre className="note exportBox">{exportText}</pre> : null}
        <p className="note">Safari can clear storage when your device is low on space. Export occasionally to be safe.</p>
      </Card>

      <Card>
        <div className="label">Reset</div>
        <button className="main danger" type="button" onClick={onResetLocalData}>Clear local data</button>
        <p className="note">Wipes onboarding and tracking data from this browser only. Can't be undone.</p>
      </Card>
    </div>
  );
}
