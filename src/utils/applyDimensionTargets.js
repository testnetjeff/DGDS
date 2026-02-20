import { getProfileGeometry } from './profileMetrics';
import { getAnchors } from './bezier';

const LENGTH_TOL = 0.05;
const ANGLE_TOL_DEG = 0.5;

function clonePoints(controlPoints) {
  return controlPoints.map(p => ({ ...p }));
}

function applyDiameter(controlPoints, geo, targetDiameter) {
  if (!geo || geo.maxX <= 0 || targetDiameter <= 0) return controlPoints;
  const scale = (targetDiameter / 2) / geo.maxX;
  return controlPoints.map(p => ({ ...p, x: p.x * scale }));
}

function applyHeight(controlPoints, geo, targetHeight) {
  if (!geo || (geo.maxY - geo.minY) <= 0 || targetHeight <= 0) return controlPoints;
  const scale = targetHeight / (geo.maxY - geo.minY);
  return controlPoints.map(p => ({
    ...p,
    y: geo.minY + (p.y - geo.minY) * scale
  }));
}

function applyRimWidth(controlPoints, geo, targetRimWidth) {
  if (!geo || geo.rimWidth <= 0 || targetRimWidth <= 0) return controlPoints;
  const scale = targetRimWidth / geo.rimWidth;
  return controlPoints.map(p => {
    if (p.x >= geo.shoulderX) {
      return {
        ...p,
        x: geo.shoulderX + (p.x - geo.shoulderX) * scale
      };
    }
    return { ...p };
  });
}

function applyRimDepth(controlPoints, geo, targetRimDepth) {
  if (!geo || geo.rimDepth <= 0 || targetRimDepth <= 0) return controlPoints;
  const scale = targetRimDepth / geo.rimDepth;
  return controlPoints.map(p => {
    if (p.x >= geo.shoulderX) {
      return {
        ...p,
        y: geo.rimMinY + (p.y - geo.rimMinY) * scale
      };
    }
    return { ...p };
  });
}

function applyInsideRimDiameter(controlPoints, geo, targetInsideRimDiameter) {
  if (!geo || geo.shoulderX <= 0 || targetInsideRimDiameter <= 0) return controlPoints;
  const targetShoulderX = targetInsideRimDiameter / 2;
  const scale = targetShoulderX / geo.shoulderX;
  return controlPoints.map(p => {
    if (p.x <= geo.shoulderX) {
      return { ...p, x: p.x * scale };
    }
    return { ...p };
  });
}

/** Set PLH by moving the rim-top anchor (anchor with max x) to target y. */
function applyPartingLineHeight(controlPoints, geo, targetPLH) {
  if (geo == null || targetPLH == null || !Number.isFinite(targetPLH)) return controlPoints;
  const anchors = getAnchors(controlPoints);
  if (anchors.length === 0) return controlPoints;
  let rimAnchorIdx = 0;
  let maxAnchorX = anchors[0].x;
  anchors.forEach((a, i) => {
    if (a.x > maxAnchorX) {
      maxAnchorX = a.x;
      rimAnchorIdx = i;
    }
  });
  const globalIdx = anchors[rimAnchorIdx].originalIndex;
  const pts = clonePoints(controlPoints);
  const anchor = pts[globalIdx];
  if (anchor) {
    const dy = targetPLH - anchor.y;
    anchor.y = targetPLH;
    const handleAfter = pts[globalIdx + 1];
    const handleBefore = pts[globalIdx - 1];
    if (handleAfter?.type === 'control') handleAfter.y += dy;
    if (handleBefore?.type === 'control') handleBefore.y += dy;
  }
  return pts;
}

/** Adjust nose (rim) anchor handles to approximate target curvature (radius). */
function applyNoseRadius(controlPoints, geo, targetNoseRadius) {
  if (geo == null || targetNoseRadius == null || targetNoseRadius <= 0) return controlPoints;
  const current = geo.noseRadius;
  if (current == null || current <= 0) return controlPoints;
  const anchors = getAnchors(controlPoints);
  if (anchors.length === 0) return controlPoints;
  let rimAnchorIdx = 0;
  let maxAnchorX = anchors[0].x;
  anchors.forEach((a, i) => {
    if (a.x > maxAnchorX) {
      maxAnchorX = a.x;
      rimAnchorIdx = i;
    }
  });
  const globalIdx = anchors[rimAnchorIdx].originalIndex;
  const anchor = controlPoints[globalIdx];
  if (!anchor) return controlPoints;
  const factor = Math.sqrt(targetNoseRadius / current);
  const pts = clonePoints(controlPoints);
  const hOut = pts[globalIdx + 1];
  const hIn = pts[globalIdx - 1];
  if (hOut?.type === 'control') {
    pts[globalIdx + 1] = {
      ...hOut,
      x: anchor.x + (hOut.x - anchor.x) * factor,
      y: anchor.y + (hOut.y - anchor.y) * factor
    };
  }
  if (hIn?.type === 'control') {
    pts[globalIdx - 1] = {
      ...hIn,
      x: anchor.x + (hIn.x - anchor.x) * factor,
      y: anchor.y + (hIn.y - anchor.y) * factor
    };
  }
  return pts;
}

/** Adjust dome anchor (max y in top region) to approximate target dome radius. */
function applyDomeRadius(controlPoints, geo, targetDomeRadius) {
  if (geo == null || targetDomeRadius == null || targetDomeRadius <= 0) return controlPoints;
  const current = geo.domeRadius;
  if (current == null || current <= 0) return controlPoints;
  const anchors = getAnchors(controlPoints);
  const topAnchors = anchors.filter(a => a.x >= geo.minX && a.x <= geo.shoulderX);
  if (topAnchors.length === 0) return controlPoints;
  const domeAnchor = topAnchors.reduce((best, a) => (a.y > best.y ? a : best), topAnchors[0]);
  const globalIdx = domeAnchor.originalIndex;
  const anchor = controlPoints[globalIdx];
  if (!anchor) return controlPoints;
  const factor = Math.sqrt(targetDomeRadius / current);
  const pts = clonePoints(controlPoints);
  const hOut = pts[globalIdx + 1];
  const hIn = pts[globalIdx - 1];
  if (hOut?.type === 'control') {
    pts[globalIdx + 1] = {
      ...hOut,
      x: anchor.x + (hOut.x - anchor.x) * factor,
      y: anchor.y + (hOut.y - anchor.y) * factor
    };
  }
  if (hIn?.type === 'control') {
    pts[globalIdx - 1] = {
      ...hIn,
      x: anchor.x + (hIn.x - anchor.x) * factor,
      y: anchor.y + (hIn.y - anchor.y) * factor
    };
  }
  return pts;
}

/** Set shoulder slant by rotating handles of the segment containing the shoulder around segment midpoint. */
function applyShoulderSlant(controlPoints, geo, targetSlantDeg) {
  if (geo == null || targetSlantDeg == null || !Number.isFinite(targetSlantDeg)) return controlPoints;
  const anchors = geo.anchors;
  if (!anchors || anchors.length < 2) return controlPoints;
  const currentDeg = geo.shoulderSlantDeg;
  if (currentDeg == null || !Number.isFinite(currentDeg)) return controlPoints;
  const segIdx = geo.shoulderSegmentIndex;
  const a1 = anchors[segIdx];
  const a2 = anchors[(segIdx + 1) % anchors.length];
  const idx1 = a1.originalIndex;
  const idx2 = a2.originalIndex;
  const targetRad = (targetSlantDeg * Math.PI) / 180;
  const currentRad = (currentDeg * Math.PI) / 180;
  const delta = targetRad - currentRad;
  const pts = clonePoints(controlPoints);
  const cx = (a1.x + a2.x) / 2;
  const cy = (a1.y + a2.y) / 2;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);
  const rotate = (p) => ({
    ...p,
    x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
    y: cy + (p.x - cx) * sin + (p.y - cy) * cos
  });
  if (pts[idx1 + 1]?.type === 'control') pts[idx1 + 1] = rotate(pts[idx1 + 1]);
  if (pts[idx2 - 1]?.type === 'control') pts[idx2 - 1] = rotate(pts[idx2 - 1]);
  return pts;
}

/**
 * Applies target dimensions to control points. Only provided keys in targets are applied.
 * Order: diameter -> height -> rim width -> rim depth -> PLH -> nose radius -> dome radius -> shoulder slant.
 * @param {Array} controlPoints
 * @param {{ diameter?, height?, rimWidth?, rimDepth?, insideRimDiameter?, partingLineHeight?, noseRadius?, domeRadius?, shoulderSlantDeg? }} targets
 * @returns {{ controlPoints: Array, error?: string }}
 */
export function applyDimensionTargets(controlPoints, targets) {
  if (!controlPoints || controlPoints.length < 3) {
    return { controlPoints: controlPoints || [], error: 'Invalid profile' };
  }
  const t = targets || {};
  if (t.diameter != null && (typeof t.diameter !== 'number' || t.diameter <= 0)) {
    return { controlPoints: controlPoints.map(p => ({ ...p })), error: 'Diameter must be a positive number' };
  }
  if (t.height != null && (typeof t.height !== 'number' || t.height <= 0)) {
    return { controlPoints: controlPoints.map(p => ({ ...p })), error: 'Height must be a positive number' };
  }
  if (t.rimWidth != null && (typeof t.rimWidth !== 'number' || t.rimWidth <= 0)) {
    return { controlPoints: controlPoints.map(p => ({ ...p })), error: 'Rim width must be a positive number' };
  }
  if (t.rimDepth != null && (typeof t.rimDepth !== 'number' || t.rimDepth <= 0)) {
    return { controlPoints: controlPoints.map(p => ({ ...p })), error: 'Rim depth must be a positive number' };
  }
  if (t.insideRimDiameter != null && (typeof t.insideRimDiameter !== 'number' || t.insideRimDiameter <= 0)) {
    return { controlPoints: controlPoints.map(p => ({ ...p })), error: 'Inside rim diameter must be a positive number' };
  }

  let pts = clonePoints(controlPoints);
  let geo = getProfileGeometry(pts);

  if (t.diameter != null) {
    const current = geo.diameter;
    if (current == null || Math.abs(current - t.diameter) > LENGTH_TOL) {
      pts = applyDiameter(pts, geo, t.diameter);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.height != null) {
    const current = geo.height;
    if (current == null || Math.abs(current - t.height) > LENGTH_TOL) {
      pts = applyHeight(pts, geo, t.height);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.rimWidth != null) {
    const current = geo.rimWidth;
    if (current == null || Math.abs(current - t.rimWidth) > LENGTH_TOL) {
      pts = applyRimWidth(pts, geo, t.rimWidth);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.rimDepth != null) {
    const current = geo.rimDepth;
    if (current == null || Math.abs(current - t.rimDepth) > LENGTH_TOL) {
      pts = applyRimDepth(pts, geo, t.rimDepth);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.insideRimDiameter != null) {
    const current = geo.insideRimDiameter;
    if (current == null || Math.abs(current - t.insideRimDiameter) > LENGTH_TOL) {
      pts = applyInsideRimDiameter(pts, geo, t.insideRimDiameter);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.partingLineHeight != null && Number.isFinite(t.partingLineHeight)) {
    const current = geo.partingLineHeight;
    if (current == null || Math.abs(current - t.partingLineHeight) > LENGTH_TOL) {
      pts = applyPartingLineHeight(pts, geo, t.partingLineHeight);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.noseRadius != null && t.noseRadius > 0) {
    const current = geo.noseRadius;
    if (current == null || current <= 0 || Math.abs(current - t.noseRadius) > LENGTH_TOL) {
      pts = applyNoseRadius(pts, geo, t.noseRadius);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.domeRadius != null && t.domeRadius > 0) {
    const current = geo.domeRadius;
    if (current == null || current <= 0 || Math.abs(current - t.domeRadius) > LENGTH_TOL) {
      pts = applyDomeRadius(pts, geo, t.domeRadius);
      geo = getProfileGeometry(pts);
    }
  }
  if (t.shoulderSlantDeg != null && Number.isFinite(t.shoulderSlantDeg)) {
    const current = geo.shoulderSlantDeg;
    if (current == null || !Number.isFinite(current) || Math.abs(current - t.shoulderSlantDeg) > ANGLE_TOL_DEG) {
      pts = applyShoulderSlant(pts, geo, t.shoulderSlantDeg);
    }
  }

  return { controlPoints: pts };
}
