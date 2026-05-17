import { describe, expect, it, vi } from 'vitest';
import {
  bmiCategory,
  bmiClassName,
  bmiVisualStyle,
  calculateBmi,
  calculateBmr,
  calculateMaintenance,
  calculatePlan,
  calculatePlanFeedback,
  cmToFeetInches,
  estimatePlanGoalDate,
  estimateTargetDate,
  feetInchesToCm,
  formatDoseMg,
  goalProjection,
  healthyWeightRangeKg,
  kgToLb,
  lbToKg,
  mealStructureForProfile,
  planOptions,
  round1,
  weeklyChange,
} from './calculations.js';

const profile = {
  age: 40,
  sex: 'female',
  heightCm: 170,
  startWeightKg: 100,
  currentWeightKg: 100,
  goalWeightKg: 80,
  activityLevel: 'light',
};

const exportedBugProfile = {
  age: 18,
  sex: 'male',
  heightCm: 152.4,
  startWeightKg: 111.1,
  currentWeightKg: 111.1,
  goalWeightKg: 80.7,
  activityLevel: 'sedentary',
};

describe('unit conversion helpers', () => {
  it('converts between metric and imperial weights', () => {
    expect(kgToLb(100)).toBe(220.5);
    expect(lbToKg(220.5)).toBe(100);
    expect(kgToLb('')).toBe('');
    expect(lbToKg('nope')).toBe('');
  });

  it('converts between centimeters and feet/inches', () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
    expect(cmToFeetInches(0)).toEqual({ feet: '', inches: '' });
    expect(feetInchesToCm(5, 11)).toBe(180.3);
    expect(feetInchesToCm('', '')).toBe('');
  });
});

describe('BMI helpers', () => {
  it('calculates BMI, category, range, styles, and class names', () => {
    expect(calculateBmi(80, 180)).toBe(24.7);
    expect(calculateBmi(0, 180)).toBeNull();
    expect(bmiCategory(18)).toBe('Underweight');
    expect(bmiCategory(22)).toBe('Healthy weight');
    expect(bmiCategory(27)).toBe('Overweight');
    expect(bmiCategory(31)).toBe('Obese');
    expect(bmiCategory('bad')).toBe('Unknown');
    expect(healthyWeightRangeKg(180)).toEqual({ min: 59.9, max: 80.7 });
    expect(healthyWeightRangeKg('bad')).toBeNull();
    expect(bmiClassName('Healthy weight')).toBe('bmiHealthy');
    expect(bmiClassName('Overweight')).toBe('bmiOver');
    expect(bmiClassName('Obese')).toBe('bmiObese');
    expect(bmiClassName('Underweight')).toBe('bmiUnder');
    expect(bmiClassName('')).toBe('bmiUnknown');
    expect(bmiVisualStyle(35)['--bmi-color']).toBe('rgb(255, 105, 84)');
    expect(bmiVisualStyle('bad')['--bmi-color']).toBe('#737373');
  });
});

describe('calorie plan helpers', () => {
  it('calculates BMR, maintenance calories, plan options, and selected plans', () => {
    expect(calculateBmr(profile)).toBe(1702);
    expect(calculateBmr({ ...profile, sex: 'male' })).toBe(1868);
    expect(calculateBmr({ ...profile, sex: 'unspecified' })).toBe(1785);
    expect(calculateBmr({})).toBeNull();
    expect(calculateMaintenance(profile)).toBe(2340);

    expect(planOptions(profile).map((option) => option.calorieTarget)).toEqual([1989, 1755, 1521]);
    expect(calculatePlan(profile, 'aggressive')).toMatchObject({
      bmi: 34.6,
      bmiCategory: 'Obese',
      bmrCalories: 1702,
      maintenanceCalories: 2340,
      selectedDeficitLevel: 'aggressive',
      deficitPercentage: 0.25,
      calorieTarget: 1755,
      warningAcknowledged: false,
    });
    expect(calculatePlan(profile, 'extreme', true).warningAcknowledged).toBe(true);
  });

  it('keeps plan switching idempotent for the exported bug profile', () => {
    const expectedMaintenance = calculateMaintenance(exportedBugProfile);
    const expectedTargets = {
      moderate: Math.round(expectedMaintenance * 0.85),
      aggressive: Math.round(expectedMaintenance * 0.75),
      extreme: Math.round(expectedMaintenance * 0.65),
    };

    expect(expectedMaintenance).toBe(2375);
    expect(planOptions(exportedBugProfile).map((option) => [option.key, option.calorieTarget])).toEqual([
      ['moderate', expectedTargets.moderate],
      ['aggressive', expectedTargets.aggressive],
      ['extreme', expectedTargets.extreme],
    ]);

    const sequence = [
      'moderate',
      'aggressive',
      'extreme',
      'moderate',
      'aggressive',
      'moderate',
      'extreme',
      'moderate',
    ];

    const results = sequence.map((level) => calculatePlan(exportedBugProfile, level).calorieTarget);
    expect(results).toEqual(sequence.map((level) => expectedTargets[level]));
    expect(results.filter((target, index) => sequence[index] === 'moderate')).toEqual([
      expectedTargets.moderate,
      expectedTargets.moderate,
      expectedTargets.moderate,
      expectedTargets.moderate,
    ]);
  });

  it('does not compound targets across repeated direct calculations', () => {
    const sequence = Array.from({ length: 50 }, (_, index) => ['moderate', 'aggressive', 'extreme'][index % 3]);
    const targets = sequence.map((level) => calculatePlan(exportedBugProfile, level).calorieTarget);

    expect(new Set(targets)).toEqual(new Set([2019, 1781, 1544]));
    targets.forEach((target) => {
      expect(Number.isFinite(target)).toBe(true);
      expect(target).toBeGreaterThan(0);
      expect(target).toBeLessThan(5000);
    });
  });
});

describe('projection helpers', () => {
  it('estimates target dates from logs and ignores unusable trends', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(estimateTargetDate([
      { loggedAt: '2026-01-01', weightKg: 100 },
      { loggedAt: '2026-01-11', weightKg: 95 },
    ], 90)).toBe('11 Jan 2026');
    expect(estimateTargetDate([
      { loggedAt: '2026-01-01', weightKg: 95 },
      { loggedAt: '2026-01-11', weightKg: 95 },
    ], 90)).toBeNull();
    expect(estimateTargetDate([{ loggedAt: '2026-01-01', weightKg: 95 }], 90)).toBeNull();
    vi.useRealTimers();
  });

  it('estimates plan goal dates and weekly trends', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    expect(estimatePlanGoalDate({
      onboardingProfile: { currentWeightKg: 100, startWeightKg: 100, goalWeightKg: 90 },
      healthPlan: { maintenanceCalories: 2500, calorieTarget: 2000 },
      settings: {},
    })).toMatchObject({ label: '04 Jun 2026', days: 154, weeklyLossKg: 0.5 });
    expect(estimatePlanGoalDate({})).toBeNull();
    expect(weeklyChange([
      { loggedAt: '2026-01-01', weightKg: 100 },
      { loggedAt: '2026-01-15', weightKg: 98 },
    ])).toBe(-1);
    expect(weeklyChange([{ loggedAt: '2026-01-15', weightKg: 98 }])).toBeNull();
    vi.useRealTimers();
  });

  it('adjusts plan projections after enough logged trend data exists', () => {
    vi.setSystemTime(new Date(2026, 2, 1));
    const state = {
      onboardingProfile: { currentWeightKg: 98, startWeightKg: 100, goalWeightKg: 90 },
      healthPlan: { maintenanceCalories: 2500, calorieTarget: 2000 },
      settings: { calorieTarget: 2000 },
      weightLogs: [
        { loggedAt: '2026-01-01', weightKg: 100, createdAt: '2026-01-01T09:00:00.000Z' },
        { loggedAt: '2026-01-15', weightKg: 99.5, createdAt: '2026-01-15T09:00:00.000Z' },
        { loggedAt: '2026-02-01', weightKg: 99, createdAt: '2026-02-01T09:00:00.000Z' },
        { loggedAt: '2026-02-15', weightKg: 98.5, createdAt: '2026-02-15T09:00:00.000Z' },
        { loggedAt: '2026-02-26', weightKg: 98, createdAt: '2026-02-26T09:00:00.000Z' },
      ],
    };

    const feedback = calculatePlanFeedback(state);
    const projection = estimatePlanGoalDate(state);

    expect(feedback).toMatchObject({
      status: 'slower',
      actualWeeklyChangeKg: -0.2,
      plannedWeeklyLossKg: 0.5,
    });
    expect(projection.feedback.status).toBe('slower');
    expect(projection.weeklyLossKg).toBeLessThan(projection.plannedWeeklyLossKg);
    expect(projection.days).toBeGreaterThan(124);
    vi.useRealTimers();
  });

  it('uses the latest logged weight for the shared goal projection', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    const state = {
      onboardingProfile: { currentWeightKg: 100, startWeightKg: 100, goalWeightKg: 90 },
      healthPlan: { maintenanceCalories: 2500, calorieTarget: 2000 },
      settings: { calorieTarget: 2000 },
      weightLogs: [
        { loggedAt: '2025-12-01', weightKg: 100, createdAt: '2025-12-01T09:00:00.000Z' },
        { loggedAt: '2025-12-15', weightKg: 104, createdAt: '2025-12-15T09:00:00.000Z' },
      ],
    };

    expect(estimatePlanGoalDate(state)).toMatchObject({ label: '05 Aug 2026', days: 216 });
    expect(goalProjection(state)).toMatchObject({
      label: '05 Aug 2026',
      source: 'plan',
      days: 216,
    });

    const fasterPlan = {
      ...state,
      healthPlan: { ...state.healthPlan, calorieTarget: 1875 },
      settings: { calorieTarget: 1875 },
    };
    expect(goalProjection(fasterPlan)).toMatchObject({ label: '23 Jun 2026', source: 'plan' });
    vi.useRealTimers();
  });

  it('prefers the active plan projection so plan changes update the shared date', () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    const state = {
      onboardingProfile: { currentWeightKg: 96, startWeightKg: 100, goalWeightKg: 90 },
      healthPlan: { maintenanceCalories: 2500, calorieTarget: 2000 },
      settings: { calorieTarget: 2000 },
      weightLogs: [
        { loggedAt: '2025-12-01', weightKg: 100, createdAt: '2025-12-01T09:00:00.000Z' },
        { loggedAt: '2025-12-15', weightKg: 96, createdAt: '2025-12-15T09:00:00.000Z' },
      ],
    };

    expect(estimateTargetDate(state.weightLogs, 90)).toBe('22 Jan 2026');
    expect(goalProjection(state)).toMatchObject({ label: '04 Apr 2026', source: 'plan' });
    expect(goalProjection({
      ...state,
      healthPlan: { ...state.healthPlan, calorieTarget: 1875 },
      settings: { calorieTarget: 1875 },
    })).toMatchObject({ label: '16 Mar 2026', source: 'plan' });
    vi.useRealTimers();
  });
});

describe('misc calculation helpers', () => {
  it('formats dose text and profile-specific meal guidance', () => {
    expect(formatDoseMg('2.5')).toBe('2.5 mg');
    expect(formatDoseMg('2.5 mg')).toBe('2.5 mg');
    expect(formatDoseMg('')).toBe('');
    expect(mealStructureForProfile({
      onboardingProfile: { currentWeightKg: 165, usesWeightLossMedication: true, medicationName: 'wegovy' },
      healthPlan: { bmi: 46, calorieTarget: 1300 },
    })).toHaveLength(4);
  });

  it('rounds to one decimal place', () => {
    expect(round1(1.25)).toBe(1.3);
  });
});
