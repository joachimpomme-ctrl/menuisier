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
        className="text-[11px] px-2.5 py-1.5 bg-[color:var(--bg-panel)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] border border-[color:var(--border-weak)] whitespace-nowrap"
      >
        ···
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-px min-w-[160px] border border-[color:var(--border)] bg-[color:var(--bg-panel)] z-50 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              onExport();
              setOpen(closeMoreMenu());
            }}
            className="block w-full px-3 py-2 text-left text-[12px] text-[color:var(--fg)] hover:bg-[color:var(--bg-panel-alt)]"
          >
            Exporter JSON
          </button>
          <button
            type="button"
            onClick={() => {
              onImport();
              setOpen(closeMoreMenu());
            }}
            className="block w-full px-3 py-2 text-left text-[12px] text-[color:var(--fg)] hover:bg-[color:var(--bg-panel-alt)] border-t border-[color:var(--border-hairline)]"
          >
            Importer un projet
          </button>
        </div>
      )}
    </div>
  );
}
