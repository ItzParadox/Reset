export const ACTIVITY_LEVELS = {
  sedentary: { label: 'Sedentary', detail: 'Mostly sitting, little planned exercise.', factor: 1.2 },
  light: { label: 'Lightly active', detail: 'Light movement or training 1–3 days a week.', factor: 1.375 },
  moderate: { label: 'Moderately active', detail: 'Regular movement or training 3–5 days a week.', factor: 1.55 },
  very: { label: 'Very active', detail: 'Hard training, active job, or high daily steps.', factor: 1.725 },
};

export const DEFICIT_OPTIONS = {
  moderate: {
    label: 'Moderate',
    percentage: 0.15,
    detail: 'A steadier deficit designed to be easier to sustain.',
    warning: '',
  },
  aggressive: {
    label: 'Aggressive',
    percentage: 0.25,
    detail: 'Faster progress, but hunger and adherence can get harder.',
    warning: '',
  },
  extreme: {
    label: 'Extreme',
    percentage: 0.35,
    detail: 'Fastest option. Best used with extra caution and medical guidance.',
    warning: 'Consult a doctor or qualified clinician before using this target, especially if you use medication or have health conditions.',
  },
};

export const MEDICATION_OPTIONS = [
  { value: 'none', label: 'No medication' },
  { value: 'mounjaro', label: 'Mounjaro / tirzepatide' },
  { value: 'wegovy', label: 'Wegovy / semaglutide' },
  { value: 'ozempic', label: 'Ozempic / semaglutide' },
  { value: 'saxenda', label: 'Saxenda / liraglutide' },
  { value: 'other', label: 'Other' },
];

export function kgToLb(kg) {
  if (kg === '' || kg === null || kg === undefined) return '';
  const number = Number(kg);
  return Number.isFinite(number) ? round1(number * 2.2046226218) : '';
}

export function lbToKg(lb) {
  if (lb === '' || lb === null || lb === undefined) return '';
  const number = Number(lb);
  return Number.isFinite(number) ? round1(number / 2.2046226218) : '';
}

export function cmToFeetInches(cm) {
  const number = Number(cm);
  if (!Number.isFinite(number) || number <= 0) return { feet: '', inches: '' };
  const totalInches = Math.round(number / 2.54);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet, inches) {
  const ft = Number(feet) || 0;
  const inch = Number(inches) || 0;
  const total = (ft * 12) + inch;
  return total > 0 ? round1(total * 2.54) : '';
}

export function healthyWeightRangeKg(heightCm) {
  const heightM = Number(heightCm) / 100;
  if (!Number.isFinite(heightM) || heightM <= 0) return null;
  return {
    min: round1(18.5 * heightM * heightM),
    max: round1(24.9 * heightM * heightM),
  };
}

export function bmiVisualStyle(bmi) {
  const value = Number(bmi);
  if (!Number.isFinite(value)) return { '--bmi-color': '#737373', '--bmi-bg': 'rgba(115,115,115,.06)' };
  if (value < 18.5) return { '--bmi-color': '#7ebcff', '--bmi-bg': 'rgba(126,188,255,.08)' };
  if (value < 25) return { '--bmi-color': '#d8ff5a', '--bmi-bg': 'rgba(216,255,90,.08)' };
  if (value < 30) return { '--bmi-color': '#ffca61', '--bmi-bg': 'rgba(255,202,97,.085)' };
  const intensity = Math.min(1, Math.max(0, (value - 30) / 20));
  const red = Math.round(255);
  const green = Math.round(112 - 30 * intensity);
  const blue = Math.round(96 - 48 * intensity);
  return { '--bmi-color': `rgb(${red}, ${green}, ${blue})`, '--bmi-bg': `rgba(${red}, ${green}, ${blue}, ${0.11 + intensity * 0.08})` };
}

export function bmiClassName(category) {
  const clean = String(category || '').toLowerCase();
  if (clean.includes('healthy')) return 'bmiHealthy';
  if (clean.includes('overweight')) return 'bmiOver';
  if (clean.includes('obese')) return 'bmiObese';
  if (clean.includes('under')) return 'bmiUnder';
  return 'bmiUnknown';
}

export function formatDoseMg(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /mg$/i.test(text) ? text : `${text} mg`;
}

export function mealStructureForProfile(state) {
  const profile = state?.onboardingProfile || {};
  const plan = state?.healthPlan || {};
  const current = Number(profile.currentWeightKg || profile.startWeightKg || 0);
  const target = Number(plan.calorieTarget || 0);
  const bmi = Number(plan.bmi || 0);
  const onMedication = profile.usesWeightLossMedication && profile.medicationName !== 'none';

  const items = [];
  if (current >= 160 || bmi >= 45) {
    items.push({ title: 'Ultra-simple structure', body: 'Use the same two or three safe meals repeatedly. Reduce decisions before chasing variety.' });
    items.push({ title: 'Joint-friendly movement', body: 'Start with comfortable minutes, low impact, and a repeatable daily floor. No hero sessions needed.' });
  } else if (current >= 130 || bmi >= 40) {
    items.push({ title: 'Low-friction meals', body: 'Protein first, controlled carbs, vegetables, and one measured sauce. Keep it boring enough to repeat.' });
    items.push({ title: 'Hunger control', body: 'Plan a filling meal before evening cravings. Fibre, fluids, and protein do more than willpower.' });
  } else if (current >= 100 || bmi >= 30) {
    items.push({ title: 'Protein anchor', body: 'Build most meals around protein first, then add carbs and fats deliberately rather than by habit.' });
    items.push({ title: 'Default lunch', body: 'Use a repeatable lunch so calories are predictable without thinking about it every day.' });
  } else if (bmi >= 25) {
    items.push({ title: 'Tighter tracking', body: 'Progress may be slower here. Portions, steps, protein, and weekly averages matter more.' });
    items.push({ title: 'Flexible structure', body: 'Use planned flexibility rather than random snacks. Keep the weekly trend in control.' });
  } else {
    items.push({ title: 'Maintenance mindset', body: 'Focus on consistency, strength, sleep, and avoiding rebound. The goal is keeping the win.' });
    items.push({ title: 'Performance check', body: 'Keep enough food quality in the plan so energy, mood, and training do not collapse.' });
  }

  if (target && target < 1400) {
    items.push({ title: 'Low target caution', body: 'This target is very low. Make every meal count: protein, fibre, fluids, and no wasted liquid calories.' });
  } else if (target && target < 1800) {
    items.push({ title: 'Compact day', body: `For ${target} kcal/day: two protein-led meals, one planned snack, and low-calorie drinks.` });
  } else if (target) {
    items.push({ title: 'Calorie structure', body: `For ${target} kcal/day: one lighter meal, one larger meal, and a planned snack works well.` });
  }

  if (onMedication) {
    items.push({ title: 'Medication-aware note', body: 'Smaller meals may feel easier. Log appetite, nausea, dose, and side effects so patterns become obvious.' });
  } else {
    items.push({ title: 'Emergency option', body: 'Have one low-effort backup meal ready before hunger decides for you.' });
  }

  return items.slice(0, 4);
}

export function calculateBmi(weightKg, heightCm) {
  const weight = Number(weightKg);
  const heightM = Number(heightCm) / 100;
  if (!Number.isFinite(weight) || !Number.isFinite(heightM) || weight <= 0 || heightM <= 0) return null;
  return round1(weight / (heightM * heightM));
}

export function bmiCategory(bmi) {
  const value = Number(bmi);
  if (!Number.isFinite(value)) return 'Unknown';
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy weight';
  if (value < 30) return 'Overweight';
  return 'Obese';
}

export function calculateBmr(profile = {}) {
  const { sex, heightCm, age } = profile;
  const weight = Number(profile.weightKg ?? profile.currentWeightKg ?? profile.startWeightKg);
  const height = Number(heightCm);
  const years = Number(age);
  if (![weight, height, years].every((value) => Number.isFinite(value) && value > 0)) return null;

  const base = 10 * weight + 6.25 * height - 5 * years;
  if (sex === 'female') return Math.round(base - 161);
  if (sex === 'male') return Math.round(base + 5);

  // Neutral fallback when the user does not want to specify sex for estimation.
  return Math.round(((base - 161) + (base + 5)) / 2);
}

export function calculateMaintenance(profile) {
  const bmr = calculateBmr(profile);
  if (!bmr) return null;
  const factor = ACTIVITY_LEVELS[profile.activityLevel]?.factor || ACTIVITY_LEVELS.sedentary.factor;
  return Math.round(bmr * factor);
}

export function calculatePlan(profile, selectedDeficitLevel = 'moderate', warningAcknowledged = false) {
  const bmi = calculateBmi(profile.currentWeightKg || profile.startWeightKg, profile.heightCm);
  const bmrCalories = calculateBmr(profile);
  const maintenanceCalories = calculateMaintenance(profile);
  const selected = DEFICIT_OPTIONS[selectedDeficitLevel] || DEFICIT_OPTIONS.moderate;
  const calorieTarget = maintenanceCalories ? Math.round(maintenanceCalories * (1 - selected.percentage)) : null;

  return {
    bmi,
    bmiCategory: bmiCategory(bmi),
    bmrCalories,
    maintenanceCalories,
    selectedDeficitLevel,
    deficitPercentage: selected.percentage,
    calorieTarget,
    warningAcknowledged: selectedDeficitLevel === 'extreme' ? warningAcknowledged === true : false,
    calculatedAt: new Date().toISOString(),
  };
}

export function planOptions(profile) {
  const maintenance = calculateMaintenance(profile);
  return Object.entries(DEFICIT_OPTIONS).map(([key, option]) => ({
    key,
    ...option,
    calorieTarget: maintenance ? Math.round(maintenance * (1 - option.percentage)) : null,
  }));
}

export function estimateTargetDate(logs, targetWeightKg) {
  if (!Array.isArray(logs) || logs.length < 2 || !Number.isFinite(Number(targetWeightKg))) return null;
  const sorted = [...logs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = Math.max(1, daysBetween(first.loggedAt, last.loggedAt));
  const lost = Number(first.weightKg ?? first.weight) - Number(last.weightKg ?? last.weight);
  const perDay = lost / days;
  if (!Number.isFinite(perDay) || perDay <= 0) return null;
  const remaining = Number(last.weightKg ?? last.weight) - Number(targetWeightKg);
  if (remaining <= 0) return 'Reached';
  const projectedDays = Math.ceil(remaining / perDay);
  if (projectedDays > 3650) return null;
  const date = new Date();
  date.setDate(date.getDate() + projectedDays);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function estimatePlanGoalDate(state = {}) {
  const profile = state.onboardingProfile || {};
  const settings = state.settings || {};
  const plan = state.healthPlan || {};
  const current = Number(profile.currentWeightKg || profile.startWeightKg || 0);
  const target = Number(profile.goalWeightKg || 0);
  const maintenance = Number(plan.maintenanceCalories || 0);
  const calories = Number(settings.calorieTarget || plan.calorieTarget || 0);
  const dailyDeficit = maintenance - calories;
  const remainingKg = current - target;

  if (![current, target, maintenance, calories, dailyDeficit, remainingKg].every(Number.isFinite)) return null;
  if (remainingKg <= 0 || dailyDeficit <= 0) return null;

  const estimatedDays = Math.ceil((remainingKg * 7700) / dailyDeficit);
  if (!Number.isFinite(estimatedDays) || estimatedDays <= 0 || estimatedDays > 3650) return null;

  const date = new Date();
  date.setDate(date.getDate() + estimatedDays);
  return {
    date,
    label: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    days: estimatedDays,
    weeklyLossKg: round1((dailyDeficit * 7) / 7700),
  };
}

export function weeklyChange(logs) {
  if (!Array.isArray(logs) || logs.length < 2) return null;
  const sorted = [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const latest = sorted[0];
  const latestDate = parseDate(latest.loggedAt);
  if (!latestDate) return null;
  // Require at least 14 days of real data before showing a trend estimate.
  const comparison = sorted.find((log) => daysBetween(log.loggedAt, latest.loggedAt) >= 14);
  if (!comparison) return null;
  const days = Math.max(1, daysBetween(comparison.loggedAt, latest.loggedAt));
  const change = Number(latest.weightKg ?? latest.weight) - Number(comparison.weightKg ?? comparison.weight);
  return round1((change / days) * 7);
}

export function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}

function parseDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return 0;
  return Math.round((b - a) / 86400000);
}
