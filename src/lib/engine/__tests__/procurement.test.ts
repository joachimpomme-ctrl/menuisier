/**
 * Procurement — tests du contrat métier.
 *
 * On vérifie :
 *   - `decideForPart` applique la règle heuristique correctement
 *   - `resolveProcurement` produit une `ProcurementView` cohérente
 *     (bijection parts/decisions, summary pondéré par qty)
 *   - `runPipeline` attache toujours une `procurement` non-nulle,
 *     même en cas d'échec intent
 *   - les adaptateurs `@deprecated` restent alignés avec le nouveau contrat
 *     (tant qu'ils existent, ils ne doivent pas dériver).
 */

import { describe, it, expect } from 'vitest';
import type { GeneratedPart, ProjectIntent } from '../../knowledge/types';
import {
  decideForPart,
  resolveProcurement,
  classifyProcurement,
  summarizeProcurement,
  emptyProcurementView,
} from '../procurement';
import { runPipeline } from '../pipeline';

function mkDrill() {
  return { type: 'dowel_8' as const, x_mm: 10, y_mm: 10, diameter_mm: 8, depth_mm: 12, face: 'edge_top' as const };
}

function mkPart(p: Partial<GeneratedPart> & { id: string }): GeneratedPart {
  return {
    id: p.id,
    name: p.name ?? 'Pièce',
    type: p.type ?? 'joue',
    body_id: p.body_id ?? 'B1',
    length_mm: p.length_mm ?? 1000,
    width_mm: p.width_mm ?? 300,
    thickness_mm: p.thickness_mm ?? 18,
    qty: p.qty ?? 1,
    edge_banding: p.edge_banding,
    drilling: p.drilling,
    standard_part_id: p.standard_part_id,
    position: p.position,
    locked: p.locked ?? false,
  };
}

// ---------------------------------------------------------------------------
// decideForPart — règle unitaire
// ---------------------------------------------------------------------------

describe('decideForPart (heuristique)', () => {
  it('sans standard_part_id → cut_from_sheet, pas de standard_part_id', () => {
    const d = decideForPart(mkPart({ id: 'p1' }));
    expect(d.status).toBe('cut_from_sheet');
    expect(d.standard_part_id).toBeUndefined();
    expect(d.source).toBe('heuristic');
    expect(d.reason).toMatch(/débiter/i);
  });

  it('avec standard_part_id sans opération → buy_exact', () => {
    const d = decideForPart(mkPart({ id: 'p2', standard_part_id: 'REF-1' }));
    expect(d.status).toBe('buy_exact');
    expect(d.standard_part_id).toBe('REF-1');
    expect(d.rework_ops).toEqual([]);
  });

  it('avec standard_part_id + drilling → buy_and_rework (drilling)', () => {
    const d = decideForPart(
      mkPart({
        id: 'p3',
        standard_part_id: 'REF-2',
        drilling: [mkDrill()],
      }),
    );
    expect(d.status).toBe('buy_and_rework');
    expect(d.rework_ops).toContain('drilling');
    expect(d.rework_ops).not.toContain('edge_banding');
  });

  it('avec standard_part_id + edge_banding → buy_and_rework (edge_banding)', () => {
    const d = decideForPart(
      mkPart({
        id: 'p4',
        standard_part_id: 'REF-3',
        edge_banding: ['front'],
      }),
    );
    expect(d.status).toBe('buy_and_rework');
    expect(d.rework_ops).toEqual(['edge_banding']);
  });

  it('avec drilling ET edge_banding → les deux ops listées', () => {
    const d = decideForPart(
      mkPart({
        id: 'p5',
        standard_part_id: 'REF-4',
        drilling: [mkDrill()],
        edge_banding: ['front', 'back'],
      }),
    );
    expect(d.status).toBe('buy_and_rework');
    expect(d.rework_ops).toEqual(['drilling', 'edge_banding']);
  });

  it('SANS standard_part_id mais AVEC drilling → reste cut_from_sheet (pas acheté)', () => {
    // Invariant métier : on n'achète pas si le catalogue ne connaît pas la pièce.
    const d = decideForPart(
      mkPart({
        id: 'p6',
        drilling: [mkDrill()],
      }),
    );
    expect(d.status).toBe('cut_from_sheet');
    // Mais on mémorise quand même les ops à effectuer après débit.
    expect(d.rework_ops).toContain('drilling');
  });
});

// ---------------------------------------------------------------------------
// resolveProcurement — agrégation + index
// ---------------------------------------------------------------------------

describe('resolveProcurement', () => {
  it('produit une bijection parts ↔ decisions', () => {
    const parts = [
      mkPart({ id: 'a' }),
      mkPart({ id: 'b', standard_part_id: 'X' }),
      mkPart({ id: 'c', standard_part_id: 'Y', edge_banding: ['front'] }),
    ];
    const view = resolveProcurement(parts);
    expect(view.decisions).toHaveLength(3);
    expect(Object.keys(view.byPartId).sort()).toEqual(['a', 'b', 'c']);
    // L'ordre de decisions est aligné sur parts
    expect(view.decisions[0].part_id).toBe('a');
    expect(view.decisions[1].part_id).toBe('b');
    expect(view.decisions[2].part_id).toBe('c');
  });

  it('summary pondère par qty', () => {
    const parts = [
      mkPart({ id: 'a', qty: 2 }), // cut_from_sheet ×2
      mkPart({ id: 'b', qty: 3, standard_part_id: 'X' }), // buy_exact ×3
      mkPart({
        id: 'c',
        qty: 4,
        standard_part_id: 'Y',
        drilling: [mkDrill()],
      }), // buy_and_rework ×4
    ];
    const { summary } = resolveProcurement(parts);
    expect(summary).toEqual({
      cut_from_sheet: 2,
      buy_exact: 3,
      buy_and_rework: 4,
      total: 9,
    });
  });

  it('byPartId pointe sur les mêmes objets que decisions[]', () => {
    const parts = [mkPart({ id: 'a' })];
    const view = resolveProcurement(parts);
    expect(view.byPartId['a']).toBe(view.decisions[0]);
  });

  it('vue vide sur parts vide', () => {
    const view = resolveProcurement([]);
    expect(view.decisions).toEqual([]);
    expect(view.byPartId).toEqual({});
    expect(view.summary.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// emptyProcurementView — utilisable dans les branches pipeline-avorté
// ---------------------------------------------------------------------------

describe('emptyProcurementView', () => {
  it('retourne une vue parfaitement vide', () => {
    const v = emptyProcurementView();
    expect(v.decisions).toEqual([]);
    expect(v.byPartId).toEqual({});
    expect(v.summary).toEqual({
      buy_exact: 0,
      buy_and_rework: 0,
      cut_from_sheet: 0,
      total: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// runPipeline — procurement toujours présent
// ---------------------------------------------------------------------------

describe('runPipeline → procurement', () => {
  it('attache une ProcurementView cohérente avec result.parts', () => {
    const intent: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      space: { width_mm: 800, height_mm: 2000, depth_mm: 300, plinth_mm: 0, wall_type: 'concrete' },
      zones: [
        {
          module_id: 'shelf_adjustable',
          height_mm: 2000,
          config: { type: 'shelf_adjustable', count: 3, spacing_mm: 500 },
        },
      ],
    };
    const result = runPipeline(intent);

    // Chaque pièce a une décision indexée par son id.
    for (const p of result.parts) {
      expect(result.procurement.byPartId[p.id]).toBeDefined();
      expect(result.procurement.byPartId[p.id].part_id).toBe(p.id);
    }

    // Le summary totalise bien les quantités.
    const totalQty = result.parts.reduce((s, p) => s + p.qty, 0);
    expect(result.procurement.summary.total).toBe(totalQty);
  });

  it("retourne une vue vide quand l'intent est invalide (early return)", () => {
    const invalid: ProjectIntent = {
      furniture_type: 'bibliotheque',
      material_key: 'cp_bouleau',
      // dimensions nulles -> validation intent échoue
      space: { width_mm: 0, height_mm: 0, depth_mm: 0, plinth_mm: 0, wall_type: 'concrete' },
      zones: [],
    };
    const result = runPipeline(invalid);
    expect(result.parts).toHaveLength(0);
    expect(result.procurement.decisions).toHaveLength(0);
    expect(result.procurement.summary.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Adaptateurs deprecated — restent alignés
// ---------------------------------------------------------------------------

describe('classifyProcurement / summarizeProcurement (adaptateurs @deprecated)', () => {
  it('classifyProcurement renvoie le même status que decideForPart', () => {
    const p = mkPart({ id: 'x', standard_part_id: 'REF', edge_banding: ['left'] });
    expect(classifyProcurement(p)).toBe(decideForPart(p).status);
  });

  it('summarizeProcurement est équivalent à resolveProcurement().summary', () => {
    const parts = [
      mkPart({ id: 'a', qty: 2 }),
      mkPart({ id: 'b', qty: 3, standard_part_id: 'X' }),
    ];
    expect(summarizeProcurement(parts)).toEqual(resolveProcurement(parts).summary);
  });
});
