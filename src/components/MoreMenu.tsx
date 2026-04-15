import { useEffect, useRef, useState } from 'react';

export interface MoreMenuProps {
  onExport: () => void;
  onImport: () => void;
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

export default function MoreMenu({ onExport, onImport }: MoreMenuProps) {
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

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Plus d'options"
        aria-expanded={open}
        onClick={() => setOpen((current) => toggleMoreMenu(current))}
        className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white text-stone-500 hover:text-stone-700 border border-stone-200 whitespace-nowrap transition-colors"
      >
        ⋯
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 min-w-44 rounded-lg border border-stone-200 bg-white shadow-lg z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onExport();
              setOpen(closeMoreMenu());
            }}
            className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            Exporter JSON
          </button>
          <button
            type="button"
            onClick={() => {
              onImport();
              setOpen(closeMoreMenu());
            }}
            className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
          >
            Importer un projet
          </button>
        </div>
      )}
    </div>
  );
}
