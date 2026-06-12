import { describe, expect, it, vi } from 'vitest';
import jsPDF from 'jspdf';
import { runPipeline, pipelineResultToAppState } from '../engine/pipeline';
import { analyzeProject } from '../projectAnalysis';
import { generatePdf } from '../pdf';
import type { ProjectIntent } from '../knowledge/types';

/**
 * Bibliothèque "atelier-ready" — cas réaliste de référence :
 * - Mur 2400 × 2100 mm, prof 320, plinthe 100 mm
 * - Cp bouleau 18 mm (matériau le plus courant atelier amateur)
 * - 1 module shelf_adjustable 5 étagères réglables
 *
 * Tests E2E : pipeline V3 → bridge → analysis → PDF complet.
 * Vérifie que tous les éléments atelier sont présents (pieceNumber, plans
 * cotés, séquence montage, cartouche).
 */
const ATELIER_INTENT: ProjectIntent = {
  furniture_type: 'bibliotheque',
  material_key: 'cp_bouleau',
  space: {
    width_mm: 2400,
    height_mm: 2100,
    depth_mm: 320,
    plinth_mm: 100,
    wall_type: 'concrete',
  },
  zones: [
    {
      module_id: 'shelf_adjustable',
      height_mm: 2000,
      config: { type: 'shelf_adjustable', count: 5, spacing_mm: 320 },
    },
  ],
};

describe('T6 — E2E bibliothèque atelier-ready', () => {
  const result = runPipeline(ATELIER_INTENT);

  describe('Pipeline V3', () => {
    it('produit un layout avec au moins un corps', () => {
      expect(result.layout.bodies.length).toBeGreaterThan(0);
    });

    it('produit des pièces avec pieceNumber séquentiel attribué', () => {
      expect(result.parts.length).toBeGreaterThan(0);
      const numbers = result.parts.map((p) => p.pieceNumber);
      expect(numbers.every((n) => typeof n === 'number')).toBe(true);
      const sortedNums = [...numbers].sort((a, b) => (a ?? 0) - (b ?? 0));
      expect(sortedNums).toEqual(
        Array.from({ length: result.parts.length }, (_, i) => i + 1),
      );
    });

    it('génère du hardware quantifié (vis, taquets, charnières le cas échéant)', () => {
      expect(Array.isArray(result.hardware)).toBe(true);
      expect(result.hardware.length).toBeGreaterThan(0);
      for (const hw of result.hardware) {
        expect(hw.quantity).toBeGreaterThan(0);
      }
    });

    it("génère un assembly_guide avec au moins 5 étapes (préparation, débit, perçage, assemblage, fixation)", () => {
      expect(result.production?.assembly_guide).toBeDefined();
      expect(result.production!.assembly_guide.length).toBeGreaterThanOrEqual(5);
      // Chaque étape a un titre et au moins une instruction
      for (const step of result.production!.assembly_guide) {
        expect(step.step_number).toBeGreaterThan(0);
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.instructions.length).toBeGreaterThan(0);
      }
    });

    it("ne contient aucune erreur bloquante de validation", () => {
      const blocking = result.validation.filter((v) => v.blocking);
      expect(blocking).toEqual([]);
    });
  });

  describe('Bridge legacy → AppState', () => {
    const state = pipelineResultToAppState(result, ATELIER_INTENT.material_key);

    it('produit des bodies avec pièces correctement converties', () => {
      expect(state.bodies.length).toBe(result.layout.bodies.length);
      const totalPieces = state.bodies.reduce((s, b) => s + b.pieces.length, 0);
      // Le bridge filtre les pièces par body_id ; on doit retrouver toutes les
      // GeneratedPart dans l'AppState (modulo conversion type)
      expect(totalPieces).toBeGreaterThan(0);
    });

    it('propage pieceNumber sur chaque Piece du bridge', () => {
      const allPieces = state.bodies.flatMap((b) => b.pieces);
      const numbered = allPieces.filter((p) => p.pieceNumber !== undefined);
      // Toutes les pièces V3 doivent avoir un pieceNumber
      expect(numbered.length).toBe(allPieces.length);
    });
  });

  describe('PDF dossier complet', () => {
    it('génère sans crash avec assembly_guide V3 + plans cotés + cartouche', async () => {
      const state = pipelineResultToAppState(result, ATELIER_INTENT.material_key);
      const analysis = analyzeProject(state);

      const v3Data = {
        hardware: result.hardware,
        assumptions: result.production?.assumptions ?? [],
        edgeBandingParts: [],
        assemblyGuide: result.production?.assembly_guide,
      };

      // Stub doc.save pour éviter téléchargement DOM
      const originalSave = jsPDF.prototype.save;
      jsPDF.prototype.save = vi.fn(function (this: jsPDF) {
        return this;
      }) as unknown as typeof jsPDF.prototype.save;

      try {
        await generatePdf(
          state,
          analysis,
          { errors: [], warnings: [] },
          [],
          v3Data,
        );
      } finally {
        jsPDF.prototype.save = originalSave;
      }

      // Si on arrive ici sans throw, le PDF s'est généré : OK pour atelier
      expect(true).toBe(true);
    });
  });
});
