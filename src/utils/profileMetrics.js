import { generateBezierPoints, getAnchors } from './bezier';

const SEGMENTS_PER_CURVE = 80;

/**
 * Returns raw geometry from the profile curve for use by applyDimensionTargets.
 * points: generated curve points; shoulderIdx is index into points.
 * shoulderSegmentIndex: which Bezier segment (anchor pair) contains the shoulder.
 */
export function getProfileGeometry(controlPoints) {
  if (!controlPoints || controlPoints.length < 3) return null;
  const points = generateBezierPoints(controlPoints, SEGMENTS_PER_CURVE, true);
  if (points.length < 4) return null;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });

  const diameter = 2 * maxX;
  const height = maxY - minY;
  const rimOuterStartX = 0.6 * maxX;

  let shoulderIdx = -1;
  let maxSlope = -1;
  for (let i = 1; i < points.length - 1; i++) {
    if (points[i].x < rimOuterStartX) continue;
    const dx = points[i + 1].x - points[i - 1].x;
    const dy = points[i + 1].y - points[i - 1].y;
    const slope = Math.sqrt(dx * dx + dy * dy) < 1e-6 ? 0 : Math.abs(dy / dx);
    if (slope > maxSlope) {
      maxSlope = slope;
      shoulderIdx = i;
    }
  }
  if (shoulderIdx < 0) {
    const outerIdx = points.findIndex(p => p.x >= rimOuterStartX);
    shoulderIdx = outerIdx >= 0 ? outerIdx : points.length - 1;
  }

  const shoulderX = points[shoulderIdx].x;
  const shoulderY = points[shoulderIdx].y;
  const rimWidth = maxX - shoulderX;
  const insideRimDiameter = 2 * shoulderX;
  const rimPoints = points.filter(p => p.x >= shoulderX);
  const rimMinY = rimPoints.length ? Math.min(...rimPoints.map(p => p.y)) : minY;
  const rimMaxY = rimPoints.length ? Math.max(...rimPoints.map(p => p.y)) : maxY;
  const rimDepth = rimMaxY - rimMinY;

  const tol = 1e-4;
  const plhPoint = points.find(p => Math.abs(p.x - maxX) < tol);
  const partingLineHeight = plhPoint != null ? plhPoint.y : null;

  let noseRadius = null;
  const noseIndices = points.map((p, i) => (Math.abs(p.x - maxX) < tol ? i : -1)).filter(i => i >= 0);
  if (noseIndices.length > 0) {
    const idx = noseIndices[0];
    if (idx > 0 && idx < points.length - 1) {
      const p0 = points[idx - 1], p1 = points[idx], p2 = points[idx + 1];
      const dx = (p2.x - p0.x) / 2, dy = (p2.y - p0.y) / 2;
      const ddx = p2.x - 2 * p1.x + p0.x, ddy = p2.y - 2 * p1.y + p0.y;
      const denom = Math.pow(dx * dx + dy * dy, 1.5) || 1e-10;
      const kappa = (dx * ddy - dy * ddx) / denom;
      if (Math.abs(kappa) > 1e-6) noseRadius = 1 / Math.abs(kappa);
    }
  }
  if (noseRadius != null && (noseRadius > 500 || noseRadius < 0.01)) noseRadius = null;

  let domeRadius = null;
  const topPoints = points.filter(p => p.x <= shoulderX && p.x >= minX);
  if (topPoints.length >= 3) {
    const apex = topPoints.reduce((best, p) => p.y > best.y ? p : best, topPoints[0]);
    const apexIdx = points.findIndex(p => p === apex);
    if (apexIdx > 0 && apexIdx < points.length - 1) {
      const p0 = points[apexIdx - 1], p1 = points[apexIdx], p2 = points[apexIdx + 1];
      const dx = (p2.x - p0.x) / 2, dy = (p2.y - p0.y) / 2;
      const ddx = p2.x - 2 * p1.x + p0.x, ddy = p2.y - 2 * p1.y + p0.y;
      const denom = Math.pow(dx * dx + dy * dy, 1.5) || 1e-10;
      const kappa = (dx * ddy - dy * ddx) / denom;
      if (Math.abs(kappa) > 1e-6) domeRadius = 1 / Math.abs(kappa);
    }
  }
  if (domeRadius != null && (domeRadius > 1000 || domeRadius < 0.01)) domeRadius = null;

  let shoulderSlantDeg = null;
  if (shoulderIdx > 0 && shoulderIdx < points.length - 1) {
    const dx = points[shoulderIdx + 1].x - points[shoulderIdx - 1].x;
    const dy = points[shoulderIdx + 1].y - points[shoulderIdx - 1].y;
    shoulderSlantDeg = (Math.atan2(dy, dx) * 180 / Math.PI);
  }

  const anchors = getAnchors(controlPoints);
  const pointsPerSegment = SEGMENTS_PER_CURVE + 1;
  const shoulderSegmentIndex = Math.min(
    Math.floor(shoulderIdx / pointsPerSegment),
    anchors.length - 1
  );

  return {
    points,
    minX, maxX, minY, maxY,
    diameter, height,
    shoulderIdx, shoulderX, shoulderY,
    rimWidth, rimDepth, rimMinY, rimMaxY,
    insideRimDiameter,
    partingLineHeight,
    noseRadius,
    domeRadius,
    shoulderSlantDeg,
    shoulderSegmentIndex,
    anchors
  };
}

/**
 * Computes disc profile dimensions from the 2D half-profile (closed bezier).
 * x = radial distance from center (mm), y = vertical.
 * Returns all derivable metrics for real-time display on the drafting table.
 */
export function getProfileMetrics(controlPoints) {
  const geo = getProfileGeometry(controlPoints);
  if (!geo) return null;
  const { diameter, height, rimWidth, rimDepth, insideRimDiameter, noseRadius, partingLineHeight, domeRadius, shoulderSlantDeg } = geo;
  return formatMetrics({
    diameter,
    height,
    rimWidth,
    rimDepth,
    insideRimDiameter,
    noseRadius,
    partingLineHeight,
    domeRadius,
    shoulderSlantDeg
  });
}

function formatMetrics(m) {
  const fmt = (v, d = 1) => v != null && Number.isFinite(v) ? v.toFixed(d) : '—';
  return {
    diameter: m.diameter,
    height: m.height,
    rimWidth: m.rimWidth,
    rimDepth: m.rimDepth,
    insideRimDiameter: m.insideRimDiameter,
    noseRadius: m.noseRadius,
    partingLineHeight: m.partingLineHeight,
    domeRadius: m.domeRadius,
    shoulderSlantDeg: m.shoulderSlantDeg,
    diameterStr: fmt(m.diameter),
    heightStr: fmt(m.height),
    rimWidthStr: fmt(m.rimWidth),
    rimDepthStr: fmt(m.rimDepth),
    insideRimDiameterStr: fmt(m.insideRimDiameter),
    noseRadiusStr: fmt(m.noseRadius, 2),
    plhStr: fmt(m.partingLineHeight),
    domeRadiusStr: m.domeRadius != null ? (m.domeRadius > 200 ? 'flat' : fmt(m.domeRadius, 1)) : '—',
    shoulderSlantStr: m.shoulderSlantDeg != null ? fmt(m.shoulderSlantDeg, 0) + '°' : '—'
  };
}
