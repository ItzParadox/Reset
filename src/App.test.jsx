import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App.jsx';

const exportedBugState = {
  version: 7,
  profile: {
    userId: null,
    email: '',
    displayName: '',
    onboardingComplete: true,
    createdAt: '2026-05-13T16:17:00.315Z',
    updatedAt: '2026-05-13T16:17:00.315Z',
  },
  onboardingProfile: {
    age: 18,
    sex: 'male',
    heightCm: 152.4,
    startWeightKg: 111.1,
    currentWeightKg: 111.1,
    goalWeightKg: 80.7,
    activityLevel: 'sedentary',
    usesWeightLossMedication: false,
    medicationName: 'none',
    medicationOther: '',
    medicationDose: '',
    injectionDay: '',
  },
  healthPlan: {
    bmi: 47.8,
    bmiCategory: 'Obese',
    bmrCalories: 1979,
    maintenanceCalories: 25886,
    selectedDeficitLevel: 'aggressive',
    deficitPercentage: 0.3,
    calorieTarget: 19415,
    warningAcknowledged: false,
    calculatedAt: '2026-05-13T16:26:43.783Z',
  },
  settings: {
    preferredUnits: 'imperial',
    calorieTarget: 19415,
    walkMinutes: null,
    hydrationTarget: 2000,
    waterStepMl: 250,
    proteinTarget: 'with 2 meals',
    updatedAt: '2026-05-13T16:26:43.783Z',
  },
  weightLogs: [
    {
      id: 'weight-1',
      weightKg: 111.1,
      loggedAt: '2026-05-13',
      displayDate: '13/05/2026',
      createdAt: '2026-05-13T16:17:00.322Z',
    },
  ],
  dailyLogs: {},
  medicationLogs: {},
  ui: { activeTab: 'food', timer: { durationSeconds: 0, remainingSeconds: 0 } },
  sync: { mode: 'local-only', pending: [], lastSyncedAt: null },
};

function stateWithPatch(patch = {}) {
  return {
    ...exportedBugState,
    ...patch,
    profile: { ...exportedBugState.profile, ...(patch.profile || {}) },
    onboardingProfile: { ...exportedBugState.onboardingProfile, ...(patch.onboardingProfile || {}) },
    healthPlan: { ...exportedBugState.healthPlan, ...(patch.healthPlan || {}) },
    settings: { ...exportedBugState.settings, ...(patch.settings || {}) },
    ui: { ...exportedBugState.ui, ...(patch.ui || {}), timer: { ...exportedBugState.ui.timer, ...(patch.ui?.timer || {}) } },
  };
}

function expectNoAbsurdCalorieText() {
  const text = document.body.textContent || '';
  expect(text).not.toMatch(/NaN|Infinity/);
  expect(text).not.toMatch(/-\d+\s*kcal/);
  const displayedNumbers = Array.from(text.matchAll(/\b\d{4,6}\b/g), (match) => Number(match[0]));
  displayedNumbers.forEach((value) => {
    expect(value).toBeLessThan(10000);
  });
}

async function finishMetricOnboarding(user) {
  await screen.findByRole('button', { name: /start setup/i }, { timeout: 2500 });
  await user.click(screen.getByRole('button', { name: /start setup/i }));
  await user.click(screen.getByRole('button', { name: /metric/i }));
  await user.type(screen.getByLabelText(/display name/i), 'Ada');
  await user.type(screen.getByLabelText(/age/i), '40');
  await user.selectOptions(screen.getByLabelText(/sex/i), 'female');
  await user.type(screen.getByLabelText(/height/i), '170');
  await user.type(screen.getByLabelText(/starting weight/i), '100');
  await user.type(screen.getByLabelText(/goal weight/i), '80');
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /lightly active/i }));
  await user.type(screen.getByLabelText(/comfortable movement target/i), '20');
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /continue/i }));
  await user.click(screen.getByRole('button', { name: /start tracking/i }));
  await screen.findByText(/Afternoon, Ada\.|Morning, Ada\.|Evening, Ada\./);
}

async function switchPlan(user, label) {
  await user.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));
  await waitFor(() => {
    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.healthPlan.selectedDeficitLevel).toBe(label.toLowerCase());
  });
}

describe('Reset app integration', () => {
  it('completes onboarding, persists the generated plan, and logs a new weight', async () => {
    const user = userEvent.setup();

    render(<App />);
    expect(screen.getByText('Reset')).toBeInTheDocument();

    await finishMetricOnboarding(user);

    expect(await screen.findByText(/Afternoon, Ada\.|Morning, Ada\.|Evening, Ada\./)).toBeInTheDocument();
    expect(screen.getByText('100.0kg')).toBeInTheDocument();
    expect(screen.getByText('1989')).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.profile.onboardingComplete).toBe(true);
    expect(stored.settings.calorieTarget).toBe(1989);
    expect(stored.sync.pending).toEqual([expect.objectContaining({
      mutation: { table: 'onboarding_bundle', action: 'upsert', payloadKey: 'current_user' },
    })]);

    await user.click(screen.getByRole('button', { name: /weight/i }));
    await user.type(screen.getByPlaceholderText(/95 kg/i), '98.5');
    await user.click(within(screen.getByText(/log today's weight/i).closest('.card')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getAllByText('98.5kg')).toHaveLength(2));
    const updated = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(updated.onboardingProfile.currentWeightKg).toBe(98.5);
    expect(updated.weightLogs[0].weightKg).toBe(98.5);
    expect(updated.sync.pending[0].mutation.table).toBe('weight_logs');
  });

  it('keeps Aggressive selected and recalculates calories after metric weight changes', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(stateWithPatch({
      settings: { preferredUnits: 'metric', calorieTarget: 1781 },
      healthPlan: {
        bmrCalories: 1979,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'aggressive',
        deficitPercentage: 0.25,
        calorieTarget: 1781,
      },
      ui: { activeTab: 'weight' },
    })));

    render(<App />);
    expect(await screen.findAllByText('111.1kg', {}, { timeout: 2500 })).toHaveLength(2);
    await user.type(screen.getByPlaceholderText(/95 kg/i), '95');
    await user.click(within(screen.getByText(/log today's weight/i).closest('.card')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getAllByText('95.0kg')).toHaveLength(2));
    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.healthPlan.selectedDeficitLevel).toBe('aggressive');
    expect(stored.healthPlan.maintenanceCalories).toBe(2182);
    expect(stored.settings.calorieTarget).toBe(1637);
  });

  it('uses imperial display and stores logged lb values internally as kg after refresh', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(stateWithPatch({
      settings: { preferredUnits: 'imperial', calorieTarget: 1781 },
      healthPlan: {
        bmrCalories: 1979,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'aggressive',
        deficitPercentage: 0.25,
        calorieTarget: 1781,
      },
      ui: { activeTab: 'weight' },
    })));

    const { unmount } = render(<App />);
    expect(await screen.findAllByText('244.9lb', {}, { timeout: 2500 })).toHaveLength(2);
    expect(screen.getByText('177.9lb')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/210 lb/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/210 lb/i), '210');
    await user.click(within(screen.getByText(/log today's weight/i).closest('.card')).getByRole('button', { name: /save/i }));

    await waitFor(() => expect(screen.getAllByText('210.1lb')).toHaveLength(2));
    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.weightLogs[0].weightKg).toBe(95.3);
    expect(stored.onboardingProfile.currentWeightKg).toBe(95.3);

    unmount();
    render(<App />);
    await screen.findAllByText('210.1lb', {}, { timeout: 2500 });
    expect(screen.queryByText(/95\.3kg/)).not.toBeInTheDocument();
  });

  it('changes preferred units from the User profile card without changing stored kg data', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(stateWithPatch({
      settings: { preferredUnits: 'imperial', calorieTarget: 1781 },
      healthPlan: {
        bmrCalories: 1979,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'aggressive',
        deficitPercentage: 0.25,
        calorieTarget: 1781,
      },
      ui: { activeTab: 'settings' },
    })));

    render(<App />);
    await screen.findByText('244.9lb', {}, { timeout: 2500 });
    expect(screen.getByText('177.9lb')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit units/i }));
    await user.click(screen.getByRole('button', { name: /^metric$/i }));

    await screen.findByText('111.1kg');
    expect(screen.getByText('80.7kg')).toBeInTheDocument();
    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.settings.preferredUnits).toBe('metric');
    expect(stored.onboardingProfile.currentWeightKg).toBe(111.1);
    expect(stored.weightLogs[0].weightKg).toBe(111.1);
    expect(stored.settings.calorieTarget).toBe(1781);
    expect(stored.healthPlan.maintenanceCalories).toBe(2375);
  });

  it('shows a movement timer empty state and starts after setting a duration', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(stateWithPatch({
      settings: { preferredUnits: 'metric', calorieTarget: 2019, walkMinutes: null },
      healthPlan: {
        bmrCalories: 1979,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'moderate',
        deficitPercentage: 0.15,
        calorieTarget: 2019,
      },
      ui: { activeTab: 'today', timer: { durationSeconds: 0, remainingSeconds: 0 } },
    })));

    render(<App />);
    await screen.findByText('No movement goal set', {}, { timeout: 2500 });
    expect(screen.queryByRole('button', { name: /^start$/i })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/daily movement goal/i), '20');
    await user.click(screen.getByRole('button', { name: /set timer/i }));

    await screen.findByText('20:00');
    expect(JSON.parse(localStorage.getItem('reset_state_v7')).ui.timer.durationSeconds).toBe(1200);
    await user.click(screen.getByRole('button', { name: /^start$/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^start$/i })).toHaveClass('timerStart'));
  });

  it('edits movement goal from Today and hydration target from Water', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(stateWithPatch({
      settings: { preferredUnits: 'metric', calorieTarget: 2019, walkMinutes: 20, hydrationTarget: 2000 },
      healthPlan: {
        bmrCalories: 1979,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'moderate',
        deficitPercentage: 0.15,
        calorieTarget: 2019,
      },
      ui: { activeTab: 'today', timer: { durationSeconds: 1200, remainingSeconds: 1200 } },
    })));

    render(<App />);
    await screen.findByText('20:00', {}, { timeout: 2500 });
    expect(screen.queryByLabelText(/daily movement goal/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /edit/i }));
    const movementInput = screen.getByLabelText(/daily movement goal/i);
    await user.clear(movementInput);
    await user.type(movementInput, '30');
    await user.click(screen.getByRole('button', { name: /update goal/i }));

    await screen.findByText('30:00');
    expect(JSON.parse(localStorage.getItem('reset_state_v7')).settings.walkMinutes).toBe(30);

    await user.click(screen.getByRole('button', { name: /water/i }));
    await screen.findByText(/of 2L today/i);
    await user.click(screen.getByRole('button', { name: /edit/i }));
    const targetInput = screen.getByLabelText(/daily target/i);
    await user.clear(targetInput);
    await user.type(targetInput, '2500');
    await user.click(screen.getByRole('button', { name: /update target/i }));

    await screen.findByText(/of 2.5L today/i);
    expect(JSON.parse(localStorage.getItem('reset_state_v7')).settings.hydrationTarget).toBe(2500);

    await user.click(screen.getByRole('button', { name: /user/i }));
    expect(screen.queryByText(/daily targets/i)).not.toBeInTheDocument();
  });

  it('returns to the original Moderate calories after switching plans from onboarding data', async () => {
    const user = userEvent.setup();

    render(<App />);
    await finishMetricOnboarding(user);
    await user.click(screen.getByRole('button', { name: /plan/i }));

    const originalModerate = JSON.parse(localStorage.getItem('reset_state_v7')).settings.calorieTarget;
    expect(originalModerate).toBe(1989);

    await switchPlan(user, 'Aggressive');
    expect(JSON.parse(localStorage.getItem('reset_state_v7')).settings.calorieTarget).toBe(1755);

    await switchPlan(user, 'Extreme');
    expect(JSON.parse(localStorage.getItem('reset_state_v7')).settings.calorieTarget).toBe(1521);

    await switchPlan(user, 'Moderate');
    const restored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(restored.settings.calorieTarget).toBe(originalModerate);
    expect(screen.getAllByText(String(originalModerate)).length).toBeGreaterThanOrEqual(2);
  });

  it('heals the exported compounded calorie plan when switching plans', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify(exportedBugState));

    render(<App />);
    await screen.findByRole('button', { name: /moderate/i }, { timeout: 2500 });

    expect(screen.getByText('19415')).toBeInTheDocument();
    await switchPlan(user, 'Moderate');

    const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
    expect(stored.healthPlan.maintenanceCalories).toBe(2375);
    expect(stored.healthPlan.deficitPercentage).toBe(0.15);
    expect(stored.settings.calorieTarget).toBe(2019);
    expect(screen.getAllByText('2019').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/23581|19415|25886/)).not.toBeInTheDocument();
    expectNoAbsurdCalorieText();
  });

  it('keeps displayed calories realistic after repeated plan switching', async () => {
    const user = userEvent.setup();
    localStorage.setItem('reset_state_v7', JSON.stringify({
      ...exportedBugState,
      healthPlan: {
        ...exportedBugState.healthPlan,
        maintenanceCalories: 2375,
        selectedDeficitLevel: 'moderate',
        deficitPercentage: 0.15,
        calorieTarget: 2019,
      },
      settings: { ...exportedBugState.settings, calorieTarget: 2019 },
    }));

    render(<App />);
    await screen.findByRole('button', { name: /aggressive/i }, { timeout: 2500 });

    const sequence = Array.from({ length: 30 }, (_, index) => ['Aggressive', 'Extreme', 'Moderate'][index % 3]);
    for (const label of sequence) {
      await switchPlan(user, label);
      const stored = JSON.parse(localStorage.getItem('reset_state_v7'));
      expect(stored.healthPlan.maintenanceCalories).toBe(2375);
      expect(stored.settings.calorieTarget).toBeGreaterThan(0);
      expect(stored.settings.calorieTarget).toBeLessThan(5000);
      expect(Number.isFinite(stored.settings.calorieTarget)).toBe(true);
      expectNoAbsurdCalorieText();
    }
  });
});
