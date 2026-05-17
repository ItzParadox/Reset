import { describe, expect, it } from 'vitest';
import {
  buildProgressGraphData,
  progressDaysBetween,
  progressDateKey,
  smoothProgressPath,
} from './progressGraph.js';

const today = new Date(2026, 4, 17);

function stateWithLogs(weightLogs = []) {
  return { weightLogs };
}

describe('progress graph helpers', () => {
  it('formats local date keys and counts days', () => {
    expect(progressDateKey(today)).toBe('2026-05-17');
    expect(progressDaysBetween('2026-05-01', '2026-05-17')).toBe(16);
    expect(progressDaysBetween('bad', '2026-05-17')).toBe(0);
  });

  it('builds actual points and a future projection for all-time view', () => {
    const chart = buildProgressGraphData({
      state: stateWithLogs([
        { loggedAt: '2026-04-01', weightKg: 110 },
        { loggedAt: '2026-05-01', weightKg: 106 },
      ]),
      current: 104,
      start: 110,
      target: 95,
      projection: { days: 120, weeklyLossKg: 0.5 },
      today,
    });

    expect(chart.actualPoints).toEqual([
      { dateKey: '2026-04-01', weightKg: 110 },
      { dateKey: '2026-05-01', weightKg: 106 },
      { dateKey: '2026-05-17', weightKg: 104 },
    ]);
    expect(chart.futurePoint).toEqual({ dateKey: '2026-09-14', weightKg: 95 });
    expect(chart.hasProjection).toBe(true);
    expect(chart.firstDate).toBe('2026-04-01');
    expect(chart.lastDate).toBe('2026-09-14');
  });

  it('keeps short ranges focused when the projection is outside the selected window', () => {
    const chart = buildProgressGraphData({
      state: stateWithLogs([
        { loggedAt: '2026-01-01', weightKg: 115 },
        { loggedAt: '2026-05-10', weightKg: 105 },
      ]),
      current: 104,
      start: 115,
      target: 90,
      projection: { days: 180, weeklyLossKg: 0.6 },
      rangeDays: 30,
      today,
    });

    expect(chart.actualPoints).toEqual([
      { dateKey: '2026-05-10', weightKg: 105 },
      { dateKey: '2026-05-17', weightKg: 104 },
    ]);
    expect(chart.futurePoint).toBeNull();
    expect(chart.projectionHiddenByRange).toBe(true);
    expect(chart.lastDate).toBe('2026-05-17');
    expect(chart.yMax).toBeLessThan(107);
    expect(chart.yMin).toBeGreaterThan(102);
  });

  it('falls back to a current point when there are no logs in range', () => {
    const chart = buildProgressGraphData({
      state: stateWithLogs([{ loggedAt: '2026-01-01', weightKg: 120 }]),
      current: 108,
      start: 120,
      target: 95,
      projection: null,
      rangeDays: 30,
      today,
    });

    expect(chart.actualPoints).toEqual([{ dateKey: '2026-05-17', weightKg: 108 }]);
    expect(chart.hasProjection).toBe(false);
  });

  it('creates stable path strings for one, two, and multiple points', () => {
    expect(smoothProgressPath([])).toBe('');
    expect(smoothProgressPath([{ x: 1, y: 2 }])).toBe('M 1.00 2.00');
    expect(smoothProgressPath([{ x: 1, y: 2 }, { x: 3, y: 4 }])).toBe('M 1.00 2.00 L 3.00 4.00');
    expect(smoothProgressPath([{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 1 }])).toContain(' C ');
  });
});
