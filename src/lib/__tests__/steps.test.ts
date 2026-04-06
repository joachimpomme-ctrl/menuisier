import { describe, it, expect } from 'vitest';
import { generateSteps } from '../steps';
import { createInitialState } from '../state';
// types used implicitly via createInitialState

// ---------------------------------------------------------------------------
// generateSteps
// ---------------------------------------------------------------------------
describe('generateSteps', () => {
  it('generates non-empty steps for a valid state', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const steps = generateSteps(state);

    expect(steps.length).toBeGreaterThan(0);
    steps.forEach((step) => {
      expect(step.items.length).toBeGreaterThan(0);
    });
  });

  it('all step titles are non-empty strings', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const steps = generateSteps(state);

    steps.forEach((step) => {
      expect(typeof step.title).toBe('string');
      expect(step.title.length).toBeGreaterThan(0);
    });
  });

  it('with doors: steps mention hinges (charnières)', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    // Add door config and door pieces to the first body
    state.bodies[0].doorConfig = { count: 1, poseType: 'enveloppante' };
    state.bodies[0].pieces.push({
      id: 'door-1',
      name: 'Porte',
      length: 200,
      width: 96.4,
      qty: 1,
      type: 'porte',
    });

    const steps = generateSteps(state);

    const allText = steps.map((s) => s.title + ' ' + s.items.join(' ')).join(' ');
    expect(allText.toLowerCase()).toContain('charnière');
  });

  it('without doors: no hinge step (4b)', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];
    // No doorConfig by default

    const steps = generateSteps(state);

    const hingeStep = steps.find((s) => s.title.includes('4b'));
    expect(hingeStep).toBeUndefined();
  });

  it('hinge positions mentioned match actual door pieces', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    // Add door config to body 0
    state.bodies[0].doorConfig = { count: 1, poseType: 'enveloppante' };
    state.bodies[0].pieces.push({
      id: 'door-1',
      name: 'Porte',
      length: 150,
      width: 96.4,
      qty: 1,
      type: 'porte',
    });

    const steps = generateSteps(state);

    // Find step 4b (hinge drilling)
    const hingeStep = steps.find((s) => s.title.includes('4b'));
    expect(hingeStep).toBeDefined();

    // 150cm door → 4 hinges (120 ≤ h < 180)
    // Positions: 80mm from bottom, 1420mm from bottom (= 1500-80), plus 2 intermediate
    const positionsText = hingeStep!.items.join(' ');
    expect(positionsText).toContain('80 mm');
    expect(positionsText).toContain('1420 mm');
  });
});
