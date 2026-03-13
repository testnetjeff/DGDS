import { calculateLiftCoefficient } from './thinAirfoil';
import { getProfileGeometry } from './profileMetrics';

const M_TO_FT = 3.28084;
const RHO = 1.225;
const MASS = 0.175;
const G = 9.81;

export function calculateAerodynamics(controlPoints, aoaDeg = 8) {
  const result = calculateLiftCoefficient(controlPoints, aoaDeg);
  if (result.error) return null;

  const { cl: Cl, camberRatio, thicknessRatio } = result;

  const geo = getProfileGeometry(controlPoints);
  if (!geo) return null;

  const { maxX, height, rimWidth, rimDepth } = geo;
  const totalHeight = Math.max(height, 1);
  const rimDepthRatio = rimDepth / totalHeight;
  const rimWidthRatio = rimWidth / Math.max(maxX, 1);

  const Cd0 = 0.03
    + 0.15 * thicknessRatio
    + 0.09 * rimDepthRatio
    + 0.05 * rimWidthRatio;
  const k = 0.07;
  const Cd = Cd0 + k * Cl * Cl;
  const LD = Cl / Math.max(Cd, 0.001);

  return { Cl, Cd, LD, camberRatio, thicknessRatio, rimDepthRatio, rimWidthRatio };
}

export function simulateFlightPhysics(controlPoints, throwPower = 1.0) {
  const geo = getProfileGeometry(controlPoints);
  if (!geo) return { points: [], aero: null };

  const { maxX, height, rimWidth, rimDepth, partingLineHeight, domeRadius } = geo;

  const aero = calculateAerodynamics(controlPoints, 8);
  if (!aero) return { points: [], aero: null };

  const { Cl, Cd, LD, camberRatio, rimWidthRatio } = aero;

  const R = maxX / 1000;
  const A = Math.PI * R * R;

  const v0 = 10 + 20 * Math.max(0.1, Math.min(1.0, throwPower));

  const launchAngleRad = 8 * Math.PI / 180;

  const totalH = Math.max(height, 1);
  const plhNorm = (partingLineHeight != null) ? (partingLineHeight / totalH) : 0.45;

  const stability = 2.5 * (plhNorm - 0.4)
    + 0.9 * rimWidthRatio
    - 0.5 * camberRatio * 10;

  const omega0 = 120;
  const spinDecay = 0.018;

  const dt = 0.04;
  const maxTime = 25;

  let x = 0, y = 0, z = 1.0;
  let vx = v0 * Math.cos(launchAngleRad);
  let vy = 0;
  let vz = v0 * Math.sin(launchAngleRad);
  let t = 0;
  let rotDeg = 0;

  const points = [];

  while (z >= 0 && t < maxTime) {
    const v_mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (v_mag < 0.8) break;

    const q = 0.5 * RHO * v_mag * v_mag;

    const L_N = q * A * Cl;
    const D_N = q * A * Cd;

    const ax = -D_N * (vx / v_mag) / MASS;
    const az = (L_N / MASS) - G - D_N * (vz / v_mag) / MASS;

    const omega = omega0 * Math.exp(-spinDecay * t);
    const spinFrac = omega / omega0;

    const F_turn = Math.min(0, -stability) * q * A * Cl * spinFrac;
    const F_fade = Math.max(0, stability) * q * A * Cl * (1 - spinFrac);
    const ay = (F_turn * 0.18 + F_fade * 0.22) / MASS;

    vx += ax * dt;
    vy += ay * dt;
    vz += az * dt;

    x += vx * dt;
    y += vy * dt;
    z += vz * dt;
    t += dt;

    rotDeg += spinFrac * 20;

    const velocityFactor = Math.min(1, Math.max(0, v_mag / v0));

    points.push({
      x: x * M_TO_FT,
      y: y * M_TO_FT,
      z: Math.max(0, z * M_TO_FT),
      t: t / maxTime,
      velocity: velocityFactor,
      rotation: rotDeg,
      v_ms: v_mag,
    });
  }

  const estimatedRange = points.length > 0
    ? Math.round(points[points.length - 1].x)
    : 0;

  const maxHeight = points.length > 0
    ? Math.round(Math.max(...points.map(p => p.z)))
    : 0;

  return {
    points,
    aero: {
      Cl: Cl.toFixed(3),
      Cd: Cd.toFixed(3),
      LD: LD.toFixed(2),
      stability: stability.toFixed(2),
      estimatedRange,
      maxHeight,
    },
  };
}
