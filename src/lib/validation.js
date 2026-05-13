export const INPUT_LIMITS = Object.freeze({
  age: { min: 18, max: 120, label: 'Age' },
  heightCm: { min: 91, max: 275, label: 'Height' },
  weightKg: { min: 25, max: 300, label: 'Weight' },
  walkMinutes: { min: 1, max: 300, label: 'Movement target' },
});

export const IMPERIAL_LIMITS = Object.freeze({
  heightFt: { min: 3, max: 9 },
  heightIn: { min: 0, max: 11 },
  weightLb: { min: 55, max: 660 },
});

const SEX_OPTIONS = ['male', 'female', 'unspecified'];
const UNIT_OPTIONS = ['metric', 'imperial'];

export function validNumber(value, min, max) {
  if (value === '' || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

export function validInteger(value, min, max) {
  if (value === '' || value === null || value === undefined) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

export function rangeCopy(label, min, max, unit = '') {
  const suffix = unit ? ` ${unit}` : '';
  return `${label} must be between ${min}${suffix} and ${max}${suffix}.`;
}

export function validateAdultProfile(form = {}) {
  if (!hasProfileInput(form)) return 'Enter your information to continue.';

  const age = Number(form.age);
  if (form.age && Number.isFinite(age) && age < INPUT_LIMITS.age.min) {
    return "Reset is for adults. If you're under 18, use it with parent or guardian permission.";
  }

  const missing = [];
  if (!UNIT_OPTIONS.includes(form.preferredUnits)) missing.push('units');
  if (!form.age) missing.push('age');
  if (!form.sex) missing.push('sex');

  if (form.preferredUnits === 'imperial') {
    if (!form.heightFt && !form.heightIn) missing.push('height');
    if (!form.startWeightLb) missing.push('starting weight');
    if (!form.goalWeightLb) missing.push('goal weight');
  } else {
    if (!form.heightCm) missing.push('height');
    if (!form.startWeightKg) missing.push('starting weight');
    if (!form.goalWeightKg) missing.push('goal weight');
  }

  if (missing.length === 1) return `Add your ${missing[0]}.`;
  if (missing.length > 1) return `Missing: ${missing.slice(0, 4).join(', ')}${missing.length > 4 ? '...' : '.'}`;

  if (!validInteger(form.age, INPUT_LIMITS.age.min, INPUT_LIMITS.age.max)) return rangeCopy('Age', INPUT_LIMITS.age.min, INPUT_LIMITS.age.max);
  if (!SEX_OPTIONS.includes(form.sex)) return 'Choose a valid sex option.';
  if (!UNIT_OPTIONS.includes(form.preferredUnits)) return 'Choose Metric or Imperial units.';

  if (form.preferredUnits === 'imperial') {
    if (!validInteger(form.heightFt, IMPERIAL_LIMITS.heightFt.min, IMPERIAL_LIMITS.heightFt.max)) {
      return rangeCopy('Height feet', IMPERIAL_LIMITS.heightFt.min, IMPERIAL_LIMITS.heightFt.max, 'ft');
    }
    if (form.heightIn !== '' && !validNumber(form.heightIn, IMPERIAL_LIMITS.heightIn.min, IMPERIAL_LIMITS.heightIn.max)) {
      return rangeCopy('Height inches', IMPERIAL_LIMITS.heightIn.min, IMPERIAL_LIMITS.heightIn.max, 'in');
    }
    if (!validNumber(form.startWeightLb, IMPERIAL_LIMITS.weightLb.min, IMPERIAL_LIMITS.weightLb.max)) {
      return rangeCopy('Starting weight', IMPERIAL_LIMITS.weightLb.min, IMPERIAL_LIMITS.weightLb.max, 'lb');
    }
    if (!validNumber(form.goalWeightLb, IMPERIAL_LIMITS.weightLb.min, IMPERIAL_LIMITS.weightLb.max)) {
      return rangeCopy('Goal weight', IMPERIAL_LIMITS.weightLb.min, IMPERIAL_LIMITS.weightLb.max, 'lb');
    }
  }

  if (!validNumber(form.heightCm, INPUT_LIMITS.heightCm.min, INPUT_LIMITS.heightCm.max)) return rangeCopy('Height', INPUT_LIMITS.heightCm.min, INPUT_LIMITS.heightCm.max, 'cm');
  if (!validNumber(form.startWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max)) return rangeCopy('Starting weight', INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max, 'kg');
  if (!validNumber(form.goalWeightKg, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max)) return rangeCopy('Goal weight', INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max, 'kg');

  if (Number(form.goalWeightKg) >= Number(form.startWeightKg)) {
    return 'Your goal weight should be lower than your starting weight for a weight loss plan.';
  }

  return '';
}

export function hasProfileInput(form = {}) {
  return Boolean(
    form.preferredUnits ||
    form.age ||
    form.sex ||
    form.heightCm ||
    form.heightFt ||
    form.heightIn ||
    form.startWeightKg ||
    form.startWeightLb ||
    form.goalWeightKg ||
    form.goalWeightLb
  );
}

export function validateWeightKg(value, label = 'Weight') {
  if (!validNumber(value, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max)) {
    return rangeCopy(label, INPUT_LIMITS.weightKg.min, INPUT_LIMITS.weightKg.max, 'kg');
  }
  return '';
}
