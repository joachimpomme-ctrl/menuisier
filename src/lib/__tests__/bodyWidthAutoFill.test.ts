import { describe, expect, it } from 'vitest';
import { autoFillBodyWidths } from '../bodyWidthAutoFill';

describe('autoFillBodyWidths', () => {
  it('redistributes widths proportionally and preserves the exact target total', () => {
    const result = autoFillBodyWidths([60, 80, 100], 300);

    expect(result).toEqual([75, 100, 125]);
    expect(result.reduce((sum, width) => sum + width, 0)).toBe(300);
  });

  it('stays stable when the current widths already match the target total', () => {
    const result = autoFillBodyWidths([60, 80, 100], 240);

    expect(result).toEqual([60, 80, 100]);
  });

  it('handles rounding while keeping the exact target total', () => {
    const result = autoFillBodyWidths([1, 1, 1], 100, { precision: 10 });

    expect(result).toEqual([33.4, 33.3, 33.3]);
    expect(result.reduce((sum, width) => +(sum + width).toFixed(1), 0)).toBe(100);
  });

  it('respects the minimum width guardrail when redistributing', () => {
    const result = autoFillBodyWidths([5, 95], 120, { minWidth: 10, precision: 10 });

    expect(result[0]).toBeGreaterThanOrEqual(10);
    expect(result.reduce((sum, width) => sum + width, 0)).toBe(120);
  });
});
