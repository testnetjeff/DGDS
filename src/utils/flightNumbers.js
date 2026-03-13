import { calculateAerodynamics } from './flightPhysics';
import { getProfileGeometry } from './profileMetrics';

function roundToQuarter(value) {
  const rounded = Math.round(value * 4) / 4;
  return Math.round(rounded * 100) / 100;
}

export function calculateFlightNumbers(controlPoints) {
  if (!controlPoints || controlPoints.length < 3) {
    return { speed: 0, glide: 0, turn: 0, fade: 0 };
  }

  const aero = calculateAerodynamics(controlPoints, 8);
  const geo = getProfileGeometry(controlPoints);

  if (!aero || !geo) {
    return { speed: 0, glide: 0, turn: 0, fade: 0 };
  }

  const { Cl, Cd, LD, camberRatio } = aero;
  const { maxX, height, rimWidth, rimDepth, partingLineHeight } = geo;

  const totalH = Math.max(height, 1);
  const plhNorm = (partingLineHeight != null) ? (partingLineHeight / totalH) : 0.45;
  const rimWidthRatio = rimWidth / Math.max(maxX, 1);
  const rimDepthRatio = rimDepth / totalH;

  const stability = 2.5 * (plhNorm - 0.4)
    + 0.9 * rimWidthRatio
    - 0.5 * camberRatio * 10;

  const speed = calcSpeed(rimWidthRatio, rimDepthRatio, maxX);
  const glide = Math.max(1, Math.min(7, LD * 0.75));
  const turn  = Math.max(-5, Math.min(1, -stability * 1.8));
  const fade  = Math.max(0, Math.min(5, stability * 1.8 + 0.5));

  return {
    speed: roundToQuarter(speed),
    glide: roundToQuarter(glide),
    turn:  roundToQuarter(turn),
    fade:  roundToQuarter(fade),
  };
}

function calcSpeed(rimWidthRatio, rimDepthRatio, maxX) {
  const normalizedDiameter = (maxX * 2) / 211;
  const base = 5 + rimWidthRatio * 8 + normalizedDiameter * 2;
  const depthBoost = rimDepthRatio * 1.5;
  return Math.max(1, Math.min(14, base + depthBoost));
}
