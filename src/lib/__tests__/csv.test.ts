import { describe, it, expect } from 'vitest';
import { generateCutListCsv } from '../csv';
import { createInitialState } from '../state';
import type { PieceWithBody, PanelDef } from '../../types';

// ---------------------------------------------------------------------------
// Helper: build pieces list from state (same logic the app uses)
// ---------------------------------------------------------------------------
function buildPiecesFromState() {
  const state = createInitialState();
  const allPieces: PieceWithBody[] = state.bodies.flatMap((b) =>
    b.pieces.map((p) => ({ ...p, bodyName: b.name, bodyId: b.id })),
  );
  const defaultPanel: PanelDef = {
    id: 'default',
    label: 'Principal',
    width: state.panel.width,
    height: state.panel.height,
    thickness: state.panel.thickness,
    price: state.costConfig.panelPrice,
  };
  return { state, allPieces, allPanelDefs: [defaultPanel] };
}

// ---------------------------------------------------------------------------
// generateCutListCsv
// ---------------------------------------------------------------------------
describe('generateCutListCsv', () => {
  it('generates a non-empty CSV', () => {
    const { allPieces, allPanelDefs, state } = buildPiecesFromState();

    const csv = generateCutListCsv(allPieces, allPanelDefs, state);

    expect(csv.length).toBeGreaterThan(0);
  });

  it('contains expected headers', () => {
    const { allPieces, allPanelDefs, state } = buildPiecesFromState();

    const csv = generateCutListCsv(allPieces, allPanelDefs, state);
    const headerLine = csv.split('\n')[0];

    expect(headerLine).toContain('Corps');
    expect(headerLine).toContain('Pièce');
    expect(headerLine).toContain('Type');
    expect(headerLine).toContain('Longueur');
    expect(headerLine).toContain('Largeur');
    expect(headerLine).toContain('Qté');
    expect(headerLine).toContain('Panneau');
    expect(headerLine).toContain('Épaisseur');
  });

  it('contains piece names from the project', () => {
    const { allPieces, allPanelDefs, state } = buildPiecesFromState();

    const csv = generateCutListCsv(allPieces, allPanelDefs, state);

    // Check that every piece name appears in the CSV
    for (const p of allPieces) {
      expect(csv).toContain(p.name);
    }
  });

  it('number of data rows matches number of pieces', () => {
    const { allPieces, allPanelDefs, state } = buildPiecesFromState();

    const csv = generateCutListCsv(allPieces, allPanelDefs, state);
    const lines = csv.split('\n');

    // First line is header, rest are data
    const dataLines = lines.slice(1).filter((l) => l.trim().length > 0);
    expect(dataLines.length).toBe(allPieces.length);
  });
});
