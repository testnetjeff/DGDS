/**
 * Interprets L/D (lift-to-drag) ratio in aerodynamic terms only.
 * Does not infer disc type (putter/mid/driver) — that is set by the user's template choice.
 */

const LOW_LD_THRESHOLD = 2.2;
const HIGH_LD_THRESHOLD = 3.4;

/**
 * @param {number | null} ld - Lift-to-drag ratio
 * @returns {{ category: string | null, message: string | null, hint: string | null }}
 */
export function getLdInterpretation(ld) {
  if (ld == null || Number.isNaN(ld) || !Number.isFinite(ld) || ld === Infinity) {
    return { category: null, message: null, hint: null };
  }
  if (ld < LOW_LD_THRESHOLD) {
    return {
      category: 'low',
      message: 'Relatively high drag for the lift produced — shorter, controlled flight potential.',
      hint: 'Lower L/D means more drag per unit lift; good for accuracy and landing control.'
    };
  }
  if (ld < HIGH_LD_THRESHOLD) {
    return {
      category: 'moderate',
      message: 'Moderate lift-to-drag — balanced efficiency.',
      hint: 'L/D measures how much lift you get per unit of drag.'
    };
  }
  return {
    category: 'high',
    message: 'High L/D — efficient lift per unit drag; potential for longer glide.',
    hint: 'Higher L/D generally means more glide for a given drag penalty.'
  };
}
