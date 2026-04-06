import { describe, it, expect } from 'vitest';
import { analyzeProject } from '../projectAnalysis';
import type { AppState } from '../../types';
import { createInitialState } from '../state';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeState(overrides?: Partial<AppState>): AppState {
  return { ...createInitialState('cp_bouleau'), ...overrides };
}

// ---------------------------------------------------------------------------
// analyzeProject
// ---------------------------------------------------------------------------
describe('analyzeProject', () => {
  it('empty project returns zero panels and zero cost', () => {
    const state = makeState({ bodies: [] });
    const result = analyzeProject(state);

    expect(result.totalPanelCount).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.totalPieces).toBe(0);
    expect(result.panels).toHaveLength(0);
    expect(result.weightKg).toBe(0);
    expect(result.avgEfficiency).toBe(0);
  });

  it('single body with pieces produces correct panel count', () => {
    const state = makeState({
      bodies: [{
        id: 'b1', name: 'Corps 1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue G', length: 180, width: 30, qty: 2, type: 'joue' },
          { id: 't1', name: 'Tablette', length: 76.4, width: 30, qty: 3, type: 'tablette-fixe' },
        ],
      }],
    });
    const result = analyzeProject(state);

    expect(result.panels.length).toBeGreaterThanOrEqual(1);
    expect(result.totalPanelCount).toBeGreaterThanOrEqual(1);
    expect(result.totalPieces).toBe(5); // 2 + 3
    expect(result.allPieces).toHaveLength(2); // 2 piece entries (qty is separate)
  });

  it('multi-panel pieces produce separate nesting per panel type', () => {
    const state = makeState({
      extraPanels: [{ id: 'hdf3', label: 'HDF 3mm', width: 250, height: 122, thickness: 0.3, price: 5 }],
      bodies: [{
        id: 'b1', name: 'Corps 1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 180, width: 30, qty: 2, type: 'joue' },
          { id: 'f1', name: 'Fond', length: 200, width: 80, qty: 1, type: 'fond', panelId: 'hdf3' },
        ],
      }],
    });
    const result = analyzeProject(state);

    // Should have 2 panel groups: default and hdf3
    expect(result.panels).toHaveLength(2);

    const defaultPanel = result.panels.find(p => p.panelDef.id === 'default');
    const hdfPanel = result.panels.find(p => p.panelDef.id === 'hdf3');
    expect(defaultPanel).toBeDefined();
    expect(hdfPanel).toBeDefined();

    // Default panel has the joue pieces
    expect(defaultPanel!.pieces).toHaveLength(1);
    expect(defaultPanel!.pieces[0].type).toBe('joue');

    // HDF panel has the fond piece
    expect(hdfPanel!.pieces).toHaveLength(1);
    expect(hdfPanel!.pieces[0].type).toBe('fond');
  });

  it('cost calculation matches sum of panel costs', () => {
    const state = makeState({
      costConfig: { panelPrice: 50 },
      extraPanels: [{ id: 'hdf3', label: 'HDF 3mm', width: 250, height: 122, thickness: 0.3, price: 8 }],
      bodies: [{
        id: 'b1', name: 'Corps 1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 180, width: 30, qty: 2, type: 'joue' },
          { id: 'f1', name: 'Fond', length: 100, width: 60, qty: 1, type: 'fond', panelId: 'hdf3' },
        ],
      }],
    });
    const result = analyzeProject(state);

    const sumOfPanelCosts = result.panels.reduce((s, p) => s + p.cost, 0);
    expect(result.totalCost).toBe(sumOfPanelCosts);
    expect(result.totalCost).toBeGreaterThan(0);
  });

  it('weight calculation uses correct panel thickness per piece', () => {
    const state = makeState({
      extraPanels: [{ id: 'hdf3', label: 'HDF 3mm', width: 250, height: 122, thickness: 0.3, price: 5 }],
      bodies: [{
        id: 'b1', name: 'Corps 1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 100, width: 30, qty: 1, type: 'joue' },
          { id: 'f1', name: 'Fond', length: 100, width: 30, qty: 1, type: 'fond', panelId: 'hdf3' },
        ],
      }],
    });
    const result = analyzeProject(state);

    // Weight should be > 0 and the fond should contribute less weight (thinner panel)
    expect(result.weightKg).toBeGreaterThan(0);

    // Compare with a state where the fond uses the main panel instead
    const stateThick = makeState({
      bodies: [{
        id: 'b1', name: 'Corps 1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 100, width: 30, qty: 1, type: 'joue' },
          { id: 'f1', name: 'Fond', length: 100, width: 30, qty: 1, type: 'fond' },
        ],
      }],
    });
    const resultThick = analyzeProject(stateThick);

    // The thick version should weigh more
    expect(resultThick.weightKg).toBeGreaterThan(result.weightKg);
  });

  it('configured flag is false when all prices are 0', () => {
    const state = makeState({
      costConfig: { panelPrice: 0 },
      bodies: [{
        id: 'b1', name: 'C1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 100, width: 30, qty: 1, type: 'joue' },
        ],
      }],
    });
    const result = analyzeProject(state);
    expect(result.configured).toBe(false);
  });

  it('configured flag is true when main panel price > 0', () => {
    const state = makeState({
      costConfig: { panelPrice: 50 },
      bodies: [{
        id: 'b1', name: 'C1', width: 80, depth: 30,
        pieces: [
          { id: 'j1', name: 'Joue', length: 100, width: 30, qty: 1, type: 'joue' },
        ],
      }],
    });
    const result = analyzeProject(state);
    expect(result.configured).toBe(true);
  });

  it('handles default initial state correctly', () => {
    const state = createInitialState();
    const result = analyzeProject(state);

    // Default state has 2 bodies with pieces
    expect(result.totalPieces).toBeGreaterThan(0);
    expect(result.totalPanelCount).toBeGreaterThanOrEqual(1);
    expect(result.weightKg).toBeGreaterThan(0);
    expect(result.avgEfficiency).toBeGreaterThan(0);
    expect(result.avgEfficiency).toBeLessThanOrEqual(100);
  });

  it('totalPanelCount equals sum of individual panel counts', () => {
    const state = createInitialState();
    const result = analyzeProject(state);
    const sum = result.panels.reduce((s, p) => s + p.panelCount, 0);
    expect(result.totalPanelCount).toBe(sum);
  });
});
