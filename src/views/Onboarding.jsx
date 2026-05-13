import { useEffect, useMemo, useState } from 'react';
import Card from '../components/Card.jsx';
import AnimatedNumber from '../components/AnimatedNumber.jsx';
import TopToast from '../components/TopToast.jsx';
import {
  ACTIVITY_LEVELS,
  MEDICATION_OPTIONS,
  calculateBmi,
  bmiCategory,
  bmiClassName,
  bmiVisualStyle,
  planOptions,
  calculateMaintenance,
  kgToLb,
  lbToKg,
  cmToFeetInches,
  feetInchesToCm,
} from '../lib/calculations.js';
import { INPUT_LIMITS, IMPERIAL_LIMITS, hasProfileInput, validateAdultProfile, validInteger, validNumber } from '../lib/validation.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const initialForm = {
  displayName: '',
  age: '',
  sex: '',
  preferredUnits: '',
  heightCm: '',
  heightFt: '',
  heightIn: '',
  startWeightKg: '',
  startWeightLb: '',
  goalWeightKg: '',
  goalWeightLb: '',
  activityLevel: 'sedentary',
  usesWeightLossMedication: false,
  medicationName: 'none',
  medicationOther: '',
  medicationDose: '',
  injectionDay: '',
  walkMinutes: '',
};

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [selectedDeficit, setSelectedDeficit] = useState('moderate');
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [visibleUnits, setVisibleUnits] = useState(form.preferredUnits);
  const [exitingUnits, setExitingUnits] = useState('');
  const [lastValidPreviewBmi, setLastValidPreviewBmi] = useState(null);

  const canShowProfilePreview = useMemo(() => canPreviewProfile(form), [form]);
  const currentPreviewBmi = useMemo(() => (canShowProfilePreview ? calculateBmi(form.startWeightKg, form.heightCm) : null), [canShowProfilePreview, form.startWeightKg, form.heightCm]);
  const previewBmi = currentPreviewBmi || lastValidPreviewBmi;
  const previewIsStale = Boolean(lastValidPreviewBmi && !currentPreviewBmi);
  const previewCategory = previewBmi ? bmiCategory(previewBmi) : 'Unknown';
  const previewStyle = bmiVisualStyle(previewBmi);
  const options = useMemo(() => planOptions(form), [form]);
  const maintenanceEstimate = useMemo(() => calculateMaintenance(form), [form]);

  useEffect(() => {
    if (form.preferredUnits === visibleUnits) return undefined;
    if (visibleUnits) setExitingUnits(visibleUnits);
    setVisibleUnits(form.preferredUnits);
    const timer = window.setTimeout(() => setExitingUnits(''), 320);
    return () => window.clearTimeout(timer);
  }, [form.preferredUnits, visibleUnits]);

  useEffect(() => {
    if (!error) return undefined;
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [error]);

  useEffect(() => {
    if (currentPreviewBmi) setLastValidPreviewBmi(currentPreviewBmi);
  }, [currentPreviewBmi]);

  function update(key, value) {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateAge(value) {
    setForm((current) => ({ ...current, age: value }));
    const trimmed = String(value).trim();
    const age = Number(trimmed);
    const hasCommittedUnderageValue = /^\d{2,}$/.test(trimmed) && Number.isFinite(age) && age < 18;

    if (hasCommittedUnderageValue) {
      setError("Reset is for adults. If you're under 18, use it with parent or guardian permission.");
      return;
    }

    setError('');
  }


  function updateUnits(nextUnits) {
    setError('');
    setForm((current) => {
      if (nextUnits === current.preferredUnits) return current;
      if (nextUnits === 'imperial') {
        const heightParts = cmToFeetInches(current.heightCm);
        return {
          ...current,
          preferredUnits: 'imperial',
          heightFt: heightParts.feet,
          heightIn: heightParts.inches,
          startWeightLb: current.startWeightKg ? kgToLb(current.startWeightKg) : '',
          goalWeightLb: current.goalWeightKg ? kgToLb(current.goalWeightKg) : '',
        };
      }
      return {
        ...current,
        preferredUnits: 'metric',
        heightCm: current.heightCm || feetInchesToCm(current.heightFt, current.heightIn),
        startWeightKg: current.startWeightKg || lbToKg(current.startWeightLb),
        goalWeightKg: current.goalWeightKg || lbToKg(current.goalWeightLb),
      };
    });
  }

  function updateMetric(key, value) {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateImperial(key, value) {
    setError('');
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'heightFt' || key === 'heightIn') next.heightCm = feetInchesToCm(next.heightFt, next.heightIn);
      if (key === 'startWeightLb') next.startWeightKg = lbToKg(value);
      if (key === 'goalWeightLb') next.goalWeightKg = lbToKg(value);
      return next;
    });
  }

  function next() {
    const problem = validateStep(step, form, selectedDeficit, warningAcknowledged);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    if (step < 4) setStep(step + 1);
  }

  function back() {
    setError('');
    setStep(Math.max(0, step - 1));
  }

  function clearAll() {
    setError('');
    setForm(initialForm);
    setSelectedDeficit('moderate');
    setWarningAcknowledged(false);
    setVisibleUnits('');
    setExitingUnits('');
    setLastValidPreviewBmi(null);
    setStep(1);
  }

  function finish() {
    const problem = validateStep(4, form, selectedDeficit, warningAcknowledged);
    if (problem) {
      setError(problem);
      return;
    }
    onComplete({ ...form, currentWeightKg: form.startWeightKg }, selectedDeficit, warningAcknowledged);
  }

  return (
    <main className="app onboardingShell animatedPage">
      <TopToast message={error} />
      <header className="heroHeader">
        <div className="logoLockup siteLogoLockup"><img className="siteLogoImage" src="/brand/reset-transparent-logo-v7.png" alt="" aria-hidden="true" /><span className="wordmark wordmarkEset">ESET</span></div>
        <h1>Let's build<br />your plan.</h1>
        <p>A few honest answers and we'll do the maths. Takes about two minutes.</p>
      </header>

      <div className="stepDots" aria-label="Onboarding progress">
        {[0, 1, 2, 3, 4].map((dot) => <span key={dot} className={dot <= step ? 'on' : ''} />)}
      </div>

      <div className="staggerStack">
        {step === 0 && (
          <Card className="liftCard welcomeCard">
            <div className="label">Welcome</div>
            <p className="note strong">Reset builds a real plan from where you actually are right now — no shame, no guesswork.</p>
            <p className="note">Set your details once, pick a pace you can live with, then just track the four daily basics. That is genuinely it.</p>
            <button className="main" type="button" onClick={next}>Start setup</button>
          </Card>
        )}

        {step === 1 && (
          <Card className="liftCard">
            <div className="cardTitleRow">
              <div className="label sectionTitle">Your information</div>
              {hasProfileInput(form) ? <button className="clearSetupButton" type="button" onClick={clearAll}>Clear</button> : null}
            </div>
            <div className="unitPrompt">Choose your measurement system first.</div>
            <div className={`unitSwitch prominent animatedSwitch ${form.preferredUnits ? 'hasChoice' : ''}`} role="group" aria-label="Measurement units">
              <button type="button" className={form.preferredUnits === 'metric' ? 'on' : ''} onClick={() => updateUnits('metric')}>Metric <span>kg, cm</span></button>
              <button type="button" className={form.preferredUnits === 'imperial' ? 'on' : ''} onClick={() => updateUnits('imperial')}>Imperial <span>lb, ft/in</span></button>
            </div>
            <div className="formGrid">
              <label>Display name<input value={form.displayName} onChange={(e) => update('displayName', e.target.value)} placeholder="Optional" /></label>
              <label>Age<input type="number" inputMode="numeric" value={form.age} onChange={(e) => updateAge(e.target.value)} min={INPUT_LIMITS.age.min} max={INPUT_LIMITS.age.max} placeholder="e.g. 29" /></label>
              <label>Sex<span className="fieldHelp">Used for calorie and BMI calculations.</span><select value={form.sex} onChange={(e) => update('sex', e.target.value)}><option value="">Choose</option><option value="male">Male</option><option value="female">Female</option><option value="unspecified">Prefer not to say</option></select></label>
              <div className="unitTransitionStage">
                {exitingUnits ? renderUnitFields(exitingUnits, 'exiting') : null}
                {renderUnitFields(visibleUnits, 'entering')}
              </div>
            </div>
            {previewBmi ? (
              <div className={`bmiPanel liveBmi ${previewIsStale ? 'isStale' : ''} ${bmiClassName(previewCategory)}`} style={previewStyle}>
                <span className="bmiLabelText">BMI</span>
                <b className="bmiNumberText"><AnimatedNumber value={previewBmi} decimals={1} animateOnMount /></b>
                <em>{previewCategory}</em>
              </div>
            ) : null}
          </Card>
        )}

        {step === 2 && (
          <Card className="liftCard">
            <div className="label sectionTitle">Daily movement</div>
            <div className="choiceList">
              {Object.entries(ACTIVITY_LEVELS).map(([key, option]) => (
                <button key={key} type="button" className={form.activityLevel === key ? 'choice on' : 'choice'} onClick={() => update('activityLevel', key)}>
                  <b>{option.label}</b><span>{option.detail}</span>
                </button>
              ))}
            </div>
            <label className="fieldGap">Comfortable movement target <span className="unitSuffix">minutes/day</span><input type="number" inputMode="numeric" value={form.walkMinutes} min={INPUT_LIMITS.walkMinutes.min} max={INPUT_LIMITS.walkMinutes.max} onChange={(e) => update('walkMinutes', e.target.value)} placeholder="Enter minutes per day, optional" /></label>
          </Card>
        )}

        {step === 3 && (
          <Card className="liftCard">
            <div className="label sectionTitle">Medication setup</div>
            <div className="choiceList">
              {MEDICATION_OPTIONS.map((med) => (
                <button key={med.value} type="button" className={form.medicationName === med.value ? 'choice on' : 'choice'} onClick={() => updateMedication(med.value)}>
                  <b>{med.label}</b>
                </button>
              ))}
            </div>
            {form.medicationName !== 'none' && (
              <div className="formGrid fieldGap slideMetricGroup">
                {form.medicationName === 'other' ? <label>Medication name<input value={form.medicationOther} onChange={(e) => update('medicationOther', e.target.value)} placeholder="Name" /></label> : null}
                <label>Dose <span className="unitSuffix">mg</span><input value={form.medicationDose} onChange={(e) => update('medicationDose', e.target.value)} placeholder="e.g. 2.5 mg" /></label>
                <label>Usual day<select value={form.injectionDay} onChange={(e) => update('injectionDay', e.target.value)}><option value="">Choose a day</option>{DAYS.map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
              </div>
            )}
          </Card>
        )}

        {step === 4 && (
          <Card className="liftCard">
            <div className="label sectionTitle">Choose your plan</div>
            <p className="note">We estimate maintenance calories from your details, then calculate each deficit option automatically.</p>
            {previewBmi ? (
              <div className={`bmiPanel compact liveBmi ${previewIsStale ? 'isStale' : ''} ${bmiClassName(previewCategory)}`} style={previewStyle}>
                <span className="bmiLabelText">BMI</span><b className="bmiNumberText"><AnimatedNumber value={previewBmi} decimals={1} animateOnMount /></b><em>{previewCategory}</em>
              </div>
            ) : null}
            {maintenanceEstimate ? (
              <div className="formulaPanel">
                <span>Estimated maintenance</span>
                <b>{maintenanceEstimate} kcal/day</b>
                <em>Targets below are calculated from this estimate.</em>
              </div>
            ) : null}
            <div className="choiceList fieldGap">
              {options.map((option) => {
                const isExtremeSelected = selectedDeficit === 'extreme' && option.key === 'extreme';
                return (
                  <button key={option.key} type="button" className={selectedDeficit === option.key ? 'choice planChoice on' : 'choice planChoice'} onClick={() => { setSelectedDeficit(option.key); setWarningAcknowledged(false); }}>
                    <div className="planChoiceTop">
                      <span className="planChoiceName">{option.label}</span>
                      <b className="planChoiceCalories">{option.calorieTarget ? option.calorieTarget : '—'} <em>kcal/day</em></b>
                    </div>
                    <span className="planChoiceMeta">{Math.round(option.percentage * 100)}% deficit · {option.detail}</span>
                    {option.warning && !isExtremeSelected ? <span className="cautionText">{option.warning}</span> : null}
                  </button>
                );
              })}
            </div>
            {selectedDeficit === 'extreme' && (
              <label className={`checkLine cautionCheck ${warningAcknowledged ? 'acknowledged' : ''}`}>
                <input type="checkbox" checked={warningAcknowledged} onChange={(e) => setWarningAcknowledged(e.target.checked)} />
                <span>{warningAcknowledged ? 'Clinical caution acknowledged.' : 'I understand this is a large deficit and should be discussed with a doctor or qualified clinician.'}</span>
              </label>
            )}
          </Card>
        )}
      </div>

      {step > 0 && (
        <div className="wizardBtns">
          <button className="main secondary" type="button" onClick={back}>Back</button>
          {step < 4 ? <button className="main" type="button" onClick={next}>Continue</button> : <button className="main" type="button" onClick={finish}>Start tracking</button>}
        </div>
      )}
    </main>
  );

  function updateMedication(value) {
    setError('');
    setForm((current) => ({
      ...current,
      medicationName: value,
      usesWeightLossMedication: value !== 'none',
      medicationDose: value === 'none' ? '' : current.medicationDose,
    }));
  }

  function renderUnitFields(units, phase) {
    const commonClass = `unitFields slideUnitFields ${phase} ${units || 'empty'}Fields`;
    if (!units) {
      return <div key={`units-empty-${phase}`} className={`emptyInputHint ${commonClass}`}>Pick Metric or Imperial to show height and weight fields.</div>;
    }
    if (units === 'metric') {
      return (
        <div key={`units-metric-${phase}`} className={commonClass} aria-hidden={phase === 'exiting'}>
          <label>Height <span className="unitSuffix">cm</span><input type="number" inputMode="decimal" value={form.heightCm} min={INPUT_LIMITS.heightCm.min} max={INPUT_LIMITS.heightCm.max} onChange={(e) => updateMetric('heightCm', e.target.value)} placeholder="e.g. 178 cm" /></label>
          <label>Starting weight <span className="unitSuffix">kg</span><input type="number" inputMode="decimal" value={form.startWeightKg} min={INPUT_LIMITS.weightKg.min} max={INPUT_LIMITS.weightKg.max} onChange={(e) => updateMetric('startWeightKg', e.target.value)} placeholder="e.g. 110 kg" /></label>
          <label>Goal weight <span className="unitSuffix">kg</span><input type="number" inputMode="decimal" value={form.goalWeightKg} min={INPUT_LIMITS.weightKg.min} max={INPUT_LIMITS.weightKg.max} onChange={(e) => updateMetric('goalWeightKg', e.target.value)} placeholder="e.g. 85 kg" /></label>
        </div>
      );
    }
    return (
      <div key={`units-imperial-${phase}`} className={commonClass} aria-hidden={phase === 'exiting'}>
        <label>Height <span className="unitSuffix">ft / in</span><div className="dualInput"><input type="number" inputMode="numeric" value={form.heightFt} min={IMPERIAL_LIMITS.heightFt.min} max={IMPERIAL_LIMITS.heightFt.max} onChange={(e) => updateImperial('heightFt', e.target.value)} placeholder="ft" /><input type="number" inputMode="decimal" value={form.heightIn} min={IMPERIAL_LIMITS.heightIn.min} max={IMPERIAL_LIMITS.heightIn.max} onChange={(e) => updateImperial('heightIn', e.target.value)} placeholder="in" /></div></label>
        <label>Starting weight <span className="unitSuffix">lb</span><input type="number" inputMode="decimal" value={form.startWeightLb} min={IMPERIAL_LIMITS.weightLb.min} max={IMPERIAL_LIMITS.weightLb.max} onChange={(e) => updateImperial('startWeightLb', e.target.value)} placeholder="e.g. 242 lb" /></label>
        <label>Goal weight <span className="unitSuffix">lb</span><input type="number" inputMode="decimal" value={form.goalWeightLb} min={IMPERIAL_LIMITS.weightLb.min} max={IMPERIAL_LIMITS.weightLb.max} onChange={(e) => updateImperial('goalWeightLb', e.target.value)} placeholder="e.g. 187 lb" /></label>
      </div>
    );
  }
}

function validateStep(step, form, selectedDeficit, warningAcknowledged) {
  if (step === 1) {
    if (!hasProfileInput(form)) return 'Enter your information to continue.';

    const age = Number(form.age);
    if (form.age && Number.isFinite(age) && age < 18) {
      return "Reset is for adults. If you're under 18, use it with parent or guardian permission.";
    }

    const profileProblem = validateAdultProfile(form);
    if (profileProblem) return profileProblem;
  }
  if (step === 2 && !ACTIVITY_LEVELS[form.activityLevel]) return 'Choose an activity level.';
  if (step === 2 && form.walkMinutes && !validInteger(form.walkMinutes, INPUT_LIMITS.walkMinutes.min, INPUT_LIMITS.walkMinutes.max)) return 'Use whole minutes between 1 and 300, or leave it blank.';
  if (step === 3 && form.medicationName === 'other' && !form.medicationOther.trim()) return 'Add the medication name, or choose a listed option.';
  if (step === 3 && form.medicationName !== 'none' && !form.injectionDay) return 'Add your usual injection day.';
  if (step === 4 && selectedDeficit === 'extreme' && !warningAcknowledged) return 'Acknowledge the clinical caution first.';
  return '';
}

function canPreviewProfile(form) {
  return (
    validInteger(form.age, INPUT_LIMITS.age.min, INPUT_LIMITS.age.max) &&
    validNumber(form.heightCm, INPUT_LIMITS.heightCm.min, INPUT_LIMITS.heightCm.max) &&
    validNumber(form.startWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max)
  );
}
