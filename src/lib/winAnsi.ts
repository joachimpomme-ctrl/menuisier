/**
 * WinAnsi (CP1252) sanitizer for jsPDF standard fonts.
 *
 * jsPDF's standard fonts encode text as WinAnsi (CP1252). A single character
 * outside that set (e.g. an arrow or a >= sign) silently flips the WHOLE line
 * to UTF-16, which renders as garbage AND letter-spaces every glyph in the
 * line. CP1252 itself — dashes, smart quotes, ellipsis, bullet, euro, guillemets,
 * the multiplication sign, superscripts, the degree sign and every French accent
 * — renders fine, so we only transliterate the genuinely out-of-range symbols
 * and fold/strip whatever is still unrenderable.
 *
 * Source chars are written as \uXXXX escapes on purpose: this keeps the file
 * pure ASCII so no invisible/combining character can sneak into a class.
 */

// CP1252 high glyphs (the U+0080-U+009F region) that jsPDF renders correctly.
const CP1252_HIGH =
  '€‚ƒ„…†‡ˆ‰' +
  'Š‹ŒŽ‘’“”•–—' +
  '˜™š›œžŸ';

const KEEP_OR_STRIP = new RegExp(`[^\\u0000-\\u00FF${CP1252_HIGH}]`, 'g');

export function winAnsi(s: string): string {
  const mapped = s
    .replace(/[→⟶⇒➔➙]/g, '->')
    .replace(/[←⟵⇐]/g, '<-')
    .replace(/↑/g, '^')
    .replace(/↓/g, 'v')
    .replace(/↔/g, '<->')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/≈/g, '~')
    .replace(/−/g, '-')
    .replace(/[✓✔]/g, 'OK')
    .replace(/[✗✘]/g, 'X');
  // Anything still outside Latin-1 + CP1252: drop combining accents, then drop the rest.
  return mapped.replace(KEEP_OR_STRIP, (c) => {
    const folded = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return /^[ -ÿ]*$/.test(folded) ? folded : '';
  });
}
