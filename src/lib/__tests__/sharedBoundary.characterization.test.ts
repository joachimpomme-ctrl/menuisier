import { describe, expect, it } from 'vitest';
import { createInitialState } from '../state';
import { bodyActions } from '../actions';

describe('shared boundary characterization', () => {
  it('enabling a shared boundary removes the left joues from the right body', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const next = bodyActions.toggleSharing(state, 0, true);
    const rightBody = next.bodies[1];
    const leftNamedJoues = rightBody.pieces.filter(
      (piece) => piece.type === 'joue' && /gauche/i.test(piece.name),
    );

    expect(next.sharedBoundaries).toEqual([true]);
    expect(leftNamedJoues).toHaveLength(0);
  });

  it('enabling a shared boundary marks the right joue of the left body as commune', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const next = bodyActions.toggleSharing(state, 0, true);
    const leftBody = next.bodies[0];
    const communeJoues = leftBody.pieces.filter(
      (piece) => piece.type === 'joue' && piece.name.includes('(commune)'),
    );

    expect(communeJoues.length).toBeGreaterThan(0);
    expect(communeJoues.every((piece) => piece.width === 36)).toBe(true);
  });

  it('disabling a shared boundary restores named left joues on the right body', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const enabled = bodyActions.toggleSharing(state, 0, true);
    const disabled = bodyActions.toggleSharing(enabled, 0, false);
    const rightBody = disabled.bodies[1];
    const leftNamedJoues = rightBody.pieces.filter(
      (piece) => piece.type === 'joue' && /gauche/i.test(piece.name),
    );

    expect(disabled.sharedBoundaries).toEqual([false]);
    expect(leftNamedJoues.length).toBeGreaterThan(0);
  });

  it('changing the right body depth updates the shared joue depth on the left body', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const enabled = bodyActions.toggleSharing(state, 0, true);
    const resized = bodyActions.updateBody(enabled, 'right', 'depth', 50);
    const leftBody = resized.bodies[0];
    const communeJoues = leftBody.pieces.filter(
      (piece) => piece.type === 'joue' && piece.name.includes('(commune)'),
    );

    expect(communeJoues.length).toBeGreaterThan(0);
    expect(communeJoues.every((piece) => piece.width === 50)).toBe(true);
  });

  it('removing the left body after sharing preserves a valid independent left joue on the surviving body', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    const enabled = bodyActions.toggleSharing(state, 0, true);
    const removed = bodyActions.removeBody(enabled, 'left');
    const surviving = removed.bodies[0];
    const leftNamedJoues = surviving.pieces.filter(
      (piece) => piece.type === 'joue' && /gauche/i.test(piece.name),
    );

    expect(removed.sharedBoundaries).toEqual([]);
    expect(leftNamedJoues.length).toBeGreaterThan(0);
  });

  it('sharing adapts cleanly when adjacent bodies have different side segmentation', () => {
    const state = createInitialState();
    state.sharedBoundaries = [false];

    state.bodies[1].pieces = [
      { id: 'jr', name: 'Joue D — gauche', length: 252, width: 36, qty: 1, type: 'joue' },
      { id: 'rr', name: 'Joue D — droite', length: 252, width: 36, qty: 1, type: 'joue' },
    ];

    const next = bodyActions.toggleSharing(state, 0, true);
    const leftBody = next.bodies[0];
    const rightBody = next.bodies[1];
    const communeJoues = leftBody.pieces.filter(
      (piece) => piece.type === 'joue' && piece.name.includes('(commune)'),
    );
    const rightBoundaryJoues = rightBody.pieces.filter(
      (piece) => piece.type === 'joue' && /gauche/i.test(piece.name),
    );

    expect(communeJoues).toHaveLength(1);
    expect(communeJoues[0].length).toBe(252);
    expect(rightBoundaryJoues).toHaveLength(0);
  });
});
