import { useId, useMemo, useState } from 'react';
import { formatWeight, formatWeightDelta } from '../lib/units.js';
import { goalProjection, weeklyChange } from '../lib/calculations.js';
import { currentWeight } from '../lib/storage.js';

const W = 340;
const H = 180;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;
const PB = PAD.top + PH;

const RANGES = [
  { key: '30',  label: '30D', days: 30 },
  { key: '90',  label: '90D', days: 90 },
  { key: '365', label: '1Y',  days: 365 },
  { key: 'all', label: 'All', days: null },
];

function dateToKey(date) {
  return date.toISOString().slice(0, 10);
}

function keyToDate(key) {
  return new Date(`${key}T00:00:00`);
}

function daysBetween(a, b) {
  return Math.round((keyToDate(b) - keyToDate(a)) / 86400000);
}

function formatAxisDate(key, days) {
  const d = keyToDate(key);
  if (!days || days > 180) return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function yFor(val, yMin, yMax) {
  return PAD.top + ((yMax - val) / Math.max(0.01, yMax - yMin)) * PH;
}

function xFor(key, firstKey, span) {
  const offset = daysBetween(firstKey, key);
  return PAD.left + (offset / Math.max(1, span)) * PW;
}

function gridTicks(yMin, yMax) {
  return [0, 0.33, 0.66, 1].map((t) => ({
    val: yMax - t * (yMax - yMin),
    y: yFor(yMax - t * (yMax - yMin), yMin, yMax),
  }));
}

function StatCard({ label, value, delta, hint, accent }) {
  const hasD = delta !== null && delta !== undefined && Number.isFinite(delta);
  const down = hasD && delta < 0;
  const up   = hasD && delta > 0;
  return (
    <div className="wcStatCard card">
      <div className="label">{label}</div>
      <div className={`wcStatVal${accent ? ' wcStatAccent' : ''}`}>{value}</div>
      {hasD ? (
        <div className={`wcDelta ${down ? 'wcDeltaDown' : up ? 'wcDeltaUp' : 'wcDeltaFlat'}`}>
          {down ? '↓' : up ? '↑' : '→'} {formatWeightDelta(delta, '').replace('+', '').replace('-', '')}
          {hint ? <span className="wcDeltaHint"> {hint}</span> : null}
        </div>
      ) : hint ? (
        <div className="wcDelta wcDeltaFlat"><span className="wcDeltaHint">{hint}</span></div>
      ) : null}
    </div>
  );
}

export default function WeightChart({ state, units }) {
  const svgId = useId().replace(/:/g, '');
  const gradId = `wc-grad-${svgId}`;
  const [rangeKey, setRangeKey] = useState('all');
  const rangeDays = RANGES.find((r) => r.key === rangeKey)?.days ?? null;

  const allLogs = useMemo(() => {
    const raw = Array.isArray(state?.weightLogs) ? state.weightLogs : [];
    return [...raw]
      .filter((l) => l.loggedAt && Number.isFinite(Number(l.weightKg)))
      .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  }, [state?.weightLogs]);

  const logs = useMemo(() => {
    const filtered = rangeDays ? (() => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - rangeDays);
      const cutoffKey = dateToKey(cutoff);
      return allLogs.filter((l) => l.loggedAt >= cutoffKey);
    })() : allLogs;

    // One reading per day — keep the latest for each date
    const byDay = new Map();
    for (const l of filtered) {
      const existing = byDay.get(l.loggedAt);
      if (!existing || l.createdAt > existing.createdAt) byDay.set(l.loggedAt, l);
    }
    return [...byDay.values()].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  }, [allLogs, rangeDays]);

  const points = useMemo(() => logs.map((l) => ({
    key: l.loggedAt,
    val: Number(l.weightKg),
  })), [logs]);

  const goalWeight  = Number(state?.onboardingProfile?.goalWeightKg || 0);
  const startWeight = Number(state?.onboardingProfile?.startWeightKg || 0);
  const current     = currentWeight(state) || startWeight;
  const toGoal      = goalWeight && current ? Math.max(0, current - goalWeight) : null;
  const totalLost   = startWeight && current ? Math.max(0, startWeight - current) : 0;
  const weekly      = weeklyChange(state?.weightLogs || []);
  const projection  = goalProjection(state);

  const firstKey = points[0]?.key;
  const lastKey  = points.at(-1)?.key;
  const span     = firstKey && lastKey ? daysBetween(firstKey, lastKey) : 1;

  // Base the Y domain on actual logged weights only — don't let a distant goal
  // collapse the chart. If the goal is close, include it naturally.
  const logVals = points.map((p) => p.val);
  const rawMin = logVals.length ? Math.min(...logVals) : 0;
  const rawMax = logVals.length ? Math.max(...logVals) : 100;
  const spread = Math.max(1, rawMax - rawMin);
  const pad = Math.max(1, spread * 0.12);
  let yMin = rawMin - pad;
  let yMax = rawMax + pad;
  // Only extend range to include goal if it's within 30% of the current spread
  if (goalWeight > 0 && goalWeight < rawMin && (rawMin - goalWeight) < spread * 1.3) {
    yMin = Math.min(yMin, goalWeight - pad);
  }

  const svgPoints = points.map((p) => ({
    ...p,
    x: xFor(p.key, firstKey, span),
    y: yFor(p.val, yMin, yMax),
  }));

  const linePath = svgPoints.length > 1
    ? svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
    : '';
  const areaPath  = linePath && svgPoints.length > 1
    ? `${linePath} L ${svgPoints.at(-1).x.toFixed(2)},${PB} L ${svgPoints[0].x.toFixed(2)},${PB} Z`
    : '';

  const ticks = gridTicks(yMin, yMax);

  // X-axis label positions — first and last only
  const xLabels = [];
  if (firstKey) xLabels.push({ key: firstKey, x: PAD.left, anchor: 'start' });
  if (lastKey && lastKey !== firstKey) xLabels.push({ key: lastKey, x: W - PAD.right, anchor: 'end' });

  // Footer delta
  const windowDelta = points.length >= 2 ? points.at(-1).val - points[0].val : null;

  // Goal reference line Y
  const goalY = goalWeight > 0 && goalWeight >= yMin && goalWeight <= yMax
    ? yFor(goalWeight, yMin, yMax) : null;

  return (
    <div className="wcWrap">

      {/* Stat cards */}
      <div className="wcStats">
        <StatCard
          label="Current weight"
          value={formatWeight(current, units, '–')}
          delta={totalLost > 0 ? -totalLost : null}
          hint={totalLost > 0 ? 'from start' : null}
          accent
        />
        <StatCard
          label="Remaining"
          value={toGoal !== null && toGoal > 0 ? formatWeight(toGoal, units) : toGoal === 0 ? 'Reached' : '–'}
          hint={goalWeight ? `goal is ${formatWeight(goalWeight, units)}` : 'set in settings'}
        />
        <StatCard
          label="This week"
          value={weekly !== null ? formatWeightDelta(weekly, units) : '–'}
          delta={weekly}
          hint="7-day avg"
        />
        <StatCard
          label="Projected arrival"
          value={projection?.label || '–'}
          hint={projection ? (projection.source === 'logs' ? 'from trend' : 'from plan') : 'need more data'}
        />
      </div>

      {/* Chart card */}
      <div className="wcChartCard card">
        <div className="wcChartHead">
          <div className="label">Weight over time</div>
          <div className="pg-ranges" role="group" aria-label="Chart range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`pg-range${rangeKey === r.key ? ' active' : ''}`}
                onClick={() => setRangeKey(r.key)}
                aria-pressed={rangeKey === r.key}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {points.length < 2 ? (
          <div className="wcEmpty">
            <p className="note">Log at least 2 weigh-ins to see your chart.</p>
          </div>
        ) : (
          <div className="wcChartArea">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              className="wcSvg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#d8ff5a" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#d8ff5a" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid lines + Y labels */}
              {ticks.map((t) => (
                <g key={t.val}>
                  <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} className="pg-grid" />
                  <text x={PAD.left - 5} y={t.y + 3.5} className="pg-axis-label">
                    {formatWeight(t.val, units, '')}
                  </text>
                </g>
              ))}

              {/* Goal reference line */}
              {goalY !== null && (
                <g>
                  <line
                    x1={PAD.left} y1={goalY}
                    x2={W - PAD.right} y2={goalY}
                    stroke="#d8ff5a"
                    strokeWidth="1"
                    strokeDasharray="5 4"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={W - PAD.right - 2} y={goalY - 3}
                    fontSize="8" fontWeight="800"
                    fill="rgba(216,255,90,0.6)"
                    textAnchor="end"
                    letterSpacing="0.08em"
                  >
                    GOAL
                  </text>
                </g>
              )}

              {/* Area fill */}
              {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

              {/* Line */}
              {linePath && <path d={linePath} className="pg-actual-line" />}

              {/* Dots — first and last only */}
              {svgPoints.length > 1 && (
                <circle cx={svgPoints[0].x} cy={svgPoints[0].y} r="3" className="pg-dot-start" />
              )}
              <circle cx={svgPoints.at(-1).x} cy={svgPoints.at(-1).y} r="5" className="pg-dot-current" />

              {/* X-axis date labels */}
              {xLabels.map((l) => (
                <text
                  key={l.key}
                  x={l.x}
                  y={H - 5}
                  className="pg-date-label"
                  textAnchor={l.anchor}
                >
                  {formatAxisDate(l.key, rangeDays)}
                </text>
              ))}
            </svg>
          </div>
        )}

        {/* Footer */}
        <div className="wcChartFooter">
          <div className="wcFooterDelta">
            {windowDelta !== null ? (
              <>
                <span className={windowDelta < 0 ? 'wcDeltaDown' : windowDelta > 0 ? 'wcDeltaUp' : 'wcDeltaFlat'}>
                  {windowDelta < 0 ? '↓' : windowDelta > 0 ? '↑' : '→'}{' '}
                  {formatWeightDelta(windowDelta, units).replace('+', '')}
                </span>
                <span className="wcFooterHint">vs first day in this window</span>
              </>
            ) : (
              <span className="wcFooterHint">Log entries to see trend</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
