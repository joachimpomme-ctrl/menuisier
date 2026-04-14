import { describe, expect, it } from 'vitest';
import { formatDrillingPlan } from '../formatDrillingPlan';
import type { DrillingOp, GeneratedPart } from '../../knowledge/types';

function makePart(overrides: Partial<GeneratedPart> = {}): GeneratedPart {
  return {
    id: overrides.id ?? 'part-1',
    name: overrides.name ?? 'Pièce test',
    length_mm: overrides.length_mm ?? 1000,
    width_mm: overrides.width_mm ?? 500,
    thickness_mm: overrides.thickness_mm ?? 18,
    qty: overrides.qty ?? 1,
    type: overrides.type ?? 'joue',
    body_id: overrides.body_id ?? 'body-1',
    locked: overrides.locked ?? false,
    drilling: overrides.drilling,
    position: overrides.position,
    edge_banding: overrides.edge_banding,
    standard_part_id: overrides.standard_part_id,
  };
}

function makeOp(overrides: Partial<DrillingOp> = {}): DrillingOp {
  return {
    type: overrides.type ?? 'system_32',
    x_mm: overrides.x_mm ?? 37,
    y_mm: overrides.y_mm ?? 100,
    diameter_mm: overrides.diameter_mm ?? 5,
    depth_mm: overrides.depth_mm ?? 10,
    face: overrides.face ?? 'front',
  };
}

describe('formatDrillingPlan', () => {
  it('groups drilling operations by type', () => {
    const part = makePart({
      id: 'j1',
      name: 'Joue gauche',
      drilling: [
        ...Array.from({ length: 20 }, (_, index) => makeOp({ type: 'system_32', y_mm: index * 32 })),
        ...Array.from({ length: 4 }, (_, index) => makeOp({ type: 'cam_15', x_mm: 9, y_mm: index * 100, diameter_mm: 7, depth_mm: 0 })),
      ],
    });

    expect(formatDrillingPlan([part])).toEqual([
      {
        partId: 'j1',
        partName: 'Joue gauche',
        qty: 1,
        groups: [
          { label: 'Système 32 (taquets)', count: 20, diameter_mm: 5, depth_mm: 10 },
          { label: 'Confirmat', count: 4, diameter_mm: 7, depth_mm: 0 },
        ],
        totalOps: 24,
      },
    ]);
  });

  it('filters parts without drilling', () => {
    const parts = [
      makePart({ id: 'a', name: 'Sans perçage vide', drilling: [] }),
      makePart({ id: 'b', name: 'Sans perçage undefined', drilling: undefined }),
      makePart({ id: 'c', name: 'Avec perçage', drilling: [makeOp(), makeOp({ y_mm: 132 })] }),
    ];

    const result = formatDrillingPlan(parts);

    expect(result).toHaveLength(1);
    expect(result[0].partId).toBe('c');
  });

  it('returns an empty array for empty inputs or parts without drilling', () => {
    expect(formatDrillingPlan([])).toEqual([]);
    expect(formatDrillingPlan([
      makePart({ drilling: [] }),
      makePart({ id: 'b', drilling: undefined }),
    ])).toEqual([]);
  });

  it('uses the correct French labels for each drilling type', () => {
    const part = makePart({
      drilling: [
        makeOp({ type: 'system_32' }),
        makeOp({ type: 'hinge_cup_35', diameter_mm: 35, depth_mm: 12, face: 'back' }),
        makeOp({ type: 'dowel_8', diameter_mm: 8, depth_mm: 30 }),
        makeOp({ type: 'shelf_pin_5', diameter_mm: 5, depth_mm: 10 }),
        makeOp({ type: 'cam_15', diameter_mm: 15, depth_mm: 12 }),
        makeOp({ type: 'other', diameter_mm: 3, depth_mm: 5 }),
      ],
    });

    expect(formatDrillingPlan([part])[0].groups.map((group) => group.label)).toEqual([
      'Système 32 (taquets)',
      'Cup charnière Ø35',
      'Tourillon Ø8',
      'Taquet Ø5',
      'Confirmat',
      'Autre',
    ]);
  });

  it('preserves part quantity in the summary', () => {
    const part = makePart({
      name: 'Porte (×2)',
      qty: 2,
      drilling: [
        makeOp({ type: 'hinge_cup_35', diameter_mm: 35, depth_mm: 12 }),
        makeOp({ type: 'hinge_cup_35', diameter_mm: 35, depth_mm: 12, y_mm: 900 }),
      ],
    });

    expect(formatDrillingPlan([part])[0].qty).toBe(2);
  });
});
