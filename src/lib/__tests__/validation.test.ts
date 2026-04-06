import { describe, it, expect } from 'vitest';
import { validate } from '../validation';
import type { AppState } from '../../types';
import { createInitialState } from '../state';

function makeState(overrides?: Partial<AppState>): AppState {
  return { ...createInitialState('cp_bouleau'), ...overrides };
}

describe('validate', () => {
  it('returns results for default initial state', () => {
    const result = validate(makeState());
    // Should return a valid ValidationResult with errors and warnings arrays
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('detects total width exceeding wall width', () => {
    const st = makeState({ project: { ...createInitialState().project, wallWidth: 100 } });
    // Default bodies total > 100cm
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('Largeur physique totale'))).toBe(true);
  });

  it('detects invalid panel thickness', () => {
    const st = makeState({ panel: { width: 250, height: 122, thickness: 0.1 } });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('Épaisseur panneau'))).toBe(true);
  });

  it('detects invalid panel dimensions', () => {
    const st = makeState({ panel: { width: 0, height: 122, thickness: 1.8 } });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('Dimensions du panneau brut invalides'))).toBe(true);
  });

  it('warns when no bodies are defined', () => {
    const st = makeState({ bodies: [] });
    const result = validate(st);
    expect(result.warnings.some((w) => w.includes('Aucun corps défini'))).toBe(true);
  });

  it('warns when a body has no pieces', () => {
    const st = makeState({
      bodies: [{ id: '1', name: 'Corps 1', width: 80, depth: 30, pieces: [] }],
    });
    const result = validate(st);
    expect(result.warnings.some((w) => w.includes('aucune pièce'))).toBe(true);
  });

  it('detects pieces larger than panel', () => {
    const st = makeState({
      panel: { width: 100, height: 50, thickness: 1.8 },
      bodies: [{
        id: '1', name: 'C1', width: 80, depth: 30,
        pieces: [{
          id: 'p1', name: 'Grosse pièce', length: 120, width: 60, qty: 1, type: 'tablette-fixe',
        }],
      }],
    });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('ne rentre pas dans le panneau'))).toBe(true);
  });

  it('detects pieces with zero dimensions', () => {
    const st = makeState({
      bodies: [{
        id: '1', name: 'C1', width: 80, depth: 30,
        pieces: [{
          id: 'p1', name: 'Bad', length: 0, width: 30, qty: 1, type: 'tablette-fixe',
        }],
      }],
    });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('dimensions invalides'))).toBe(true);
  });

  it('detects pieces with zero quantity', () => {
    const st = makeState({
      bodies: [{
        id: '1', name: 'C1', width: 80, depth: 30,
        pieces: [{
          id: 'p1', name: 'NoQty', length: 50, width: 30, qty: 0, type: 'tablette-fixe',
        }],
      }],
    });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('quantité invalide'))).toBe(true);
  });

  it('accounts for shared boundaries in total width', () => {
    const th = 1.8;
    const st = makeState({
      panel: { width: 250, height: 122, thickness: th },
      project: { ...createInitialState().project, wallWidth: 300 },
      bodies: [
        { id: '1', name: 'C1', width: 100, depth: 30, pieces: [] },
        { id: '2', name: 'C2', width: 100, depth: 30, pieces: [] },
      ],
      sharedBoundaries: [true],
    });
    const result = validate(st);
    // Total = 100 + 100 - 1.8 = 198.2, which is < 300
    // Should have "espace résiduel" warning, not an error
    expect(result.errors.filter((e) => e.includes('Largeur physique'))).toHaveLength(0);
  });

  it('validates pieces against their assigned extra panel', () => {
    const st = makeState({
      panel: { width: 250, height: 122, thickness: 1.8 },
      extraPanels: [{ id: 'small', label: 'HDF 3mm', width: 100, height: 50, thickness: 0.3, price: 5 }],
      bodies: [{
        id: '1', name: 'C1', width: 80, depth: 30,
        pieces: [{
          id: 'p1', name: 'Fond', length: 120, width: 60, qty: 1, type: 'fond', panelId: 'small',
        }],
      }],
    });
    const result = validate(st);
    expect(result.errors.some((e) => e.includes('Fond') && e.includes('HDF 3mm'))).toBe(true);
  });
});
