import { describe, expect, it } from 'vitest';
import {
  displayWeightValue,
  formatHeight,
  formatWeight,
  formatWeightDelta,
  validateWeightInput,
  weightInputLimits,
  weightInputPlaceholder,
  weightInputToKg,
  weightUnit,
} from './units.js';

describe('preferred unit helpers', () => {
  it('formats metric and imperial weights from internal kg values', () => {
    expect(weightUnit('metric')).toBe('kg');
    expect(weightUnit('imperial')).toBe('lb');
    expect(displayWeightValue(95, 'metric')).toBe(95);
    expect(displayWeightValue(95, 'imperial')).toBe(209.4);
    expect(formatWeight(95, 'metric')).toBe('95.0kg');
    expect(formatWeight(95, 'imperial')).toBe('209.4lb');
    expect(formatWeight('', 'imperial', 'not logged')).toBe('not logged');
    expect(formatWeightDelta(-2, 'imperial')).toBe('-4.4lb');
  });

  it('parses input at the UI boundary without double-converting stored kg', () => {
    expect(weightInputPlaceholder('metric')).toBe('e.g. 95 kg');
    expect(weightInputPlaceholder('imperial')).toBe('e.g. 210 lb');
    expect(weightInputLimits('imperial')).toEqual({ min: 55, max: 660, unit: 'lb' });
    expect(weightInputToKg('210', 'imperial')).toBe(95.3);
    expect(weightInputToKg('95', 'metric')).toBe(95);
    expect(validateWeightInput('210', 'imperial')).toBe('');
    expect(validateWeightInput('20', 'imperial')).toBe('Weight must be between 55 lb and 660 lb.');
  });

  it('formats profile height in the selected unit system', () => {
    expect(formatHeight(152.4, 'imperial')).toBe('5ft 0in');
    expect(formatHeight(170, 'metric')).toBe('170cm');
  });
});
