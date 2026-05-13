import Card from '../components/Card.jsx';
import { useEffect, useState } from 'react';

function formatWater(value) {
  const amount = Number(value || 0);
  if (amount >= 1000) return `${(amount / 1000).toFixed(1).replace('.0', '')}L`;
  return `${amount}ml`;
}

export default function Water({ state, dailyLog, onAddWater, onResetWater, onSaveWaterStep, onSaveHydrationTarget }) {
  const target = Number(state.settings.hydrationTarget || 2000);
  const current = Number(dailyLog.waterMl || 0);
  const step = Number(state.settings.waterStepMl || 250);
  const [draftStep, setDraftStep] = useState(String(step));
  const [draftTarget, setDraftTarget] = useState(String(target));
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetEditorVisible, setTargetEditorVisible] = useState(false);
  const [targetError, setTargetError] = useState('');
  const progress = Math.min(1, target > 0 ? current / target : 0);
  const reached = current >= target;

  useEffect(() => {
    setDraftStep(String(step));
  }, [step]);

  useEffect(() => {
    setDraftTarget(String(target));
  }, [target]);

  function updateStep(value) {
    setDraftStep(value);
    const number = Number.parseInt(value, 10);
    if (Number.isFinite(number) && number >= 50 && number <= 2000) {
      onSaveWaterStep(number);
    }
  }

  function saveTarget(event) {
    event.preventDefault();
    const number = Number.parseInt(draftTarget, 10);
    if (!Number.isFinite(number) || number < 250 || number > 10000) {
      setTargetError('Use a target between 250ml and 10000ml.');
      return;
    }
    setTargetError('');
    onSaveHydrationTarget(number);
    closeTargetEditor();
  }

  function openTargetEditor() {
    setTargetEditorVisible(true);
    window.requestAnimationFrame(() => setEditingTarget(true));
  }

  function closeTargetEditor() {
    setEditingTarget(false);
    window.setTimeout(() => setTargetEditorVisible(false), 430);
  }

  function toggleTargetEditor() {
    if (editingTarget) {
      closeTargetEditor();
      return;
    }
    openTargetEditor();
  }

  return (
    <div className="staggerStack">
      <Card className={`waterCard ${reached ? 'complete' : ''}`}>
        <div className="waterHeader">
          <div className="waterBottle" style={{ '--water-level': `${progress * 100}%` }} aria-hidden="true">
            <div className="bottleCap" />
            <div className="bottleBody">
              <div className="waterFill">
                <span />
              </div>
            </div>
          </div>
          <div className="waterReadout">
            <div className="waterReadoutTop">
              <div className="label">Water</div>
              <button className="clearSetupButton waterEditButton" type="button" onClick={toggleTargetEditor}>
                {editingTarget ? 'Done' : 'Edit'}
              </button>
            </div>
            <h2>{formatWater(current)}</h2>
            <p className="note">of {formatWater(target)} today</p>
          </div>
        </div>

        {targetEditorVisible ? (
          <div className={`editPanelFrame ${editingTarget ? 'open' : 'closing'}`}>
            <form onSubmit={saveTarget} className="waterTargetForm">
              <label>
                Daily target <span className="unitSuffix">ml</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="250"
                  max="10000"
                  step="50"
                  value={draftTarget}
                  onChange={(event) => {
                    setTargetError('');
                    setDraftTarget(event.target.value);
                  }}
                  placeholder="e.g. 2000"
                />
              </label>
              <button className="main secondary" type="submit">Update target</button>
            </form>
            {targetError ? <p className="note warn">{targetError}</p> : null}
          </div>
        ) : null}

        {reached ? (
          <div className="hydrationWin">
            <b>Hydration target hit.</b>
            <span>Nice work staying hydrated today.</span>
          </div>
        ) : null}

        <div className="waterActions">
          <button className="main waterAddButton" type="button" onClick={() => onAddWater(step)}>
            Add {formatWater(step)}
          </button>
          <button className="main secondary" type="button" onClick={onResetWater}>Reset today</button>
        </div>
      </Card>

      <Card>
        <div className="label">Pour size</div>
        <label>
          Amount per tap <span className="unitSuffix">ml</span>
          <input
            type="number"
            inputMode="numeric"
            min="50"
            max="2000"
            step="50"
            value={draftStep}
            onChange={(event) => updateStep(event.target.value)}
          />
        </label>
        <p className="note">Default is 250ml. Use a realistic amount for your bottle, glass, or cup.</p>
      </Card>
    </div>
  );
}
