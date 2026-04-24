import { useEffect, useRef, useState } from 'react';

export interface MoreMenuProps {
  onExport: () => void;
  onImport: () => void;
  onPdf: () => void;
  pdfLoading?: boolean;
  onCloud: () => void;
  cloudConfigured?: boolean;
  onLibrary: () => void;
  onHelp: () => void;
  onProjects: () => void;
}

export function getInitialMoreMenuOpen(): boolean {
  return false;
}

export function toggleMoreMenu(open: boolean): boolean {
  return !open;
}

export function closeMoreMenu(): boolean {
  return false;
}

export function isOutsideMoreMenu(root: { contains(node: Node): boolean } | null, target: Node | null): boolean {
  if (!root || !target) return false;
  return !root.contains(target);
}

export default function MoreMenu({ onExport, onImport, onPdf, pdfLoading, onCloud, cloudConfigured, onLibrary, onHelp, onProjects }: MoreMenuProps) {
  const [open, setOpen] = useState(getInitialMoreMenuOpen);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (isOutsideMoreMenu(rootRef.current, event.target as Node | null)) {
        setOpen(closeMoreMenu());
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const close = () => setOpen(closeMoreMenu());

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Plus d'options"
        aria-expanded={open}
        onClick={() => setOpen((current) => toggleMoreMenu(current))}
        className="text-xs px-3 py-1.5 rounded-lg border border-[#e0d8ce] bg-white text-[#695f56] hover:text-[#1c1714] hover:border-[#c8bfb3] whitespace-nowrap transition-colors"
      >
        ···
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-48 rounded-lg border border-[#e0d8ce] bg-white shadow-md z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => { onProjects(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#1c1714] hover:bg-[#faf8f4] border-b border-[#f0ebe4]"
          >
            Mes projets
          </button>
          <button
            type="button"
            onClick={() => { onLibrary(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#1c1714] hover:bg-[#faf8f4] border-b border-[#f0ebe4]"
          >
            Bibliothèque de pièces
          </button>
          <button
            type="button"
            onClick={() => { onPdf(); close(); }}
            disabled={pdfLoading}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#1c1714] hover:bg-[#faf8f4] border-b border-[#f0ebe4] disabled:opacity-50"
          >
            {pdfLoading ? 'Génération PDF…' : 'Exporter PDF'}
          </button>
          <button
            type="button"
            onClick={() => { onCloud(); close(); }}
            className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-[#faf8f4] border-b border-[#f0ebe4] ${cloudConfigured ? 'text-[#3a4a5c]' : 'text-[#1c1714]'}`}
          >
            {cloudConfigured ? 'Sync cloud (configuré)' : 'Configurer sync cloud'}
          </button>
          <button
            type="button"
            onClick={() => { onExport(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#695f56] hover:bg-[#faf8f4] border-b border-[#f0ebe4]"
          >
            Exporter JSON
          </button>
          <button
            type="button"
            onClick={() => { onImport(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#695f56] hover:bg-[#faf8f4] border-b border-[#f0ebe4]"
          >
            Importer un projet
          </button>
          <button
            type="button"
            onClick={() => { onHelp(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#695f56] hover:bg-[#faf8f4]"
          >
            Aide
          </button>
        </div>
      )}
    </div>
  );
}
