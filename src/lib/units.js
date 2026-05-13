import { cmToFeetInches, kgToLb, lbToKg, round1 } from './calculations.js';
import { IMPERIAL_LIMITS, INPUT_LIMITS, rangeCopy, validNumber } from './validation.js';

export function preferredUnits(stateOrUnits) {
  const units = typeof stateOrUnits === 'string'
    ? stateOrUnits
    : stateOrUnits?.settings?.preferredUnits;
  return units === 'imperial' ? 'imperial' : 'metric';
}

export function weightUnit(stateOrUnits) {
  return preferredUnits(stateOrUnits) === 'imperial' ? 'lb' : 'kg';
}

export function displayWeightValue(weightKg, stateOrUnits) {
  const number = Number(weightKg);
  if (!Number.isFinite(number) || number <= 0) return null;
  return preferredUnits(stateOrUnits) === 'imperial' ? kgToLb(number) : round1(number);
}

export function formatWeight(weightKg, stateOrUnits, fallback = 'not set') {
  const value = displayWeightValue(weightKg, stateOrUnits);
  return value === null ? fallback : `${value.toFixed(1)}${weightUnit(stateOrUnits)}`;
}

export function formatWeightDelta(deltaKg, stateOrUnits) {
  const number = Number(deltaKg);
  if (!Number.isFinite(number)) return `0.0${weightUnit(stateOrUnits)}`;
  const value = preferredUnits(stateOrUnits) === 'imperial' ? round1(number * 2.2046226218) : round1(number);
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${weightUnit(stateOrUnits)}`;
}

export function weightInputPlaceholder(stateOrUnits) {
  return preferredUnits(stateOrUnits) === 'imperial' ? 'e.g. 210 lb' : 'e.g. 95 kg';
}

export function weightInputLimits(stateOrUnits) {
  if (preferredUnits(stateOrUnits) === 'imperial') {
    return { min: IMPERIAL_LIMITS.weightLb.min, max: IMPERIAL_LIMITS.weightLb.max, unit: 'lb' };
  }
  return { min: INPUT_LIMITS.weightKg.min, max: INPUT_LIMITS.weightKg.max, unit: 'kg' };
}

export function weightInputToKg(value, stateOrUnits) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return preferredUnits(stateOrUnits) === 'imperial' ? lbToKg(number) : round1(number);
}

export function validateWeightInput(value, stateOrUnits, label = 'Weight') {
  const limits = weightInputLimits(stateOrUnits);
  if (!validNumber(value, limits.min, limits.max)) {
    return rangeCopy(label, limits.min, limits.max, limits.unit);
  }
  return '';
}

export function formatHeight(heightCm, stateOrUnits) {
  const number = Number(heightCm);
  if (!Number.isFinite(number) || number <= 0) return 'height not set';
  if (preferredUnits(stateOrUnits) === 'imperial') {
    const { feet, inches } = cmToFeetInches(number);
    return `${feet}ft ${inches}in`;
  }
  return `${round1(number)}cm`;
}
