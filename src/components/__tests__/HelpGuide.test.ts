import { describe, expect, it } from 'vitest';
import HELP_GUIDE from '../../data/helpGuide';
import { getHelpSections, renderMarkdownBold } from '../HelpGuide';

describe('renderMarkdownBold', () => {
  it('converts **bold** segments into strong elements', () => {
    const parts = renderMarkdownBold('Ceci est **important**.');

    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe('Ceci est ');
    expect(parts[1]).toMatchObject({ type: 'strong', props: { children: 'important' } });
    expect(parts[2]).toBe('.');
  });

  it('leaves text without ** markers unchanged', () => {
    const parts = renderMarkdownBold('Texte simple');

    expect(parts).toEqual(['Texte simple']);
  });

  it('handles multiple **bold** occurrences in one string', () => {
    const parts = renderMarkdownBold('**Un** puis **deux**');

    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatchObject({ type: 'strong', props: { children: 'Un' } });
    expect(parts[1]).toBe(' puis ');
    expect(parts[2]).toMatchObject({ type: 'strong', props: { children: 'deux' } });
  });
});

describe('HELP_GUIDE data integrity', () => {
  it('all sections have an id, a title and at least one block', () => {
    const sections = getHelpSections();

    expect(sections).toHaveLength(HELP_GUIDE.length);
    for (const section of sections) {
      expect(section.id.trim().length).toBeGreaterThan(0);
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it('glossary blocks do not contain empty terms or definitions', () => {
    for (const section of HELP_GUIDE) {
      for (const block of section.blocks) {
        if (block.type !== 'glossary') continue;
        for (const entry of block.entries) {
          expect(entry.term.trim().length).toBeGreaterThan(0);
          expect(entry.definition.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });
});
