import { useEffect, useMemo, useRef, useState } from 'react';
import HELP_GUIDE from '../data/helpGuide';
import type { ContentBlock, GlossaryBlock, HelpSection } from '../data/helpGuide';
import { AlertStrip, Panel, ToolbarButton } from '../ui-system';

export interface HelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function renderMarkdownBold(text: string): Array<string | React.JSX.Element> {
  const parts: Array<string | React.JSX.Element> = [];
  const regex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<strong key={`bold-${key++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

function renderBlock(block: ContentBlock, key: string): React.JSX.Element {
  switch (block.type) {
    case 'text':
      return (
        <p key={key} className="text-sm text-stone-700 leading-relaxed">
          {renderMarkdownBold(block.content)}
        </p>
      );
    case 'steps':
      return (
        <ol key={key} className="list-decimal list-inside space-y-1.5 text-sm text-stone-700">
          {block.items.map((item, index) => (
            <li key={`${key}-${index}`}>{item}</li>
          ))}
        </ol>
      );
    case 'tip':
      return (
        <AlertStrip key={key} kind="info" title="Conseil">{block.content}</AlertStrip>
      );
    case 'warning':
      return (
        <AlertStrip key={key} kind="warning" title="Attention">{block.content}</AlertStrip>
      );
    case 'glossary':
      return (
        <dl key={key} className="space-y-3">
          {(block as GlossaryBlock).entries.map((entry) => (
            <div key={`${key}-${entry.term}`}>
              <dt className="font-semibold text-sm text-stone-800">{entry.term}</dt>
              <dd className="text-sm text-stone-600 ml-4">{entry.definition}</dd>
            </div>
          ))}
        </dl>
      );
  }
}

export default function HelpGuide({ isOpen, onClose }: HelpGuideProps) {
  const [activeSectionId, setActiveSectionId] = useState(HELP_GUIDE[0]?.id ?? '');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const sections = useMemo(() => HELP_GUIDE, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveSectionId(sections[0]?.id ?? '');
  }, [isOpen, sections]);

  useEffect(() => {
    if (!isOpen || typeof IntersectionObserver === 'undefined') return;

    const root = contentRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) return;
        const id = visible[0].target.getAttribute('data-help-id');
        if (id) setActiveSectionId(id);
      },
      {
        root,
        threshold: [0.2, 0.4, 0.6],
        rootMargin: '-10% 0px -55% 0px',
      },
    );

    sections.forEach((section) => {
      const node = sectionRefs.current[section.id];
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [isOpen, sections]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const scrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-overlay)]/60" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] flex mx-4 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <Panel
          title="Guide utilisateur"
          actions={<ToolbarButton onClick={onClose} aria-label="Fermer le guide utilisateur">Fermer</ToolbarButton>}
          className="w-full"
        >
          <div className="flex min-h-0 overflow-hidden">
            <div className="hidden sm:flex w-56 rule-r bg-[color:var(--bg-panel-alt)] overflow-y-auto flex-col shrink-0">
              <div className="px-3 py-3 rule-b">
                <h2 className="text-[12px] font-semibold">Navigation</h2>
              </div>
              <nav className="p-2 space-y-1">
                {sections.map((section) => {
                  const isActive = activeSectionId === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`w-full text-left px-3 py-2 text-[12px] border ${
                        isActive
                          ? 'border-[color:var(--accent)] bg-[color:var(--accent-bg)] text-[color:var(--fg)]'
                          : 'border-[color:var(--border-hairline)] bg-[color:var(--bg-panel)] text-[color:var(--fg-muted)] hover:bg-[color:var(--bg-panel-alt)]'
                      }`}
                    >
                      {section.title}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              <div className="sm:hidden px-3 py-3 rule-b">
                <select
                  value={activeSectionId}
                  onChange={(event) => scrollToSection(event.target.value)}
                  className="sel"
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={contentRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-8">
                {sections.map((section) => (
                  <section
                    key={section.id}
                    id={`help-${section.id}`}
                    data-help-id={section.id}
                    ref={(node) => {
                      sectionRefs.current[section.id] = node;
                    }}
                    className="scroll-mt-4"
                  >
                    <div className="mb-4">
                      <h2 className="text-[16px] font-semibold text-[color:var(--fg)]">{section.title}</h2>
                    </div>
                    <div className="space-y-4">
                      {section.blocks.map((block, index) => renderBlock(block, `${section.id}-${index}`))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function getHelpSections(): HelpSection[] {
  return HELP_GUIDE;
}
