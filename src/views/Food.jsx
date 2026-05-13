import Card from '../components/Card.jsx';
import { DEFICIT_OPTIONS, calculateMaintenance, estimatePlanGoalDate, mealStructureForProfile } from '../lib/calculations.js';

export default function Food({ state, onUpdatePlan }) {
  const selected = state.healthPlan.selectedDeficitLevel;
  const structure = mealStructureForProfile(state);
  const planMaintenance = calculateMaintenance(state.onboardingProfile) || state.healthPlan.maintenanceCalories;
  const planGoalDate = estimatePlanGoalDate({
    ...state,
    healthPlan: {
      ...state.healthPlan,
      maintenanceCalories: planMaintenance,
    },
  });

  return (
    <div className="staggerStack">
      <Card className="heroCard">
        <div className="label">Your calorie target</div>
        <div className="big">{state.settings.calorieTarget || 'calculating'}</div>
        <p className="note">
          Estimated maintenance is {planMaintenance || 'calculating'} kcal.
          You're running a {Math.round((state.healthPlan.deficitPercentage || 0) * 100)}% deficit — enough to move the scale without flooring your energy.
        </p>
      </Card>

      <Card>
        <div className="label">Change the pace</div>
        <div className="choiceList">
          {Object.entries(DEFICIT_OPTIONS).map(([key, option]) => {
            const target = planMaintenance
              ? Math.round(planMaintenance * (1 - option.percentage))
              : null;
            return (
              <button
                key={key}
                type="button"
                className={selected === key ? 'choice planChoice on' : 'choice planChoice'}
                onClick={() => onUpdatePlan(key, key !== 'extreme' ? false : state.healthPlan.warningAcknowledged)}
              >
                <div className="planChoiceTop">
                  <span className="planChoiceName">{option.label}</span>
                  <b className="planChoiceCalories">{target || 'not set'} <em>kcal/day</em></b>
                </div>
                <span className="planChoiceMeta">{Math.round(option.percentage * 100)}% deficit · {option.detail}</span>
                {option.warning && selected !== key ? <span className="cautionText">{option.warning}</span> : null}
              </button>
            );
          })}
        </div>
        {selected === 'extreme' && !state.healthPlan.warningAcknowledged ? (
          <button className="main secondary" type="button" onClick={() => onUpdatePlan('extreme', true)}>Acknowledge clinical caution</button>
        ) : null}
        {selected === 'extreme' && state.healthPlan.warningAcknowledged ? (
          <p className="note strong">Extreme target active. Keep a close eye on how you feel day to day.</p>
        ) : null}
      </Card>

      {planGoalDate ? (
        <Card>
          <div className="label">Projected goal date</div>
          <div className="mid">{planGoalDate.label}</div>
          <p className="note">
            Based on your current target, roughly {planGoalDate.weeklyLossKg}kg per week.
            Treat it as a compass, not a deadline.
          </p>
        </Card>
      ) : null}

      <Card>
        <div className="label">How to eat around this</div>
        <div className="list">
          {structure.map((item) => (
            <div className="item" key={item.title}>
              <b>{item.title}</b>
              <span>{item.body}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
