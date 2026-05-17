export function parseProgressDate(value) {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function progressDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function progressDaysBetween(startKey, endKey) {
  const start = parseProgressDate(startKey);
  const end = parseProgressDate(endKey);
  if (!start || !end) return 0;
  return Math.round((end - start) / 86400000);
}

export function shortProgressDate(value) {
  const date = parseProgressDate(value);
  if (!date) return '';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function buildProgressGraphData({
  state,
  current,
  start,
  target,
  projection,
  rangeDays = null,
  today = new Date(),
}) {
  const logs = Array.isArray(state?.weightLogs) ? state.weightLogs : [];
  const todayKey = progressDateKey(today);

  let actualPoints = logs
    .map((log) => ({
      dateKey: log.loggedAt,
      weightKg: Number(log.weightKg ?? log.weight),
    }))
    .filter((point) => parseProgressDate(point.dateKey) && Number.isFinite(point.weightKg) && point.weightKg > 0)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  if (rangeDays !== null) {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - rangeDays);
    const cutoffKey = progressDateKey(cutoff);
    actualPoints = actualPoints.filter((point) => point.dateKey >= cutoffKey);
  }

  if (!actualPoints.length && Number.isFinite(start) && start > 0) {
    actualPoints.push({ dateKey: todayKey, weightKg: start });
  }

  if (Number.isFinite(current) && current > 0) {
    const latestPoint = actualPoints[actualPoints.length - 1];
    if (!latestPoint) {
      actualPoints.push({ dateKey: todayKey, weightKg: current });
    } else if (latestPoint.dateKey === todayKey) {
      actualPoints[actualPoints.length - 1] = { dateKey: todayKey, weightKg: current };
    } else if (Math.abs(latestPoint.weightKg - current) > 0.05) {
      actualPoints.push({ dateKey: todayKey, weightKg: current });
    }
  }

  const projectionDays = Number(projection?.days || 0);
  const projectionFitsRange = rangeDays === null || projectionDays <= rangeDays;
  const hasProjection = projectionFitsRange
    && projectionDays > 0
    && Number.isFinite(target)
    && target > 0
    && Number.isFinite(current)
    && current > target;

  let futurePoint = null;
  if (hasProjection) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + projectionDays);
    futurePoint = { dateKey: progressDateKey(futureDate), weightKg: target };
  }

  const includePlanBounds = rangeDays === null || hasProjection;
  const allWeights = [
    ...actualPoints.map((point) => point.weightKg),
    futurePoint?.weightKg,
    includePlanBounds && Number.isFinite(start) && start > 0 ? start : null,
    includePlanBounds && Number.isFinite(target) && target > 0 ? target : null,
  ].filter((value) => Number.isFinite(value) && value > 0);

  const rawMin = allWeights.length ? Math.min(...allWeights) : 0;
  const rawMax = allWeights.length ? Math.max(...allWeights) : 1;
  const spread = Math.max(1, rawMax - rawMin);
  const pad = Math.max(0.5, spread * 0.1);
  const yMin = rawMin - pad;
  const yMax = rawMax + pad;
  const firstDate = actualPoints[0]?.dateKey || todayKey;
  const lastDate = futurePoint?.dateKey || actualPoints[actualPoints.length - 1]?.dateKey || todayKey;

  return {
    actualPoints,
    futurePoint,
    yMin,
    yMax,
    firstDate,
    lastDate,
    hasProjection,
    weeklyLossKg: projection?.weeklyLossKg ?? null,
    projectionHiddenByRange: !hasProjection && projectionDays > 0 && rangeDays !== null && projectionDays > rangeDays,
  };
}

export function smoothProgressPath(points, tension = 0.3) {
  if (!Array.isArray(points) || !points.length) return '';
  if (points.length === 1) return `M ${formatPathNumber(points[0].x)} ${formatPathNumber(points[0].y)}`;
  if (points.length === 2) {
    return `M ${formatPathNumber(points[0].x)} ${formatPathNumber(points[0].y)} L ${formatPathNumber(points[1].x)} ${formatPathNumber(points[1].y)}`;
  }

  let path = `M ${formatPathNumber(points[0].x)} ${formatPathNumber(points[0].y)}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[Math.min(points.length - 1, index + 2)];
    const cp1x = current.x + (next.x - previous.x) * tension;
    const cp1y = current.y + (next.y - previous.y) * tension;
    const cp2x = next.x - (afterNext.x - current.x) * tension;
    const cp2y = next.y - (afterNext.y - current.y) * tension;
    path += ` C ${formatPathNumber(cp1x)},${formatPathNumber(cp1y)} ${formatPathNumber(cp2x)},${formatPathNumber(cp2y)} ${formatPathNumber(next.x)},${formatPathNumber(next.y)}`;
  }
  return path;
}

function formatPathNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '0';
}
