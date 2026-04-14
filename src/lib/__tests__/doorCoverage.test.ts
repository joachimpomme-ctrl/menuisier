import { describe, expect, it } from 'vitest';
import { resolveDoorCoverage } from '../domain';
import type { Body, DoorConfig } from '../../types';

function makeBody(pieces: Body['pieces'] = []): Body {
  return {
    id: 'b1',
    name: 'Bibliothèque',
    width: 80,
    depth: 30,
    pieces,
  };
}

describe('resolveDoorCoverage', () => {
  it('uses a realistic default height for bottom partial doors without a fixed shelf', () => {
    const body = makeBody();
    const config: DoorConfig = { count: 2, poseType: 'demi-recouvrement', position: 'bas' };

    const result = resolveDoorCoverage(body, 240, 1.8, config);

    expect(result.coverageHeight).toBe(96);
    expect(result.splitPosY).toBe(96);
  });

  it('uses a realistic default height for top partial doors without a fixed shelf', () => {
    const body = makeBody();
    const config: DoorConfig = { count: 2, poseType: 'demi-recouvrement', position: 'haut' };

    const result = resolveDoorCoverage(body, 240, 1.8, config);

    expect(result.coverageHeight).toBe(96);
    expect(result.splitPosY).toBe(144);
  });

  it('ignores stale full-height splitPosY when switching from full height to bottom doors', () => {
    const body = makeBody();
    const config: DoorConfig = { count: 2, poseType: 'demi-recouvrement', position: 'bas', splitPosY: 240 };

    const result = resolveDoorCoverage(body, 240, 1.8, config);

    expect(result.coverageHeight).toBe(96);
    expect(result.splitPosY).toBe(96);
  });

  it('uses a fixed shelf position when available', () => {
    const body = makeBody([
      { id: 't1', name: 'Tablette fixe', length: 76.4, width: 30, qty: 1, type: 'tablette-fixe', posY: 88 },
    ]);
    const config: DoorConfig = { count: 2, poseType: 'demi-recouvrement', position: 'bas' };

    const result = resolveDoorCoverage(body, 240, 1.8, config);

    expect(result.coverageHeight).toBe(88);
    expect(result.splitPosY).toBe(88);
  });
});
