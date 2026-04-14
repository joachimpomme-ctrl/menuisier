import { describe, it } from 'vitest';

describe('shared boundary characterization', () => {
  it.todo('keeps one physical shared side between two simple adjacent bodies');
  it.todo('uses the maximum depth when adjacent bodies have different depths');
  it.todo('supports asymmetric heights when one body has split side panels and the other does not');
  it.todo('supports a central body sharing its left and right boundaries at the same time');
  it.todo('recalculates shared geometry when the left body depth changes');
  it.todo('recalculates shared geometry when the right body depth changes');
  it.todo('restores independent side panels cleanly when sharing is disabled');
  it.todo('remains coherent when a shared body is removed');
  it.todo('remains coherent when a shared body is duplicated');
  it.todo('keeps door geometry coherent after enabling a shared boundary');
  it.todo('keeps shelves and separators coherent after enabling a shared boundary');
});
