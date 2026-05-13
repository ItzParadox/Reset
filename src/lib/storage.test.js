import { describe, expect, it, vi } from 'vitest';
import {
  APP_BUILD,
  DEFAULT_STATE,
  STORAGE_KEY,
  STORAGE_VERSION,
  clearLocalState,
  cloneDefaultState,
  completeOnboardingState,
  createDailyLog,
  createMedicationLog,
  createWeightLog,
  currentWeight,
  formatDisplayDate,
  loadState,
  localDateKey,
  normalisePossibleDate,
  normaliseState,
  queueMutation,
  saveState,
  structuredCloneSafe,
  parseLocalDate,
} from './storage.js';

describe('storage constants and default state', () => {
  it('exposes the current storage version and clones defaults safely', () => {
    expect(STORAGE_VERSION).toBe(7);
    expect(APP_BUILD).toBe('phase-4k-validation-loading');
    const cloned = cloneDefaultState();
    cloned.profile.displayName = 'Changed';
    expect(DEFAULT_STATE.profile.displayName).toBe('');
  });
});

describe('date helpers', () => {
  it('formats and parses local date keys', () => {
    const date = new Date(2026, 4, 13);
    expect(localDateKey(date)).toBe('2026-05-13');
    expect(formatDisplayDate(date)).toBe('13/05/2026');
    expect(parseLocalDate('2026-05-13')).toEqual(date);
    expect(parseLocalDate('bad')).toBeInstanceOf(Date);
    expect(normalisePossibleDate('2026-05-13')).toBe('2026-05-13');
    expect(normalisePossibleDate('13/05/2026')).toBe('2026-05-13');
  });
});

describe('log factories', () => {
  it('creates normalized weight, daily, and medication logs', () => {
    vi.setSystemTime(new Date(2026, 4, 13, 10));
    expect(createWeightLog(100.04, '2026-05-13', null, 'weight-1')).toMatchObject({
      id: 'weight-1',
      weightKg: 100,
      loggedAt: '2026-05-13',
      displayDate: '13/05/2026',
      createdAt: '2026-05-13T09:00:00.000Z',
    });
    expect(createDailyLog('2026-05-13')).toMatchObject({
      logDate: '2026-05-13',
      movementDone: false,
      waterMl: 0,
    });
    expect(createMedicationLog('2026-05-13', 'wegovy')).toMatchObject({
      takenAt: '2026-05-13',
      medicationName: 'wegovy',
      taken: false,
    });
    vi.useRealTimers();
  });
});

describe('state normalization and persistence', () => {
  it('normalizes malformed state into bounded app state', () => {
    const state = normaliseState({
      profile: { onboardingComplete: 'yes' },
      onboardingProfile: {
        age: '44',
        sex: 'female',
        heightCm: '170.04',
        startWeightKg: '100.04',
        goalWeightKg: '80',
        activityLevel: 'bad',
        medicationName: 'wegovy',
      },
      healthPlan: { selectedDeficitLevel: 'bad', calorieTarget: '1800.9' },
      settings: { hydrationTarget: '2', waterStepMl: '5000' },
      weightLogs: [
        { id: 'old', weightKg: 101, loggedAt: '2026-05-12', createdAt: '2026-05-12T10:00:00.000Z' },
        { weightKg: 10, loggedAt: '2026-05-11' },
      ],
      dailyLogs: { '13/05/2026': { walk: true, hydrationMl: 500, notes: 'ok' } },
      medLogs: { '13/05/2026': { medicationName: 'wegovy', taken: true } },
      ui: { activeTab: 'bad', timer: { durationSeconds: 1, remainingSeconds: 99999 } },
      sync: { pending: [{ mutation: { table: 'x', action: 'upsert', payloadKey: '1' } }, { mutation: { table: 'x', action: 'upsert', payloadKey: '1' } }] },
    });

    expect(state.version).toBe(STORAGE_VERSION);
    expect(state.profile.onboardingComplete).toBe(false);
    expect(state.onboardingProfile).toMatchObject({
      age: 44,
      sex: 'female',
      heightCm: 170,
      startWeightKg: 100,
      currentWeightKg: 100,
      activityLevel: 'sedentary',
      usesWeightLossMedication: true,
    });
    expect(state.settings.hydrationTarget).toBe(2000);
    expect(state.settings.waterStepMl).toBe(2000);
    expect(state.weightLogs).toHaveLength(1);
    expect(state.dailyLogs['2026-05-13']).toMatchObject({ movementDone: true, waterMl: 500 });
    expect(state.medicationLogs['2026-05-13']).toMatchObject({ medicationName: 'wegovy', taken: true });
    expect(state.ui.activeTab).toBe('home');
    expect(state.ui.timer).toEqual({ durationSeconds: 0, remainingSeconds: 0 });
    expect(state.sync.pending).toHaveLength(1);
  });

  it('saves, loads, migrates, queues, clears, and reads current weight', () => {
    vi.setSystemTime(new Date(2026, 4, 13, 10));
    const state = normaliseState({
      onboardingProfile: { startWeightKg: 100, currentWeightKg: 99 },
      weightLogs: [{ weightKg: 98, loggedAt: '2026-05-13', createdAt: '2026-05-13T09:00:00.000Z' }],
    });
    saveState(state);
    expect(loadState().version).toBe(STORAGE_VERSION);
    expect(currentWeight(loadState())).toBe(98);

    const queued = queueMutation(state, { table: 'daily_logs', action: 'upsert', payloadKey: '2026-05-13' });
    const deduped = queueMutation(queued, { table: 'daily_logs', action: 'upsert', payloadKey: '2026-05-13' });
    expect(deduped.sync.pending).toHaveLength(1);

    clearLocalState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    vi.useRealTimers();
  });
});

describe('onboarding state factory and cloning', () => {
  it('creates a complete state with plan, settings, timer, and first weight log', () => {
    vi.setSystemTime(new Date(2026, 4, 13, 10));
    const state = completeOnboardingState({
      displayName: 'Ada',
      preferredUnits: 'metric',
      age: '40',
      sex: 'female',
      heightCm: '170',
      startWeightKg: '100',
      currentWeightKg: '100',
      goalWeightKg: '80',
      activityLevel: 'light',
      walkMinutes: '20',
    }, 'moderate', false);

    expect(state.profile).toMatchObject({ displayName: 'Ada', onboardingComplete: true });
    expect(state.settings).toMatchObject({ preferredUnits: 'metric', calorieTarget: 1989, walkMinutes: 20 });
    expect(state.ui.timer).toEqual({ durationSeconds: 1200, remainingSeconds: 1200 });
    expect(state.weightLogs).toHaveLength(1);
    vi.useRealTimers();
  });

  it('deep clones when structuredClone is available', () => {
    const original = { nested: { value: 1 } };
    const copy = structuredCloneSafe(original);
    copy.nested.value = 2;
    expect(original.nested.value).toBe(1);
  });
});
