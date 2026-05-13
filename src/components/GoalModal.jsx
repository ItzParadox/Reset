import { useMemo, useState } from 'react';
import { calculateBmi, healthyWeightRangeKg, round1 } from '../lib/calculations.js';

export default function GoalModal({ state, reachedWeight, onClose, onSetNewGoal }) {
  const profile = state.onboardingProfile;
  const healthyRange = useMemo(() => healthyWeightRangeKg(profile.heightCm), [profile.heightCm]);
  const reachedBmi = calculateBmi(reachedWeight, profile.heightCm);
  const currentGoal = Number(profile.goalWeightKg || 0);
  const goalStillAboveHealthy = healthyRange && currentGoal > healthyRange.max;
  const suggestedGoal = healthyRange ? Math.max(healthyRange.min, Math.min(healthyRange.max, Math.floor(healthyRange.max))) : '';
  const [newGoal, setNewGoal] = useState(suggestedGoal || '');
  const [editing, setEditing] = useState(goalStillAboveHealthy);

  function submit(event) {
    event.preventDefault();
    const number = Number(newGoal);
    if (!Number.isFinite(number) || number <= 0) return;
    onSetNewGoal(number);
  }

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" aria-labelledby="goal-title">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 36 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 36;
          const distance = 110 + ((index * 23) % 95);
          return <i key={index} style={{ '--i': index, '--x': `${Math.cos(angle) * distance}px`, '--y': `${Math.sin(angle) * distance + 70}px` }} />;
        })}
      </div>
      <div className="goalModal card">
        <div className="goalBadge">Goal reached</div>
        <h2 id="goal-title">Congratulations!</h2>
        <p className="note strong">You reached {round1(currentGoal)}kg. That is a real checkpoint, not just a number.</p>
        <p className="note">Your new logged weight is {round1(reachedWeight)}kg{reachedBmi ? `, with an estimated BMI of ${reachedBmi}.` : '.'}</p>

        {goalStillAboveHealthy ? (
          <div className="goalPrompt">
            <b>Ready for the next checkpoint?</b>
            <span>Your reached goal is still above the estimated healthy BMI range for your height. A sensible next target could be around {suggestedGoal}kg.</span>
          </div>
        ) : (
          <div className="goalPrompt calm">
            <b>Now protect the progress.</b>
            <span>This is a good moment to choose whether you want a maintenance phase or a smaller next goal.</span>
          </div>
        )}

        {editing ? (
          <form onSubmit={submit} className="goalForm">
            <label>New goal <span className="unitSuffix">kg</span><input value={newGoal} onChange={(event) => setNewGoal(event.target.value)} type="number" step="0.1" inputMode="decimal" placeholder="kg" /></label>
            <button className="main" type="submit">Set new goal</button>
            <button className="main secondary" type="button" onClick={onClose}>Not now</button>
          </form>
        ) : (
          <div className="wizardBtns oneTwo">
            <button className="main secondary" type="button" onClick={() => setEditing(true)}>Set new goal</button>
            <button className="main" type="button" onClick={onClose}>Keep current plan</button>
          </div>
        )}
      </div>
    </div>
  );
}
