import { describe, it, expect } from 'vitest';
import { normalizeProject } from '../normalizeProject';
import { createInitialState } from '../state';
// types used implicitly via createInitialState

// ---------------------------------------------------------------------------
// normalizeProject
// ---------------------------------------------------------------------------
describe('normalizeProject', () => {
  it('returns a valid state unchanged (idempotent)', () => {
    const state = createInitialState();
    // Ensure optional fields exist so normalizeProject doesn't add them
    state.sharedBoundaries = [false]; // 2 bodies → 1 boundary
    state.extraPanels = [];

    const result = normalizeProject(state);

    expect(result.kerf).toBe(state.kerf);
    expect(result.bodies.length).toBe(state.bodies.length);
    expect(result.sharedBoundaries).toEqual(state.sharedBoundaries);
    expect(result.panel).toEqual(state.panel);
    expect(result.project.wallWidth).toBe(state.project.wallWidth);

    // Applying twice yields the same result
    const result2 = normalizeProject(result);
    expect(result2).toEqual(result);
  });

  it('cleans orphan panelId references', () => {
    const state = createInitialState();
    state.extraPanels = [];
    // Set a panelId that does not exist in extraPanels
    state.bodies[0].pieces[0].panelId = 'nonexistent-panel';

    const result = normalizeProject(state);

    expect(result.bodies[0].pieces[0].panelId).toBeUndefined();
  });

  it('corrects qty < 1 to 1', () => {
    const state = createInitialState();
    state.bodies[0].pieces[0].qty = 0;
    state.bodies[0].pieces[1].qty = -5;

    const result = normalizeProject(state);

    expect(result.bodies[0].pieces[0].qty).toBe(1);
    expect(result.bodies[0].pieces[1].qty).toBe(1);
  });

  it('corrects negative piece dimensions', () => {
    const state = createInitialState();
    state.bodies[0].pieces[0].length = -10;
    state.bodies[0].pieces[0].width = -5;

    const result = normalizeProject(state);

    expect(result.bodies[0].pieces[0].length).toBeGreaterThanOrEqual(1);
    expect(result.bodies[0].pieces[0].width).toBeGreaterThanOrEqual(1);
  });

  it('creates sharedBoundaries when missing', () => {
    const state = createInitialState();
    delete (state as any).sharedBoundaries;

    const result = normalizeProject(state);

    // 2 bodies → 1 boundary entry
    expect(result.sharedBoundaries).toBeDefined();
    expect(result.sharedBoundaries).toHaveLength(1);
  });

  it('fixes sharedBoundaries with incorrect length (too short)', () => {
    const state = createInitialState();
    // 2 bodies → should have length 1, give it 0
    state.sharedBoundaries = [];

    const result = normalizeProject(state);

    expect(result.sharedBoundaries).toHaveLength(1);
    expect(result.sharedBoundaries![0]).toBe(false);
  });

  it('fixes sharedBoundaries with incorrect length (too long)', () => {
    const state = createInitialState();
    // 2 bodies → should have length 1, give it 3
    state.sharedBoundaries = [true, false, true];

    const result = normalizeProject(state);

    expect(result.sharedBoundaries).toHaveLength(1);
    expect(result.sharedBoundaries![0]).toBe(true);
  });

  it('corrects negative body dimensions', () => {
    const state = createInitialState();
    state.bodies[0].width = -50;
    state.bodies[0].depth = -20;

    const result = normalizeProject(state);

    expect(result.bodies[0].width).toBeGreaterThanOrEqual(1);
    expect(result.bodies[0].depth).toBeGreaterThanOrEqual(1);
  });

  it('corrects negative project dimensions', () => {
    const state = createInitialState();
    state.project.wallWidth = -100;
    state.project.ceilingHeight = -200;
    state.project.plinthHeight = -10;

    const result = normalizeProject(state);

    expect(result.project.wallWidth).toBeGreaterThanOrEqual(1);
    expect(result.project.ceilingHeight).toBeGreaterThanOrEqual(1);
    expect(result.project.plinthHeight).toBeGreaterThanOrEqual(0);
  });

  it('corrects panel dimensions below minimum', () => {
    const state = createInitialState();
    state.panel.width = -5;
    state.panel.height = 0;
    state.panel.thickness = -1;

    const result = normalizeProject(state);

    expect(result.panel.width).toBeGreaterThanOrEqual(10);
    expect(result.panel.height).toBeGreaterThanOrEqual(10);
    expect(result.panel.thickness).toBeGreaterThanOrEqual(0.1);
  });

  it('clamps kerf outside valid range', () => {
    const state = createInitialState();
    state.kerf = 10; // > 5

    const result = normalizeProject(state);

    expect(result.kerf).toBe(0.3); // default fallback
  });
});
