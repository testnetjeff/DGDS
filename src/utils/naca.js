/**
 * NACA 4-digit, 00xx, and 5-digit (standard) airfoil generation.
 * Converts NACA code to app control-point format (anchor + control for Bezier).
 * Reflex 5-digit (Q=1) is not supported.
 */

const DEFAULT_CHORD = 128;

// NACA 00xx / 4-digit thickness distribution (half-thickness): y_t = 5t * (a0*sqrt(x) + a1*x + a2*x^2 + a3*x^3 + a4*x^4)
const THICK_A0 = 0.2969;
const THICK_A1 = -0.1260;
const THICK_A2 = -0.3516;
const THICK_A3 = 0.2843;
const THICK_A4 = -0.1015;

// NACA 5-digit standard mean lines (210, 220, 230, 240, 250). Reflex (Q=1) not included.
const NACA5_MEAN_LINES = {
  210: { p: 0.05, m: 0.0580, k: 361.4 },
  220: { p: 0.10, m: 0.1260, k: 51.64 },
  230: { p: 0.15, m: 0.2025, k: 15.957 },
  240: { p: 0.20, m: 0.2900, k: 6.643 },
  250: { p: 0.25, m: 0.3910, k: 3.230 }
};

/**
 * Parse NACA code string. Accepts 4-digit ("0012", "2412") or 5-digit ("23012"). Reflex 5-digit not supported.
 * @param {string} str - Input string
 * @returns {{ m: number, p: number, t: number } | { symmetric: true, t: number } | { fiveDigit: true, p: number, m: number, k: number, t: number } | null}
 */
export function parseNacaCode(str) {
  const cleaned = String(str).replace(/\s+/g, '').replace(/^NACA/i, '').trim();
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length !== 4 && digits.length !== 5) return null;

  if (digits.length === 4) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);
    const d3 = parseInt(digits[2], 10);
    const d4 = parseInt(digits[3], 10);
    const t = (d3 * 10 + d4) / 100; // thickness ratio
    if (t <= 0 || t > 0.4) return null;
    if (d1 === 0 && d2 === 0) {
      return { symmetric: true, t };
    }
    const m = d1 / 100;
    const p = d2 / 10;
    if (p <= 0 || p >= 1) return null;
    return { m, p, t };
  }

  // 5-digit: L P Q XX
  const L = parseInt(digits[0], 10);
  const P = parseInt(digits[1], 10);
  const Q = parseInt(digits[2], 10);
  const t = (parseInt(digits[3], 10) * 10 + parseInt(digits[4], 10)) / 100;
  if (t <= 0 || t > 0.4) return null;
  if (Q !== 0) return null; // reflex not supported
  if (L < 1 || L > 5 || P < 1 || P > 5) return null;
  const meanLine = 200 + P * 10 + Q;
  const params = NACA5_MEAN_LINES[meanLine];
  if (!params) return null;
  return { fiveDigit: true, p: params.p, m: params.m, k: params.k, t };
}

/**
 * Half-thickness (y_t) for NACA 4-digit thickness distribution at normalized x in [0,1].
 */
function thicknessDistribution(x, t) {
  if (x <= 0 || x >= 1) return 0;
  const sqrtX = Math.sqrt(x);
  const yt = 5 * t * (THICK_A0 * sqrtX + THICK_A1 * x + THICK_A2 * x * x + THICK_A3 * x * x * x + THICK_A4 * x * x * x * x);
  return Math.max(0, yt);
}

/**
 * Camber line y_c and slope dy_c/dx for NACA 4-digit. m = max camber, p = position of max camber.
 */
function camberLine(x, m, p) {
  if (x <= 0 || x >= 1) return { yc: 0, dyc: 0 };
  let yc, dyc;
  if (x < p) {
    yc = (m / (p * p)) * (2 * p * x - x * x);
    dyc = (m / (p * p)) * (2 * p - 2 * x);
  } else {
    yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x);
    dyc = (m / ((1 - p) * (1 - p))) * (2 * p - 2 * x);
  }
  return { yc, dyc };
}

/**
 * Camber line y_c and slope dy_c/dx for NACA 5-digit (standard mean line).
 * For 0 <= x <= m: yc = (k/6)*(x^3 - 3*m*x^2 + m^2*(3-m)*x)
 * For m < x <= 1: yc = (k/6)*m^3*(1-x)
 */
function camberLine5Digit(x, m, k) {
  if (x <= 0 || x >= 1) return { yc: 0, dyc: 0 };
  const k6 = k / 6;
  let yc, dyc;
  if (x <= m) {
    const m2 = m * m;
    const m3 = m * m2;
    yc = k6 * (x * x * x - 3 * m * x * x + m2 * (3 - m) * x);
    dyc = k6 * (3 * x * x - 6 * m * x + m2 * (3 - m));
  } else {
    const m3 = m * m * m;
    yc = k6 * m3 * (1 - x);
    dyc = -k6 * m3;
  }
  return { yc, dyc };
}

/**
 * Generate upper and lower surface points in normalized chord [0,1].
 * Returns { upper: [{x,y}], lower: [{x,y}] } with x from 0 (LE) to 1 (TE).
 */
function getNacaOrdinates(parsed) {
  const n = 60;
  const upper = [];
  const lower = [];

  if (parsed.symmetric) {
    const t = parsed.t;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      const yt = thicknessDistribution(x, t);
      upper.push({ x, y: yt });
      lower.push({ x, y: -yt });
    }
  } else if (parsed.fiveDigit) {
    const { m, k, t } = parsed;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      const yt = thicknessDistribution(x, t);
      const { yc, dyc } = camberLine5Digit(x, m, k);
      const theta = Math.atan2(dyc, 1);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      upper.push({ x: x - yt * sinT, y: yc + yt * cosT });
      lower.push({ x: x + yt * sinT, y: yc - yt * cosT });
    }
  } else {
    const { m, p, t } = parsed;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      const yt = thicknessDistribution(x, t);
      const { yc, dyc } = camberLine(x, m, p);
      const theta = Math.atan2(dyc, 1);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      upper.push({ x: x - yt * sinT, y: yc + yt * cosT });
      lower.push({ x: x + yt * sinT, y: yc - yt * cosT });
    }
  }

  return { upper, lower };
}

let nextId = 2000;
function getNextId() {
  return nextId++;
}

/**
 * Convert NACA ordinate points to anchor + control points for the app.
 * Closed loop: upper LE→TE, then lower TE→LE. Anchors are sampled; controls are tangent-based.
 */
function ordinatesToControlPoints(upper, lower, chordLength) {
  const pts = [];
  const nUpper = upper.length;
  const nLower = lower.length;
  for (let i = 0; i < nUpper; i++) pts.push({ ...upper[i], side: 'upper', i });
  for (let i = nLower - 1; i >= 0; i--) pts.push({ ...lower[i], side: 'lower', i });

  const total = pts.length;
  const numAnchors = 10;
  const step = total / numAnchors;
  const anchors = [];
  for (let k = 0; k < numAnchors; k++) {
    const idx = Math.min(Math.floor(k * step), total - 1);
    const a = pts[idx];
    anchors.push({ x: (1 - a.x) * chordLength, y: -a.y * chordLength });
  }

  const n = anchors.length;
  const controlsOut = [];
  const controlsIn = [];
  for (let i = 0; i < n; i++) {
    const prev = anchors[(i - 1 + n) % n];
    const curr = anchors[i];
    const next = anchors[(i + 1) % n];
    const d1x = curr.x - prev.x;
    const d1y = curr.y - prev.y;
    const d2x = next.x - curr.x;
    const d2y = next.y - curr.y;
    const len1 = Math.hypot(d1x, d1y) || 1;
    const len2 = Math.hypot(d2x, d2y) || 1;
    const tangentInX = d1x / len1;
    const tangentInY = d1y / len1;
    const tangentOutX = d2x / len2;
    const tangentOutY = d2y / len2;
    const k = 0.25 * Math.min(len1, len2);
    controlsIn.push({
      x: curr.x - k * tangentInX,
      y: curr.y - k * tangentInY
    });
    controlsOut.push({
      x: curr.x + k * tangentOutX,
      y: curr.y + k * tangentOutY
    });
  }

  const result = [];
  for (let i = 0; i < n; i++) {
    result.push({
      x: controlsIn[i].x,
      y: controlsIn[i].y,
      type: 'control',
      id: getNextId(),
      isConstrained: false
    });
    result.push({
      x: anchors[i].x,
      y: anchors[i].y,
      type: 'anchor',
      id: getNextId(),
      isConstrained: false
    });
    result.push({
      x: controlsOut[i].x,
      y: controlsOut[i].y,
      type: 'control',
      id: getNextId(),
      isConstrained: false
    });
  }
  return result;
}

/**
 * Generate app control points from a NACA code.
 * @param {string} code - e.g. "0012", "2412", "23012", "NACA 0012". Reflex 5-digit not supported.
 * @param {number} [chordLength=128] - chord in world units
 * @returns {{ controlPoints: Array, error?: string }}
 */
export function nacaToControlPoints(code, chordLength = DEFAULT_CHORD) {
  const parsed = parseNacaCode(code);
  if (!parsed) {
    return { error: 'Invalid NACA code. Use 4 digits (0012, 2412) or 5 digits (23012). Reflex 5-digit not supported.', controlPoints: null };
  }
  const { upper, lower } = getNacaOrdinates(parsed);
  const controlPoints = ordinatesToControlPoints(upper, lower, chordLength);
  return { controlPoints };
}
