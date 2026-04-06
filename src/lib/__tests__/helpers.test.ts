import { describe, it, expect } from 'vitest';
import {
  uid,
  parseNumber,
  clampInt,
  getBodyInnerWidth,
  isSharedLeft,
  isSharedRight,
  calculateDoor,
} from '../helpers';

// ---------------------------------------------------------------------------
// uid
// ---------------------------------------------------------------------------
describe('uid', () => {
  it('returns a valid UUID string', () => {
    const id = uid();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------
describe('parseNumber', () => {
  it('parses a valid number', () => {
    expect(parseNumber('42.5', 0)).toBe(42.5);
  });

  it('returns fallback for NaN', () => {
    expect(parseNumber('abc', 10)).toBe(10);
    expect(parseNumber('', 5)).toBe(5);
  });

  it('clamps to min/max', () => {
    expect(parseNumber('1', 0, 5, 100)).toBe(5);
    expect(parseNumber('200', 0, 5, 100)).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// clampInt
// ---------------------------------------------------------------------------
describe('clampInt', () => {
  it('clamps and rounds to integer', () => {
    expect(clampInt('3', 0, 1, 10)).toBe(3);
    expect(clampInt('-5', 0, 1, 10)).toBe(1);
    expect(clampInt('99', 0, 1, 10)).toBe(10);
  });

  it('returns fallback for invalid input', () => {
    expect(clampInt('abc', 7, 1, 10)).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// getBodyInnerWidth — joue commune
// ---------------------------------------------------------------------------
describe('getBodyInnerWidth', () => {
  const th = 1.8; // 18mm

  it('standard body (no sharing)', () => {
    // 80cm body, 2 joues of 1.8cm each → inner = 80 - 1.8 - 1.8 = 76.4
    expect(getBodyInnerWidth(80, 0, 2, [], th)).toBeCloseTo(76.4, 1);
  });

  it('shared left body — no left joue', () => {
    // Body index 1 with shared boundary at index 0
    // inner = 80 - 0 - 1.8 = 78.2
    expect(getBodyInnerWidth(80, 1, 2, [true], th)).toBeCloseTo(78.2, 1);
  });

  it('non-shared body ignores empty boundaries', () => {
    expect(getBodyInnerWidth(80, 0, 2, [false], th)).toBeCloseTo(76.4, 1);
  });
});

// ---------------------------------------------------------------------------
// isSharedLeft / isSharedRight
// ---------------------------------------------------------------------------
describe('isSharedLeft', () => {
  it('first body is never shared left', () => {
    expect(isSharedLeft(0, [true])).toBe(false);
  });

  it('second body shared left when boundary[0] is true', () => {
    expect(isSharedLeft(1, [true])).toBe(true);
  });

  it('returns false for empty boundaries', () => {
    expect(isSharedLeft(1, [])).toBe(false);
  });
});

describe('isSharedRight', () => {
  it('last body is never shared right', () => {
    expect(isSharedRight(1, 2, [true])).toBe(false);
  });

  it('first body shared right when boundary[0] is true', () => {
    expect(isSharedRight(0, 2, [true])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateDoor
// ---------------------------------------------------------------------------
describe('calculateDoor', () => {
  const bodyW = 80;
  const bodyH = 240;
  const th = 1.8;
  const JEU = 0.2;

  describe('enveloppante', () => {
    it('single door covers full body', () => {
      const d = calculateDoor(bodyW, bodyH, th, 1, 'enveloppante');
      expect(d.doorWidth).toBeCloseTo(bodyW - JEU, 1);
      expect(d.doorHeight).toBeCloseTo(bodyH - JEU, 1);
      expect(d.poseLabel).toContain('Enveloppante');
    });

    it('double doors split body width', () => {
      const d = calculateDoor(bodyW, bodyH, th, 2, 'enveloppante');
      expect(d.doorWidth).toBeCloseTo(bodyW / 2 - JEU * 0.75, 1);
      expect(d.doorHeight).toBeCloseTo(bodyH - JEU, 1);
    });
  });

  describe('affleurante', () => {
    it('single door fits inside frame', () => {
      const d = calculateDoor(bodyW, bodyH, th, 1, 'affleurante');
      const innerW = bodyW - 2 * th;
      expect(d.doorWidth).toBeCloseTo(innerW - 2 * JEU, 1);
      expect(d.doorHeight).toBeCloseTo(bodyH - 2 * th - 2 * JEU, 1);
    });
  });

  describe('demi-recouvrement', () => {
    it('single door with half overlap', () => {
      const d = calculateDoor(bodyW, bodyH, th, 1, 'demi-recouvrement');
      const innerW = bodyW - 2 * th;
      expect(d.doorWidth).toBeCloseTo(innerW + th - JEU, 1);
    });
  });

  describe('hinges', () => {
    it('2 hinges for short doors (<60cm)', () => {
      const d = calculateDoor(40, 50, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(2);
      expect(d.hingePositions).toHaveLength(2);
    });

    it('3 hinges for medium doors (60-120cm)', () => {
      const d = calculateDoor(40, 100, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(3);
      expect(d.hingePositions).toHaveLength(3);
    });

    it('5 hinges for tall doors (≥180cm)', () => {
      const d = calculateDoor(40, 200, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(5);
      expect(d.hingePositions).toHaveLength(5);
    });

    it('hinge positions are sorted ascending', () => {
      const d = calculateDoor(40, 200, th, 1, 'enveloppante');
      for (let i = 1; i < d.hingePositions.length; i++) {
        expect(d.hingePositions[i]).toBeGreaterThan(d.hingePositions[i - 1]);
      }
    });
  });

  describe('effectiveInnerWidth (joue commune)', () => {
    it('uses effectiveInnerWidth for affleurante', () => {
      const eiw = 78.2; // wider than standard inner
      const d = calculateDoor(bodyW, bodyH, th, 1, 'affleurante', eiw);
      expect(d.doorWidth).toBeCloseTo(eiw - 2 * JEU, 1);
    });
  });
});
