import { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  /** Clé dans le dictionnaire TIPS, ou texte libre */
  text: string;
  children: React.ReactNode;
  /** Position préférée */
  side?: 'top' | 'bottom';
}

/**
 * Composant tooltip didactique :
 * - Desktop : hover sur l'icône (?) affiche le tooltip
 * - Mobile : tap sur l'icône (?) affiche/masque le tooltip
 * - Tap ailleurs ferme le tooltip
 */
export default function Tip({ text, children, side = 'bottom' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click/tap (mobile)
  const handleOutside = useCallback((e: MouseEvent | TouchEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleOutside);
      document.addEventListener('touchstart', handleOutside);
      return () => {
        document.removeEventListener('mousedown', handleOutside);
        document.removeEventListener('touchstart', handleOutside);
      };
    }
  }, [open, handleOutside]);

  // Auto-adjust if tooltip goes off-screen
  useEffect(() => {
    if (open && tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) {
        tooltipRef.current.style.left = 'auto';
        tooltipRef.current.style.right = '0';
      }
      if (rect.left < 8) {
        tooltipRef.current.style.left = '0';
        tooltipRef.current.style.right = 'auto';
      }
    }
  }, [open]);

  return (
    <span ref={ref} className="inline-flex items-center gap-1">
      {children}
      <span
        className="relative inline-flex"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold leading-none bg-stone-700/60 text-stone-400 hover:bg-amber-600/30 hover:text-amber-400 transition-colors cursor-help flex-shrink-0"
          aria-label="Aide"
          tabIndex={-1}
        >
          ?
        </button>
        {open && (
          <div
            ref={tooltipRef}
            className={`absolute z-50 w-64 px-3 py-2.5 rounded-xl border border-stone-700 bg-stone-800 shadow-xl shadow-black/40 text-xs text-stone-300 leading-relaxed ${
              side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            } left-1/2 -translate-x-1/2`}
            style={{ pointerEvents: 'auto' }}
          >
            {text}
          </div>
        )}
      </span>
    </span>
  );
}

/**
 * Version inline : affiche juste le (?) avec tooltip, sans children.
 * Utile pour ajouter une aide à côté d'un label existant.
 */
export function TipIcon({ text, side = 'bottom' }: { text: string; side?: 'top' | 'bottom' }) {
  return (
    <Tip text={text} side={side}>
      <span />
    </Tip>
  );
}
