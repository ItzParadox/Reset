import Card from '../components/Card.jsx';
import Tick from '../components/Tick.jsx';

export default function Today({ state, dailyLog, timerText, timerRunning, onToggleDaily, onSaveDailyNotes, onTimerStart, onTimerPause, onTimerReset }) {
  const walkMins = state.settings.walkMinutes;
  const hydration = state.settings.hydrationTarget;
  const waterMl = Number(dailyLog.waterMl || 0);
  const hydrationLabel = hydration
    ? `${waterMl} / ${hydration}ml`
    : 'stay hydrated';

  const { remainingSeconds, durationSeconds } = state.ui.timer;
  const isIdle = remainingSeconds === durationSeconds;
  const isFinished = remainingSeconds === 0;
  const isPaused = !timerRunning && !isIdle && !isFinished;

  return (
    <>
      <Card>
        <div className="label">Today's basics</div>
        <div className="rows">
          <div className="row">
            <span className="rowText">Moved today{walkMins ? ` · ${walkMins} min` : ''}</span>
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
            <span className="rowText">Drank enough water · {hydrationLabel}</span>
            <Tick checked={dailyLog.hydrationDone} label="Toggle hydration done" onToggle={() => onToggleDaily('hydrationDone')} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="label">Movement timer</div>
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
      </Card>

      <Card>
        <div className="label">How was today?</div>
        <textarea
          value={dailyLog.notes}
          onChange={(e) => onSaveDailyNotes(e.target.value)}
          placeholder="Hunger, sleep, energy, what made it easier or harder — anything worth remembering tomorrow."
        />
      </Card>
    </>
  );
}
