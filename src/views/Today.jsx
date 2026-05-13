import { useEffect, useState } from 'react';
import Card from '../components/Card.jsx';
import Tick from '../components/Tick.jsx';
import { INPUT_LIMITS, validInteger } from '../lib/validation.js';

export default function Today({ state, dailyLog, timerText, timerRunning, onToggleDaily, onSaveDailyNotes, onTimerStart, onTimerPause, onTimerReset, onSaveTimerDuration }) {
  const walkMins = state.settings.walkMinutes;
  const [timerMinutes, setTimerMinutes] = useState(walkMins || '');
  const [editingTimer, setEditingTimer] = useState(!walkMins);
  const [timerEditorVisible, setTimerEditorVisible] = useState(!walkMins);
  const [timerError, setTimerError] = useState('');
  const hydration = state.settings.hydrationTarget;
  const waterMl = Number(dailyLog.waterMl || 0);
  const hydrationLabel = hydration
    ? `${waterMl} / ${hydration}ml`
    : 'stay hydrated';

  const { remainingSeconds, durationSeconds } = state.ui.timer;
  const hasTimerGoal = Number(durationSeconds) > 0;
  const isIdle = remainingSeconds === durationSeconds;
  const isFinished = remainingSeconds === 0;
  const isPaused = !timerRunning && !isIdle && !isFinished;

  useEffect(() => {
    setTimerMinutes(walkMins || '');
  }, [walkMins]);

  function saveTimer(event) {
    event.preventDefault();
    if (!validInteger(timerMinutes, INPUT_LIMITS.walkMinutes.min, INPUT_LIMITS.walkMinutes.max)) {
      setTimerError('Use whole minutes between 1 and 300.');
      return;
    }
    setTimerError('');
    onSaveTimerDuration(Number(timerMinutes));
    closeTimerEditor();
  }

  function openTimerEditor() {
    setTimerEditorVisible(true);
    window.requestAnimationFrame(() => setEditingTimer(true));
  }

  function closeTimerEditor() {
    setEditingTimer(false);
    window.setTimeout(() => setTimerEditorVisible(false), 430);
  }

  function toggleTimerEditor() {
    if (editingTimer) {
      closeTimerEditor();
      return;
    }
    openTimerEditor();
  }

  return (
    <>
      <Card>
        <div className="label">Today's basics</div>
        <div className="rows">
          <div className="row">
            <span className="rowText">Moved today{walkMins ? ` - ${walkMins} min` : ''}</span>
            <Tick checked={dailyLog.movementDone} label="Toggle movement done" onToggle={() => onToggleDaily('movementDone')} />
          </div>
          <div className="row">
            <span className="rowText">Stayed within calories</span>
            <Tick checked={dailyLog.calorieTargetHit} label="Toggle calorie target followed" onToggle={() => onToggleDaily('calorieTargetHit')} />
          </div>
          <div className="row">
            <span className="rowText">Got enough protein</span>
            <Tick checked={dailyLog.proteinDone} label="Toggle protein target done" onToggle={() => onToggleDaily('proteinDone')} />
          </div>
          <div className="row">
            <span className="rowText">Drank enough water - {hydrationLabel}</span>
            <Tick checked={dailyLog.hydrationDone} label="Toggle hydration done" onToggle={() => onToggleDaily('hydrationDone')} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="cardTitleRow compactTitleRow">
          <div className="label">Movement timer</div>
          {hasTimerGoal ? (
            <button className="clearSetupButton" type="button" onClick={toggleTimerEditor}>
              {editingTimer ? 'Done' : 'Edit'}
            </button>
          ) : null}
        </div>
        {hasTimerGoal ? (
          <>
            <div className="big">{timerText}</div>
            <div className="timer-btns">
              <button
                type="button"
                className={`timerBtn${timerRunning ? ' timerStart' : ''}`}
                onClick={onTimerStart}
              >
                Start
              </button>
              <button
                type="button"
                className={`timerBtn${isPaused ? ' timerPause' : ''}`}
                onClick={onTimerPause}
              >
                Pause
              </button>
              <button
                type="button"
                className="timerBtn timerReset"
                onClick={onTimerReset}
              >
                Reset
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mid">No movement goal set</div>
            <p className="note">Set one to start using the timer.</p>
          </>
        )}
        {(timerEditorVisible || !hasTimerGoal) ? (
          <div className={`editPanelFrame ${editingTimer || !hasTimerGoal ? 'open' : 'closing'}`}>
            <form onSubmit={saveTimer} className="timerSetForm">
              <label>
                Daily movement goal <span className="unitSuffix">min</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={INPUT_LIMITS.walkMinutes.min}
                  max={INPUT_LIMITS.walkMinutes.max}
                  value={timerMinutes}
                  onChange={(event) => {
                    setTimerError('');
                    setTimerMinutes(event.target.value);
                  }}
                  placeholder="e.g. 20"
                />
              </label>
              <button className="main secondary" type="submit">{hasTimerGoal ? 'Update goal' : 'Set timer'}</button>
            </form>
            {timerError ? <p className="note warn">{timerError}</p> : null}
          </div>
        ) : null}
      </Card>

      <Card>
        <div className="label">How was today?</div>
        <textarea
          value={dailyLog.notes}
          onChange={(e) => onSaveDailyNotes(e.target.value)}
          placeholder="Hunger, sleep, energy, what made it easier or harder - anything worth remembering tomorrow."
        />
      </Card>
    </>
  );
}
