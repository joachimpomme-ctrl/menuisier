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
  onNotice: () => void;
  onValidation: () => void;
  validationCount?: number;
  direction?: 'down' | 'up';
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

export default function MoreMenu({ onExport, onImport, onPdf, pdfLoading, onCloud, cloudConfigured, onLibrary, onHelp, onProjects, onNotice, onValidation, validationCount, direction = 'down' }: MoreMenuProps) {
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
        className="text-xs px-3 py-1.5 rounded-lg border border-[#EFE8DD] bg-white text-[#54514E] hover:text-[#0E0D0C] hover:border-[#9A968F] whitespace-nowrap transition-colors"
      >
        ···
      </button>

      {open && (
        <div className={`absolute right-0 ${direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'} min-w-48 rounded-lg border border-[#EFE8DD] bg-white shadow-lg z-50 overflow-hidden`}>
          <button
            type="button"
            onClick={() => { onProjects(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#0E0D0C] hover:bg-[#E5EAFF] border-b border-[#EFE8DD]"
          >
            Mes projets
          </button>
          <button
            type="button"
            onClick={() => { onLibrary(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#0E0D0C] hover:bg-[#E5EAFF] border-b border-[#EFE8DD]"
          >
            Bibliothèque de pièces
          </button>
          <button
            type="button"
            onClick={() => { onNotice(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#0E0D0C] hover:bg-[#E5EAFF] border-b border-[#EFE8DD]"
          >
            Notice de montage
          </button>
          <button
            type="button"
            onClick={() => { onValidation(); close(); }}
            className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-[#E5EAFF] border-b border-[#EFE8DD] flex items-center justify-between ${validationCount && validationCount > 0 ? 'text-[#A52E16]' : 'text-[#0E0D0C]'}`}
          >
            <span>Contrôle qualité</span>
            {validationCount !== undefined && validationCount > 0 && (
              <span className="text-xs bg-[#FFE4DC] text-[#A52E16] border border-[#FF6B4A] rounded px-1.5 py-px font-medium">
                {validationCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => { onPdf(); close(); }}
            disabled={pdfLoading}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#0E0D0C] hover:bg-[#E5EAFF] border-b border-[#EFE8DD] disabled:opacity-50"
          >
            {pdfLoading ? 'Génération PDF…' : 'Exporter PDF'}
          </button>
          <button
            type="button"
            onClick={() => { onCloud(); close(); }}
            className={`block w-full px-3 py-2.5 text-left text-sm hover:bg-[#E5EAFF] border-b border-[#EFE8DD] ${cloudConfigured ? 'text-[#3B5FFF]' : 'text-[#0E0D0C]'}`}
          >
            {cloudConfigured ? 'Sync cloud (configuré)' : 'Configurer sync cloud'}
          </button>
          <button
            type="button"
            onClick={() => { onExport(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#54514E] hover:bg-[#E5EAFF] border-b border-[#EFE8DD]"
          >
            Exporter JSON
          </button>
          <button
            type="button"
            onClick={() => { onImport(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#54514E] hover:bg-[#E5EAFF] border-b border-[#EFE8DD]"
          >
            Importer un projet
          </button>
          <button
            type="button"
            onClick={() => { onHelp(); close(); }}
            className="block w-full px-3 py-2.5 text-left text-sm text-[#54514E] hover:bg-[#E5EAFF]"
          >
            Aide
          </button>
        </div>
      )}
    </div>
  );
}
