import { describe, expect, it, vi } from 'vitest';
import jsPDF from 'jspdf';
import { runPipeline, pipelineResultToAppState } from '../engine/pipeline';
import { analyzeProject } from '../projectAnalysis';
import { generatePdf } from '../pdf';
import type { ProjectIntent } from '../knowledge/types';

const INTENT: ProjectIntent = {
  furniture_type: 'bibliotheque',
  material_key: 'cp_bouleau',
  space: {
    width_mm: 1800,
    height_mm: 2100,
    depth_mm: 300,
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

describe('PDF dossier complet — pages plans cotés (T2)', () => {
  it('génère sans erreur sur un projet bibliothèque réel (smoke test)', async () => {
    const result = runPipeline(INTENT);
    const state = pipelineResultToAppState(result, INTENT.material_key);
    const analysis = analyzeProject(state);
    expect(state.bodies.length).toBeGreaterThan(0);
    expect(state.bodies[0].pieces.length).toBeGreaterThan(0);

    // Stub doc.save : évite le téléchargement DOM en environnement Node.
    const originalSave = jsPDF.prototype.save;
    jsPDF.prototype.save = vi.fn(function (this: jsPDF) {
      return this;
    }) as unknown as typeof jsPDF.prototype.save;

    let crashed = false;
    try {
      await generatePdf(state, analysis, { errors: [], warnings: [] }, []);
    } catch (e) {
      crashed = true;
      // Re-throw so the test reports the actual error message
      throw e;
    } finally {
      jsPDF.prototype.save = originalSave;
    }
    expect(crashed).toBe(false);
  });
});
