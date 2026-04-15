import { describe, expect, it } from 'vitest';
import type { Assumption } from '../../lib/knowledge/types';
import {
  getDecisionAssumptions,
  getDefaultAssumptions,
  getVerifyAssumptions,
  getVisibleDecisions,
} from '../result/Assumptions';

function makeAssumption(overrides: Partial<Assumption> = {}): Assumption {
  return {
    key: 'default_key',
    value: 'Default value',
    reason: 'Default reason',
    user_should_verify: false,
    ...overrides,
  };
}

describe('Assumptions grouping', () => {
  it('filters decisions by category', () => {
    const assumptions = [
      makeAssumption({ key: 'wall_type' }),
      makeAssumption({ key: 'doors_decision', category: 'decision' }),
      makeAssumption({ key: 'drawers_decision', category: 'decision' }),
    ];

    expect(getDecisionAssumptions(assumptions).map((a) => a.key)).toEqual([
      'doors_decision',
      'drawers_decision',
    ]);
  });

  it('excludes decisions from assumptions to verify', () => {
    const assumptions = [
      makeAssumption({ key: 'mounting_decision', category: 'decision', user_should_verify: true }),
      makeAssumption({ key: 'square_check', user_should_verify: true }),
    ];

    expect(getVerifyAssumptions(assumptions).map((a) => a.key)).toEqual(['square_check']);
  });

  it('excludes decisions from default assumptions', () => {
    const assumptions = [
      makeAssumption({ key: 'edge_banding_decision', category: 'decision' }),
      makeAssumption({ key: 'material' }),
    ];

    expect(getDefaultAssumptions(assumptions).map((a) => a.key)).toEqual(['material']);
  });

  it('shows at most 6 decisions by default', () => {
    const decisions = Array.from({ length: 8 }, (_, index) =>
      makeAssumption({ key: `decision_${index + 1}`, category: 'decision' }),
    );

    expect(getVisibleDecisions(decisions, false)).toHaveLength(6);
    expect(getVisibleDecisions(decisions, true)).toHaveLength(8);
  });
});
