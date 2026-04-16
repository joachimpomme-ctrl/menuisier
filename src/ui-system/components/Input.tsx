/**
 * Input / Select / NumberInput — contrôles de formulaire sobres.
 *
 * Hauteur 26px, bordure 1px borderWeak, focus-border accent.
 * Tous les inputs numériques utilisent tabular-nums et SF Mono.
 *
 * Règles :
 *   - jamais de placeholder long
 *   - jamais d'icône interne décorative
 *   - pas d'état "valid/invalid" coloré — utiliser un AlertStrip adjacent
 */

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';

// ---------------------------------------------------------------------------
// Field — wrapper label + contrôle, inline ou stacked
// ---------------------------------------------------------------------------

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  /** Si 'inline', label à gauche, contrôle à droite (pour property grids). */
  layout?: 'stacked' | 'inline';
  width?: string | number;
}

export function Field({ label, children, layout = 'stacked', width }: FieldProps) {
  if (layout === 'inline') {
    return (
      <label
        className="flex items-center justify-between gap-2 text-[12px]"
        style={width !== undefined ? { width } : undefined}
      >
        <span className="text-[color:var(--fg-muted)]">{label}</span>
        <span className="flex-1 max-w-[120px]">{children}</span>
      </label>
    );
  }
  return (
    <label
      className="flex flex-col gap-1 text-[12px]"
      style={width !== undefined ? { width } : undefined}
    >
      <span className="text-[10.5px] uppercase tracking-wider text-[color:var(--fg-subtle)] font-semibold">
        {label}
      </span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...props }, ref) {
    return <input ref={ref} className={`inp ${className}`} {...props} />;
  },
);

// ---------------------------------------------------------------------------
// NumberInput — force type='number', inputMode='numeric'
// ---------------------------------------------------------------------------

export const NumberInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumberInput({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        className={`inp ${className}`}
        {...props}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select ref={ref} className={`sel ${className}`} {...props}>
        {children}
      </select>
    );
  },
);
