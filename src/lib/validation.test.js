import { describe, expect, it } from 'vitest';
import {
  hasProfileInput,
  rangeCopy,
  validInteger,
  validNumber,
  validateAdultProfile,
  validateWeightKg,
} from './validation.js';

const metricProfile = {
  preferredUnits: 'metric',
  age: '40',
  sex: 'female',
  heightCm: '170',
  startWeightKg: '100',
  goalWeightKg: '80',
};

describe('number validation', () => {
  it('validates bounded finite numbers and integers', () => {
    expect(validNumber('10.5', 1, 20)).toBe(true);
    expect(validNumber('', 1, 20)).toBe(false);
    expect(validNumber('nope', 1, 20)).toBe(false);
    expect(validInteger('10', 1, 20)).toBe(true);
    expect(validInteger('10.5', 1, 20)).toBe(false);
  });

  it('builds range copy and weight-specific errors', () => {
    expect(rangeCopy('Weight', 25, 300, 'kg')).toBe('Weight must be between 25 kg and 300 kg.');
    expect(validateWeightKg(100)).toBe('');
    expect(validateWeightKg(10, 'Current weight')).toBe('Current weight must be between 25 kg and 300 kg.');
  });
});

describe('profile validation', () => {
  it('detects no input, missing fields, and valid metric profiles', () => {
    expect(hasProfileInput({})).toBe(false);
    expect(validateAdultProfile({})).toBe('Enter your information to continue.');
    expect(validateAdultProfile({ preferredUnits: 'metric' })).toBe('Missing: age, sex, height, starting weight...');
    expect(validateAdultProfile(metricProfile)).toBe('');
  });

  it('validates adult age, sex, units, ranges, and goal direction', () => {
    expect(validateAdultProfile({ ...metricProfile, age: '17' })).toContain('under 18');
    expect(validateAdultProfile({ ...metricProfile, sex: 'bad' })).toBe('Choose a valid sex option.');
    expect(validateAdultProfile({ ...metricProfile, preferredUnits: 'bad' })).toBe('Add your units.');
    expect(validateAdultProfile({ ...metricProfile, heightCm: '50' })).toBe('Height must be between 91 cm and 275 cm.');
    expect(validateAdultProfile({ ...metricProfile, goalWeightKg: '110' })).toBe('Your goal weight should be lower than your starting weight for a weight loss plan.');
  });

  it('validates imperial profiles while using converted metric values', () => {
    expect(validateAdultProfile({
      preferredUnits: 'imperial',
      age: '40',
      sex: 'male',
      heightFt: '5',
      heightIn: '11',
      heightCm: '180.3',
      startWeightLb: '220',
      startWeightKg: '99.8',
      goalWeightLb: '180',
      goalWeightKg: '81.6',
    })).toBe('');
    expect(validateAdultProfile({ ...metricProfile, preferredUnits: 'imperial', heightFt: '2', startWeightLb: '220', goalWeightLb: '180' })).toBe('Height feet must be between 3 ft and 9 ft.');
  });
});
