import type { ScalingRule } from '../../schemas';

/**
 * Apply a scaling rule to a single raw value (PRD §4.5).
 *
 * Pure and deterministic: the same raw value and rule always yield the same
 * result, satisfying the reproducibility requirement (PRD §7.2). Never returns
 * a negative number; respects an optional cap for bonus/percentage methods.
 */
export function applyScaling(value: number, rule: ScalingRule): number {
  let scaled: number;

  switch (rule.method) {
    case 'RANGE_CONVERSION': {
      const { inputMin, inputMax, outputMin, outputMax } = rule;
      const span = inputMax - inputMin;
      if (span === 0) {
        scaled = outputMin;
      } else {
        const ratio = (value - inputMin) / span;
        scaled = outputMin + ratio * (outputMax - outputMin);
      }
      break;
    }
    case 'FIXED_BONUS': {
      scaled = value + rule.bonus;
      if (rule.cap !== undefined) scaled = Math.min(scaled, rule.cap);
      break;
    }
    case 'PERCENTAGE': {
      scaled = value * (rule.percentage / 100);
      if (rule.cap !== undefined) scaled = Math.min(scaled, rule.cap);
      break;
    }
    default: {
      // Exhaustiveness guard: if a new method is added to the union without a
      // handler here, this line fails to compile.
      const _exhaustive: never = rule;
      return _exhaustive;
    }
  }

  // Round to 2 dp to avoid floating-point noise in stored/exported results.
  return Math.max(0, round2(scaled));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
