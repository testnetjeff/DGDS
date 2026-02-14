/**
 * Interprets L/D (lift-to-drag) ratio for disc golf: putter, midrange, or driver.
 * Thresholds are approximate and based on relative ordering (putters = lower L/D, drivers = higher L/D).
 */

const PUTTER_THRESHOLD = 2.2;
const DRIVER_THRESHOLD = 3.4;

/**
 * @param {number | null} ld - Lift-to-drag ratio
 * @returns {{ category: string | null, message: string | null, hint: string | null }}
 */
export function getLdInterpretation(ld) {
  if (ld == null || Number.isNaN(ld) || !Number.isFinite(ld) || ld === Infinity) {
    return { category: null, message: null, hint: null };
  }
  if (ld < PUTTER_THRESHOLD) {
    return {
      category: 'putter',
      message: 'Based on this L/D, this design would most likely behave like a putter.',
      hint: 'Putters favor control and shorter, predictable flights.'
    };
  }
  if (ld < DRIVER_THRESHOLD) {
    return {
      category: 'midrange',
      message: 'Based on this L/D, this design would most likely behave like a midrange.',
      hint: 'Midranges offer a balance of control and distance.'
    };
  }
  return {
    category: 'driver',
    message: 'Based on this L/D, this design would most likely behave like a driver.',
    hint: 'Drivers are optimized for distance and longer flights.'
  };
}
