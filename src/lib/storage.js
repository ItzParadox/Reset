import { calculatePlan } from './calculations.js';
import { INPUT_LIMITS, validNumber } from './validation.js';

export const STORAGE_KEY = 'reset_state_v7';
export const STORAGE_VERSION = 7;
export const APP_BUILD = 'phase-4k-validation-loading';

const LEGACY_KEYS = [
  'life_reset_state_v2',
  'life_reset_state_v1',
  'reset_current_weight',
  'reset_weight_logs',
  'reset_calories',
  'reset_state_v4',
  'reset_state_v5',
  'reset_state_v6',
];

export const DEFAULT_STATE = Object.freeze({
  version: STORAGE_VERSION,
  profile: {
    userId: null,
    email: '',
    displayName: '',
    onboardingComplete: false,
    createdAt: null,
    updatedAt: null,
  },
  onboardingProfile: {
    age: '',
    sex: '',
    heightCm: '',
    startWeightKg: '',
    currentWeightKg: '',
    goalWeightKg: '',
    activityLevel: 'sedentary',
    usesWeightLossMedication: false,
    medicationName: 'none',
    medicationOther: '',
    medicationDose: '',
    injectionDay: '',
  },
  healthPlan: {
    bmi: null,
    bmiCategory: 'Unknown',
    bmrCalories: null,
    maintenanceCalories: null,
    selectedDeficitLevel: 'moderate',
    deficitPercentage: 0.15,
    calorieTarget: null,
    warningAcknowledged: false,
    calculatedAt: null,
  },
  settings: {
    preferredUnits: '',
    calorieTarget: null,
    walkMinutes: null,
    hydrationTarget: 2000,
    waterStepMl: 250,
    proteinTarget: 'with 2 meals',
    updatedAt: null,
  },
  weightLogs: [],
  dailyLogs: {},
  medicationLogs: {},
  ui: {
    activeTab: 'home',
    timer: {
      durationSeconds: 0,
      remainingSeconds: 0,
    },
  },
  sync: {
    mode: 'local-only',
    pending: [],
    lastSyncedAt: null,
  },
});

export function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

export function loadState() {
  const saved = safeJson(localStorage.getItem(STORAGE_KEY), null);
  if (saved && saved.version === STORAGE_VERSION) return normaliseState(saved);

  const previousReset = safeJson(localStorage.getItem('reset_state_v6'), null) || safeJson(localStorage.getItem('reset_state_v5'), null) || safeJson(localStorage.getItem('reset_state_v4'), null);
  if (previousReset) {
    const migrated = normaliseState(previousReset);
    saveState(migrated);
    return migrated;
  }

  const v2 = safeJson(localStorage.getItem('life_reset_state_v2'), null);
  const migrated = v2 ? migrateV2State(v2) : migrateOriginalState();
  saveState(migrated);
  return migrated;
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normaliseState(state)));
}

export function clearLocalState() {
  localStorage.removeItem(STORAGE_KEY);
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function queueMutation(state, mutation) {
  const next = structuredCloneSafe(state);
  const queuedAt = new Date().toISOString();
  const fingerprint = mutationFingerprint(mutation);

  next.sync.pending = [
    { id: cryptoSafeId('pending'), mutation, queuedAt },
    ...(Array.isArray(next.sync.pending) ? next.sync.pending : []).filter((item) => mutationFingerprint(item?.mutation) !== fingerprint),
  ].slice(0, 300);

  return next;
}

export function normaliseState(input = {}) {
  const base = cloneDefaultState();
  const merged = {
    ...base,
    ...input,
    profile: { ...base.profile, ...(input.profile || {}) },
    onboardingProfile: { ...base.onboardingProfile, ...(input.onboardingProfile || {}) },
    healthPlan: { ...base.healthPlan, ...(input.healthPlan || {}) },
    settings: { ...base.settings, ...(input.settings || {}) },
    ui: { ...base.ui, ...(input.ui || {}), timer: { ...base.ui.timer, ...(input.ui?.timer || {}) } },
    sync: { ...base.sync, ...(input.sync || {}) },
  };

  merged.version = STORAGE_VERSION;
  merged.profile.onboardingComplete = merged.profile.onboardingComplete === true;
  merged.onboardingProfile = normaliseOnboardingProfile(merged.onboardingProfile);
  merged.healthPlan = normaliseHealthPlan(merged.healthPlan);
  merged.settings = normaliseSettings(merged.settings, merged.healthPlan);
  merged.weightLogs = normaliseWeightLogs(input.weightLogs || []);
  merged.dailyLogs = normaliseDailyLogs(input.dailyLogs || {});
  merged.medicationLogs = normaliseMedicationLogs(input.medicationLogs || input.medLogs || {});
  merged.sync.pending = dedupePendingMutations(Array.isArray(merged.sync.pending) ? merged.sync.pending : []).slice(0, 300);
  merged.ui.activeTab = ['home', 'today', 'water', 'weight', 'food', 'meds', 'settings'].includes(merged.ui.activeTab)
    ? merged.ui.activeTab
    : 'home';
  merged.ui.timer.durationSeconds = boundedInt(merged.ui.timer.durationSeconds, 60, 36000, base.ui.timer.durationSeconds);
  merged.ui.timer.remainingSeconds = boundedInt(merged.ui.timer.remainingSeconds, 0, 36000, base.ui.timer.remainingSeconds);

  return merged;
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(date = new Date()) {
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function parseLocalDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

export function normalisePossibleDate(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
  }
  return localDateKey();
}

export function createWeightLog(weightKg, loggedAt = localDateKey(), displayDate = null, id = null, createdAt = null) {
  const cleanDate = normalisePossibleDate(loggedAt);
  const cleanWeight = round1(weightKg);
  return {
    id: id || cryptoSafeId('weight'),
    weightKg: cleanWeight,
    loggedAt: cleanDate,
    displayDate: displayDate || formatDisplayDate(parseLocalDate(cleanDate)),
    createdAt: createdAt || new Date().toISOString(),
  };
}

export function createDailyLog(logDate = localDateKey()) {
  return {
    logDate,
    movementDone: false,
    calorieTargetHit: false,
    proteinDone: false,
    hydrationDone: false,
    waterMl: 0,
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

export function createMedicationLog(date = localDateKey(), medicationName = 'none') {
  return {
    takenAt: date,
    medicationName,
    dose: '',
    injectionSite: '',
    appetiteLevel: '',
    nauseaLevel: '',
    sideEffects: '',
    taken: false,
    updatedAt: new Date().toISOString(),
  };
}

export function currentWeight(state) {
  if (state.weightLogs.length) return Number([...state.weightLogs].sort((a, b) => String(b.loggedAt).localeCompare(String(a.loggedAt)) || String(b.createdAt).localeCompare(String(a.createdAt)))[0].weightKg);
  return Number(state.onboardingProfile.currentWeightKg || state.onboardingProfile.startWeightKg || 0);
}

export function completeOnboardingState(input, selectedDeficitLevel, warningAcknowledged) {
  const now = new Date().toISOString();
  const profile = normaliseOnboardingProfile(input);
  const plan = calculatePlan(profile, selectedDeficitLevel, warningAcknowledged);
  const next = cloneDefaultState();
  next.profile = {
    ...next.profile,
    displayName: input.displayName || '',
    onboardingComplete: true,
    createdAt: now,
    updatedAt: now,
  };
  next.onboardingProfile = profile;
  next.healthPlan = plan;
  next.settings.calorieTarget = plan.calorieTarget;
  next.settings.preferredUnits = ['metric', 'imperial'].includes(input.preferredUnits) ? input.preferredUnits : 'metric';
  next.settings.walkMinutes = cleanNullableInt(input.walkMinutes);
  if (next.settings.walkMinutes) {
    next.ui.timer.durationSeconds = next.settings.walkMinutes * 60;
    next.ui.timer.remainingSeconds = next.ui.timer.durationSeconds;
  }
  next.settings.updatedAt = now;
  next.weightLogs = [createWeightLog(profile.currentWeightKg || profile.startWeightKg)];
  next.ui.activeTab = 'home';
  return normaliseState(next);
}

export function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function migrateV2State(v2) {
  const next = cloneDefaultState();
  const now = new Date().toISOString();
  const startWeight = Number(v2.settings?.startWeight || 142);
  const targetWeight = Number(v2.settings?.targetWeight || 100);
  const current = Array.isArray(v2.weightLogs) && v2.weightLogs.length
    ? Number(v2.weightLogs[0].weightKg || v2.weightLogs[0].weight || startWeight)
    : startWeight;

  next.profile = {
    ...next.profile,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  };
  next.onboardingProfile = {
    ...next.onboardingProfile,
    startWeightKg: startWeight,
    currentWeightKg: current,
    goalWeightKg: targetWeight,
    activityLevel: 'sedentary',
    injectionDay: v2.settings?.injectionDay || 'Friday',
  };
  next.settings = {
    ...next.settings,
    calorieTarget: Number(v2.settings?.calories || v2.settings?.calorieTarget || 1800),
    walkMinutes: Number(v2.settings?.walkMinutes || 20),
    updatedAt: now,
  };
  next.weightLogs = normaliseWeightLogs(v2.weightLogs || []);
  next.dailyLogs = migrateDailyLogs(v2.dailyLogs || {});
  next.medicationLogs = normaliseMedicationLogs(v2.medLogs || {});
  next.ui = { ...next.ui, ...(v2.ui || {}), activeTab: 'home' };
  return normaliseState(next);
}

function migrateOriginalState() {
  const next = cloneDefaultState();
  const legacyWeight = Number(localStorage.getItem('reset_current_weight'));
  const legacyLogs = safeJson(localStorage.getItem('reset_weight_logs'), []);
  const legacyCalories = Number.parseInt(localStorage.getItem('reset_calories'), 10);

  if (Array.isArray(legacyLogs) && legacyLogs.length) {
    next.weightLogs = legacyLogs
      .filter((log) => Number.isFinite(Number(log.weight)))
      .map((log) => createWeightLog(log.weight, normalisePossibleDate(log.date), log.date));
  } else if (Number.isFinite(legacyWeight) && legacyWeight > 0) {
    next.weightLogs = [createWeightLog(legacyWeight)];
  }

  if (Number.isFinite(legacyCalories) && legacyCalories >= 500 && legacyCalories <= 5000) {
    next.settings.calorieTarget = legacyCalories;
  }

  return normaliseState(next);
}

function normaliseOnboardingProfile(profile = {}) {
  const medicationName = String(profile.medicationName || 'none');
  const usesMedication = profile.usesWeightLossMedication === true || medicationName !== 'none';
  return {
    age: cleanOptionalInt(profile.age, INPUT_LIMITS.age.min, INPUT_LIMITS.age.max),
    sex: ['male', 'female', 'unspecified'].includes(profile.sex) ? profile.sex : '',
    heightCm: cleanOptionalNumber(profile.heightCm, INPUT_LIMITS.heightCm.min, INPUT_LIMITS.heightCm.max),
    startWeightKg: cleanOptionalNumber(profile.startWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max),
    currentWeightKg: cleanOptionalNumber(profile.currentWeightKg || profile.startWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max),
    goalWeightKg: cleanOptionalNumber(profile.goalWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max),
    activityLevel: ['sedentary', 'light', 'moderate', 'very'].includes(profile.activityLevel) ? profile.activityLevel : 'sedentary',
    usesWeightLossMedication: usesMedication,
    medicationName: usesMedication ? medicationName : 'none',
    medicationOther: typeof profile.medicationOther === 'string' ? profile.medicationOther.trim() : '',
    medicationDose: typeof profile.medicationDose === 'string' ? profile.medicationDose.trim() : '',
    injectionDay: typeof profile.injectionDay === 'string' ? profile.injectionDay : '',
  };
}

function normaliseHealthPlan(plan = {}) {
  return {
    bmi: cleanNullableNumber(plan.bmi),
    bmiCategory: typeof plan.bmiCategory === 'string' ? plan.bmiCategory : 'Unknown',
    bmrCalories: cleanNullableInt(plan.bmrCalories),
    maintenanceCalories: cleanNullableInt(plan.maintenanceCalories),
    selectedDeficitLevel: ['moderate', 'aggressive', 'extreme'].includes(plan.selectedDeficitLevel) ? plan.selectedDeficitLevel : 'moderate',
    deficitPercentage: cleanNullableNumber(plan.deficitPercentage) ?? 0.15,
    calorieTarget: cleanNullableInt(plan.calorieTarget),
    warningAcknowledged: plan.warningAcknowledged === true,
    calculatedAt: plan.calculatedAt || null,
  };
}

function normaliseSettings(settings = {}, plan = {}) {
  return {
    preferredUnits: ['metric', 'imperial'].includes(settings.preferredUnits) ? settings.preferredUnits : '',
    calorieTarget: cleanNullableInt(settings.calorieTarget) ?? cleanNullableInt(plan.calorieTarget),
    walkMinutes: cleanNullableInt(settings.walkMinutes),
    hydrationTarget: normaliseHydrationTarget(settings.hydrationTarget),
    waterStepMl: normaliseWaterStep(settings.waterStepMl),
    proteinTarget: typeof settings.proteinTarget === 'string' ? settings.proteinTarget : 'with 2 meals',
    updatedAt: settings.updatedAt || null,
  };
}


function normaliseHydrationTarget(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number <= 0) return 2000;
  // Earlier builds briefly stored hydration as litres, for example 2 instead of 2000 ml.
  if (number > 0 && number <= 10) return number * 1000;
  return Math.min(Math.max(number, 250), 10000);
}

function normaliseWaterStep(value) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number <= 0) return 250;
  return Math.min(Math.max(number, 50), 2000);
}

function normaliseWeightLogs(logs) {
  return Array.isArray(logs)
    ? logs
        .filter((log) => validNumber(log.weightKg ?? log.weight, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max))
        .map((log) => createWeightLog(log.weightKg ?? log.weight, log.loggedAt || log.date, log.displayDate, log.id, log.createdAt))
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 300)
    : [];
}

function normaliseDailyLogs(logs) {
  const result = {};
  Object.entries(logs || {}).forEach(([date, value]) => {
    const key = normalisePossibleDate(date);
    result[key] = {
      logDate: key,
      movementDone: value.movementDone === true || value.walk === true,
      calorieTargetHit: value.calorieTargetHit === true || value.calories === true,
      proteinDone: value.proteinDone === true || value.protein === true,
      hydrationDone: value.hydrationDone === true || value.drinks === true,
      waterMl: Math.min(Math.max(Number.parseInt(value.waterMl ?? value.hydrationMl ?? 0, 10) || 0, 0), 20000),
      notes: typeof value.notes === 'string' ? value.notes : '',
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  });
  return result;
}

function migrateDailyLogs(logs) {
  return normaliseDailyLogs(logs);
}

function normaliseMedicationLogs(logs) {
  const result = {};
  Object.entries(logs || {}).forEach(([date, value]) => {
    const key = normalisePossibleDate(value.takenAt || value.injectionDate || date);
    result[key] = {
      takenAt: key,
      medicationName: typeof value.medicationName === 'string' ? value.medicationName : 'none',
      dose: typeof value.dose === 'string' ? value.dose : '',
      injectionSite: typeof value.injectionSite === 'string' ? value.injectionSite : '',
      appetiteLevel: typeof value.appetiteLevel === 'string' ? value.appetiteLevel : '',
      nauseaLevel: typeof value.nauseaLevel === 'string' ? value.nauseaLevel : '',
      sideEffects: typeof value.sideEffects === 'string' ? value.sideEffects : '',
      taken: value.taken === true,
      updatedAt: value.updatedAt || new Date().toISOString(),
    };
  });
  return result;
}

function dedupePendingMutations(items) {
  const seen = new Set();
  const result = [];
  items.forEach((item) => {
    const fingerprint = mutationFingerprint(item?.mutation);
    if (seen.has(fingerprint)) return;
    seen.add(fingerprint);
    result.push(item);
  });
  return result;
}

function mutationFingerprint(mutation) {
  if (!mutation || typeof mutation !== 'object') return 'empty';
  const table = mutation.table || 'unknown';
  const action = mutation.action || 'unknown';
  const payloadKey = mutation.payloadKey || mutation.payload?.id || mutation.payload?.user_id || 'singleton';
  return `${table}:${action}:${payloadKey}`;
}

function safeJson(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function cryptoSafeId(prefix) {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function cleanOptionalNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return '';
  return round1(number);
}

function cleanOptionalInt(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < min || number > max) return '';
  return number;
}

function cleanNullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? round1(number) : null;
}

function cleanNullableInt(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : null;
}

function boundedInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function round1(value) {
  return Math.round(Number(value) * 10) / 10;
}
