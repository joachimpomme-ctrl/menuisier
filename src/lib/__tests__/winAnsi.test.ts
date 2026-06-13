import { describe, it, expect } from 'vitest';
import { winAnsi } from '../winAnsi';

describe('winAnsi (CP1252 sanitizer for jsPDF)', () => {
  it('transliterates arrows that corrupt jsPDF lines', () => {
    expect(winAnsi('Largeur 2400mm → 3 corps')).toBe('Largeur 2400mm -> 3 corps');
    expect(winAnsi('a ← b')).toBe('a <- b');
  });

  it('transliterates math operators outside WinAnsi', () => {
    expect(winAnsi('Profondeur ≥ 550mm')).toBe('Profondeur >= 550mm');
    expect(winAnsi('x ≤ y ≠ z')).toBe('x <= y != z');
  });

  it('keeps every French accent (they render fine in WinAnsi)', () => {
    const t = 'Matériau Résumé découpe à côté çà où';
    expect(winAnsi(t)).toBe(t);
  });

  it('keeps CP1252 punctuation and Latin-1 symbols', () => {
    const t = 'Plans — vue ’ok’ “ok” … • 12 € « 2 » 76×32 m² 20°';
    expect(winAnsi(t)).toBe(t);
  });

  it('drops genuinely unrenderable characters instead of corrupting the line', () => {
    expect(winAnsi('porte 🚪 fin')).toBe('porte  fin');
    expect(winAnsi('check ✓ done')).toBe('check OK done');
  });

  it('leaves plain ASCII untouched', () => {
    expect(winAnsi('Vis Confirmat 7x50mm')).toBe('Vis Confirmat 7x50mm');
  });
});
