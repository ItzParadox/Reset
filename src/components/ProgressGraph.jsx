import { useId, useMemo, useState } from 'react';
import { formatWeight } from '../lib/units.js';
import {
  buildProgressGraphData,
  progressDaysBetween,
  shortProgressDate,
  smoothProgressPath,
} from '../lib/progressGraph.js';

const VIEWBOX_WIDTH = 340;
const VIEWBOX_HEIGHT = 185;
const PAD = { top: 14, right: 14, bottom: 30, left: 46 };
const PLOT_WIDTH = VIEWBOX_WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = VIEWBOX_HEIGHT - PAD.top - PAD.bottom;
const PLOT_BOTTOM = PAD.top + PLOT_HEIGHT;

const RANGES = [
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
  { key: '1y', label: '1Y', days: 365 },
  { key: 'all', label: 'All', days: null },
];

function xFor(dateKey, firstDate, spanDays) {
  const offset = progressDaysBetween(firstDate, dateKey);
  return PAD.left + (offset / Math.max(1, spanDays)) * PLOT_WIDTH;
}

function yFor(weightKg, yMin, yMax) {
  return PAD.top + ((yMax - weightKg) / Math.max(0.01, yMax - yMin)) * PLOT_HEIGHT;
}

function toSvgPoint(point, firstDate, spanDays, yMin, yMax) {
  return {
    ...point,
    x: xFor(point.dateKey, firstDate, spanDays),
    y: yFor(point.weightKg, yMin, yMax),
  };
}

function gridTicks(yMin, yMax) {
  return [0, 0.5, 1].map((position) => {
    const weightKg = yMax - position * (yMax - yMin);
    return { weightKg, y: yFor(weightKg, yMin, yMax) };
  });
}

export default function ProgressGraph({ state, current, start, target, projection, units }) {
  const graphId = useId().replaceAll(':', '');
  const [range, setRange] = useState('all');
  const rangeDays = RANGES.find((option) => option.key === range)?.days ?? null;

  const chart = useMemo(
    () => buildProgressGraphData({ state, current, start, target, projection, rangeDays }),
    [state, current, start, target, projection, rangeDays],
  );

  const { actualPoints, futurePoint, yMin, yMax, firstDate, lastDate, hasProjection } = chart;
  const spanDays = progressDaysBetween(firstDate, lastDate);
  const actualSvgPoints = useMemo(
    () => actualPoints.map((point) => toSvgPoint(point, firstDate, spanDays, yMin, yMax)),
    [actualPoints, firstDate, spanDays, yMin, yMax],
  );
  const futureSvgPoint = futurePoint ? toSvgPoint(futurePoint, firstDate, spanDays, yMin, yMax) : null;
  const firstPoint = actualSvgPoints[0];
  const lastPoint = actualSvgPoints[actualSvgPoints.length - 1];
  const actualPath = smoothProgressPath(actualSvgPoints);
  const areaPath = actualPath && firstPoint && lastPoint
    ? `${actualPath} L ${lastPoint.x.toFixed(2)},${PLOT_BOTTOM} L ${firstPoint.x.toFixed(2)},${PLOT_BOTTOM} Z`
    : '';
  const projectionPath = lastPoint && futureSvgPoint
    ? `M ${lastPoint.x.toFixed(2)},${lastPoint.y.toFixed(2)} L ${futureSvgPoint.x.toFixed(2)},${futureSvgPoint.y.toFixed(2)}`
    : '';
  const projectionAreaPath = projectionPath && lastPoint && futureSvgPoint
    ? `M ${lastPoint.x.toFixed(2)},${lastPoint.y.toFixed(2)} L ${futureSvgPoint.x.toFixed(2)},${futureSvgPoint.y.toFixed(2)} L ${futureSvgPoint.x.toFixed(2)},${PLOT_BOTTOM} L ${lastPoint.x.toFixed(2)},${PLOT_BOTTOM} Z`
    : '';
  const ticks = gridTicks(yMin, yMax);
  const actualFillId = `pg-actual-fill-${graphId}`;
  const projectionFillId = `pg-projection-fill-${graphId}`;
  const projLineGradId = `pg-proj-line-${graphId}`;
  const currentGlowId = `pg-current-glow-${graphId}`;
  const goalGlowId = `pg-goal-glow-${graphId}`;
  const summary = hasProjection
    ? `Weight progress from ${formatWeight(start, units, 'unknown')} to ${formatWeight(current, units, 'unknown')}. Goal is ${formatWeight(target, units, 'unknown')}, estimated around ${projection?.label || 'unknown'}.`
    : `Weight progress from ${formatWeight(start, units, 'unknown')} to ${formatWeight(current, units, 'unknown')}.`;

  return (
    <div className="pg">
      <div className="pg-ranges" role="group" aria-label="Chart range">
        {RANGES.map((option) => (
          <button
            key={option.key}
            className={`pg-range${range === option.key ? ' active' : ''}`}
            type="button"
            onClick={() => setRange(option.key)}
            aria-pressed={range === option.key}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="pg-chart" role="img" aria-label={summary}>
        <svg
          className="pg-svg"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={actualFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id={projectionFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(216,255,90,0.13)" />
              <stop offset="100%" stopColor="rgba(216,255,90,0)" />
            </linearGradient>
            {lastPoint && futureSvgPoint ? (
              <linearGradient
                id={projLineGradId}
                gradientUnits="userSpaceOnUse"
                x1={lastPoint.x.toFixed(2)} y1={lastPoint.y.toFixed(2)}
                x2={futureSvgPoint.x.toFixed(2)} y2={futureSvgPoint.y.toFixed(2)}
              >
                <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
                <stop offset="100%" stopColor="rgba(216,255,90,0.95)" />
              </linearGradient>
            ) : null}
            <filter id={currentGlowId}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={goalGlowId}>
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {ticks.map((tick) => (
            <g key={tick.weightKg}>
              <line x1={PAD.left} y1={tick.y} x2={VIEWBOX_WIDTH - PAD.right} y2={tick.y} className="pg-grid" />
              <text x={PAD.left - 6} y={tick.y + 3.5} className="pg-axis-label">
                {formatWeight(tick.weightKg, units, '')}
              </text>
            </g>
          ))}

          {projectionAreaPath ? <path d={projectionAreaPath} fill={`url(#${projectionFillId})`} /> : null}
          {projectionPath ? (
            <path
              d={projectionPath}
              fill="none"
              stroke={lastPoint && futureSvgPoint ? `url(#${projLineGradId})` : 'rgba(216,255,90,0.85)'}
              strokeWidth="2.2"
              strokeDasharray="6 4"
              strokeLinecap="round"
              className="pg-projection-line"
            />
          ) : null}
          {areaPath ? <path d={areaPath} fill={`url(#${actualFillId})`} /> : null}
          {actualPath ? <path d={actualPath} className="pg-actual-line" /> : null}

          {futureSvgPoint ? (
            <circle cx={futureSvgPoint.x} cy={futureSvgPoint.y} r="4.5" className="pg-dot-goal" filter={`url(#${goalGlowId})`} />
          ) : null}
          {firstPoint && actualSvgPoints.length > 1 ? <circle cx={firstPoint.x} cy={firstPoint.y} r="3" className="pg-dot-start" /> : null}
          {lastPoint ? <circle cx={lastPoint.x} cy={lastPoint.y} r="5" className="pg-dot-current" filter={`url(#${currentGlowId})`} /> : null}

          {firstDate ? (
            <text x={PAD.left} y={VIEWBOX_HEIGHT - 6} className="pg-date-label">
              {shortProgressDate(firstDate)}
            </text>
          ) : null}
          {lastDate && lastDate !== firstDate ? (
            <text x={VIEWBOX_WIDTH - PAD.right} y={VIEWBOX_HEIGHT - 6} className="pg-date-label pg-date-end">
              {shortProgressDate(lastDate)}
            </text>
          ) : null}
        </svg>
      </div>

      {chart.projectionHiddenByRange ? (
        <p className="note pg-range-note">
          Projection is outside this window.{' '}
          <button type="button" className="pg-range-link" onClick={() => setRange('all')}>
            Switch to All
          </button>
        </p>
      ) : null}
    </div>
  );
}
