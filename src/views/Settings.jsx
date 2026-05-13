import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import { MEDICATION_OPTIONS, bmiClassName, bmiVisualStyle } from '../lib/calculations.js';
import { currentWeight } from '../lib/storage.js';
import { formatHeight, formatWeight } from '../lib/units.js';
import { useEffect, useRef, useState } from 'react';

export default function Settings({ state, onSaveSettings, onExportData, onCopyExport, onResetLocalData }) {
  const [exportText, setExportText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [editingUnits, setEditingUnits] = useState(false);
  const [draftUnits, setDraftUnits] = useState(state.settings.preferredUnits);
  const [exitingUnits, setExitingUnits] = useState('');
  const previousUnitsRef = useRef(state.settings.preferredUnits);

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
  const units = state.settings.preferredUnits;

  useEffect(() => {
    if (previousUnitsRef.current === units) return undefined;
    setExitingUnits(previousUnitsRef.current);
    previousUnitsRef.current = units;
    const timer = window.setTimeout(() => setExitingUnits(''), 460);
    return () => window.clearTimeout(timer);
  }, [units]);

  useEffect(() => {
    if (!editingUnits) setDraftUnits(units);
  }, [editingUnits, units]);

  function toggleUnitEditor() {
    if (!editingUnits) {
      setDraftUnits(units);
      setEditingUnits(true);
      return;
    }
    onSaveSettings({ preferredUnits: draftUnits });
    setEditingUnits(false);
  }

  return (
    <div className="staggerStack">
      <Card className={`profileCard profileSummary ${bmiClass}`} style={bmiStyle}>
        <div className="profileTop">
          <div>
            <div className="label">Your profile</div>
            <strong>{name}</strong>
            <p className="profileSubline">Here's where you stand right now</p>
          </div>
          <button key={editingUnits ? 'done-units' : 'edit-units'} className="clearSetupButton profileEditButton" type="button" onClick={toggleUnitEditor}>
            {editingUnits ? 'Done' : 'Edit units'}
          </button>
        </div>
        {editingUnits ? (
          <div className="unitSwitch settingsUnitSwitch" role="group" aria-label="Measurement units">
            <button type="button" className={draftUnits === 'metric' ? 'on' : ''} onClick={() => setDraftUnits('metric')}>Metric</button>
            <button type="button" className={draftUnits === 'imperial' ? 'on' : ''} onClick={() => setDraftUnits('imperial')}>Imperial</button>
          </div>
        ) : null}
        <div className="profileUnitStage" data-direction={units === 'imperial' ? 'right' : 'left'}>
          {exitingUnits ? (
            <div className="profileUnitSnapshot exiting" aria-hidden="true">
              {profileUnitContent(exitingUnits)}
            </div>
          ) : null}
          <div className="profileUnitSnapshot entering" key={units}>
            {profileUnitContent(units)}
          </div>
        </div>
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

  function profileUnitContent(displayUnits) {
    return (
      <>
        <div className="currentWeightBlock">
          <div className="label">Current weight</div>
          <strong className="profileWeightNumber">{formatWeight(current, displayUnits, 'not logged')}</strong>
          <p>Started at {formatWeight(start, displayUnits, '-')}</p>
        </div>
        <div className="profileMetrics">
          <MetricCard label="Goal" value={formatWeight(state.onboardingProfile.goalWeightKg, displayUnits, 'not set')} note="target weight" />
          <MetricCard className="bmiMetricCard" label="BMI" value={state.healthPlan.bmi || 'pending'} note="current estimate" />
          <MetricCard label="Calories" value={state.settings.calorieTarget || 'not set'} note="daily target" />
          <MetricCard label="Maintenance" value={state.healthPlan.maintenanceCalories || 'calculating'} note="estimated kcal/day" />
        </div>
        <p className="note">{formatHeight(state.onboardingProfile.heightCm, displayUnits)} {' | '} {state.onboardingProfile.activityLevel} activity {' | '} {med || 'no medication'}</p>
      </>
    );
  }
}
