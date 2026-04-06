import { describe, it, expect } from 'vitest';
import {
  uid,
  parseNumber,
  clampInt,
  getBodyInnerWidth,
  isSharedLeft,
  isSharedRight,
  calculateDoor,
  getBodyEffectiveHeight,
  computeHinges,
  getDoorInfoFromPieces,
} from '../helpers';
import type { Body } from '../../types';

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

  describe('hinges (Hettich Sensys thresholds, height only via calculateDoor)', () => {
    it('2 hinges for doors ≤100cm', () => {
      const d = calculateDoor(40, 50, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(2);
      expect(d.hingePositions).toHaveLength(2);
    });

    it('2 hinges for 100cm door (boundary)', () => {
      const d = calculateDoor(40, 100, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(2); // 1000mm ≤ 1000mm → 2
    });

    it('3 hinges for doors 101-150cm', () => {
      const d = calculateDoor(40, 120, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(3); // 1200mm > 1000mm
      expect(d.hingePositions).toHaveLength(3);
    });

    it('4 hinges for doors 151-200cm', () => {
      const d = calculateDoor(40, 180, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(4); // 1800mm > 1500mm
    });

    it('4 hinges for 200cm door (boundary)', () => {
      const d = calculateDoor(40, 200, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(4); // 2000mm ≤ 2000mm → 4
    });

    it('5 hinges for doors > 200cm', () => {
      const d = calculateDoor(40, 220, th, 1, 'enveloppante');
      expect(d.hingeCount).toBe(5); // 2200mm > 2000mm
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

// ---------------------------------------------------------------------------
// getBodyEffectiveHeight
// ---------------------------------------------------------------------------
describe('getBodyEffectiveHeight', () => {
  const cH = 254;
  const pH = 13;
  const usableH = cH - pH; // 241

  function makeBody(joueHeights: number[]): Body {
    return {
      id: 'b1', name: 'Test', width: 100, depth: 30,
      pieces: joueHeights.map((h, i) => ({
        id: `j${i}`, name: `Joue ${i}`, length: h, width: 30, qty: 1, type: 'joue' as const,
      })),
    };
  }

  it('returns usableHeight when no joues', () => {
    const body: Body = { id: 'b1', name: 'Test', width: 100, depth: 30, pieces: [] };
    expect(getBodyEffectiveHeight(body, cH, pH)).toBe(usableH);
  });

  it('returns usableHeight for floor-to-ceiling joues', () => {
    const body = makeBody([254, 254]);
    expect(getBodyEffectiveHeight(body, cH, pH)).toBe(usableH);
  });

  it('returns joue height for short body', () => {
    const body = makeBody([100, 100]);
    expect(getBodyEffectiveHeight(body, cH, pH)).toBe(100);
  });

  it('returns usableHeight for split joues (haut+bas = ceilingHeight)', () => {
    // Split joues: 180 + 74 = 254 = ceilingHeight → floor-to-ceiling
    const body = makeBody([180, 74, 180, 74]);
    expect(getBodyEffectiveHeight(body, cH, pH)).toBe(usableH);
  });

  it('100cm body → 2 hinges (not 5 like the old bug)', () => {
    const body = makeBody([100, 100]);
    const bH = getBodyEffectiveHeight(body, cH, pH);
    // 100cm height → calculateDoor gives ~99.8cm door → ≤1000mm → 2 hinges
    const door = calculateDoor(80, bH, 1.8, 1, 'enveloppante');
    expect(door.hingeCount).toBe(2); // height-only (no width/weight in calculateDoor)
  });
});

// ---------------------------------------------------------------------------
// computeHinges
// ---------------------------------------------------------------------------
describe('computeHinges', () => {
  describe('by height (Hettich Sensys thresholds)', () => {
    it('2 hinges for ≤100cm', () => {
      expect(computeHinges(50).count).toBe(2);
      expect(computeHinges(100).count).toBe(2); // 1000mm boundary
    });

    it('3 hinges for 101-150cm', () => {
      expect(computeHinges(110).count).toBe(3);
      expect(computeHinges(150).count).toBe(3);
    });

    it('4 hinges for 151-200cm', () => {
      expect(computeHinges(160).count).toBe(4);
      expect(computeHinges(200).count).toBe(4);
    });

    it('5 hinges for 201-240cm', () => {
      expect(computeHinges(220).count).toBe(5);
    });

    it('6 hinges for 241-260cm', () => {
      expect(computeHinges(250).count).toBe(6);
    });

    it('7 hinges for >260cm', () => {
      expect(computeHinges(270).count).toBe(7);
    });
  });

  describe('by weight (~4kg/charnière)', () => {
    it('weight overrides height if heavier', () => {
      // 50cm door (2 by height) but 12kg (3 by weight) → 3
      expect(computeHinges(50, undefined, 12).count).toBe(3);
    });

    it('height overrides weight if taller', () => {
      // 160cm door (4 by height) but 5kg (2 by weight) → 4
      expect(computeHinges(160, undefined, 5).count).toBe(4);
    });
  });

  describe('wide door bonus (>60cm)', () => {
    it('+1 hinge for doors wider than 60cm', () => {
      // 100cm height → 2 by height, 65cm wide → +1 = 3
      expect(computeHinges(100, 65).count).toBe(3);
    });

    it('no bonus for doors ≤60cm wide', () => {
      expect(computeHinges(100, 60).count).toBe(2);
    });
  });

  it('positions are sorted ascending', () => {
    const { positions } = computeHinges(150);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });
});

// ---------------------------------------------------------------------------
// getDoorInfoFromPieces
// ---------------------------------------------------------------------------
describe('getDoorInfoFromPieces', () => {
  it('returns null when no doorConfig', () => {
    const body: Body = { id: 'b1', name: 'Test', width: 80, depth: 30, pieces: [] };
    expect(getDoorInfoFromPieces(body)).toBeNull();
  });

  it('returns null when doorConfig but no porte pieces', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 1, poseType: 'enveloppante' },
      pieces: [{ id: 'j1', name: 'Joue', length: 100, width: 30, qty: 1, type: 'joue' }],
    };
    expect(getDoorInfoFromPieces(body)).toBeNull();
  });

  it('reads actual door piece dimensions for hinge count', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 1, poseType: 'enveloppante' },
      pieces: [
        // 100cm height, 40cm width → 2 by height (≤100cm), narrow → no bonus
        { id: 'p1', name: 'Porte', length: 100, width: 40, qty: 1, type: 'porte' },
      ],
    };
    const info = getDoorInfoFromPieces(body)!;
    expect(info.doorHeight).toBe(100);
    expect(info.doorWidth).toBe(40);
    expect(info.hingeCount).toBe(2); // 100cm ≤ 1000mm → 2
    expect(info.poseLabel).toContain('Enveloppante');
  });

  it('wide door gets +1 hinge bonus', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 1, poseType: 'enveloppante' },
      pieces: [
        // 80cm height × 65cm width, 1.8cm thick, 680 density
        // Weight: 80×65×1.8/1e6 * 680 = 6.4 kg → ceil(6.4/4) = 2 by weight
        // Height: 800mm ≤ 1000mm → 2 by height
        // Width > 60cm → +1 = 3
        { id: 'p1', name: 'Porte', length: 80, width: 65, qty: 1, type: 'porte' },
      ],
    };
    const info = getDoorInfoFromPieces(body, 1.8, 680)!;
    expect(info.hingeCount).toBe(3); // 2 + wide door bonus
  });

  it('calculates door weight', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 1, poseType: 'enveloppante' },
      pieces: [
        { id: 'p1', name: 'Porte', length: 100, width: 50, qty: 1, type: 'porte' },
      ],
    };
    // 100 × 50 × 1.8 cm = 9000 cm³ = 0.009 m³ × 680 kg/m³ = 6.12 kg
    const info = getDoorInfoFromPieces(body, 1.8, 680)!;
    expect(info.doorWeightKg).toBeCloseTo(6.1, 0);
  });

  it('heavy door gets more hinges by weight', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 1, poseType: 'enveloppante' },
      pieces: [
        // Small door but very thick/heavy panel
        { id: 'p1', name: 'Porte', length: 80, width: 50, qty: 1, type: 'porte' },
      ],
    };
    // With 2.5cm thick, 680 density → 80×50×2.5/1e6 * 680 = 6.8 kg → ceil(6.8/4) = 2
    // But with higher density (1200 kg/m³ — like MDF ): 80×50×2.5/1e6 * 1200 = 12 kg → ceil(12/4) = 3
    const info = getDoorInfoFromPieces(body, 2.5, 1200)!;
    expect(info.hingeCount).toBeGreaterThanOrEqual(3);
  });

  it('respects manually set small door dimensions', () => {
    const body: Body = {
      id: 'b1', name: 'Test', width: 80, depth: 30,
      doorConfig: { count: 2, poseType: 'demi-recouvrement' },
      pieces: [
        { id: 'p1', name: 'Porte G', length: 50, width: 40, qty: 1, type: 'porte' },
        { id: 'p2', name: 'Porte D', length: 50, width: 40, qty: 1, type: 'porte' },
      ],
    };
    const info = getDoorInfoFromPieces(body)!;
    expect(info.doorHeight).toBe(50);
    expect(info.hingeCount).toBe(2); // 50cm → 2 hinges
    expect(info.count).toBe(2);
  });
});
