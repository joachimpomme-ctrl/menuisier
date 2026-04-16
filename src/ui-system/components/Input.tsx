/**
 * Input / Select / NumberInput — contrôles de formulaire sobres.
 *
 * Hauteur 26px, bordure 1px borderWeak, focus-border accent.
 * Tous les inputs numériques utilisent tabular-nums et SF Mono.
 *
 * Contrat strict :
 *   - les composants N'acceptent PAS tout `InputHTMLAttributes`.
 *   - les props valides sont listées ci-dessous. Un input qui a besoin de
 *     `list`, `pattern`, `formAction`, `autoSave`, etc. doit être une
 *     implémentation locale — pas un composant DS.
 *   - ni placeholder long, ni icône interne décorative.
 *   - pas d'état "valid/invalid" coloré — utiliser un `<AlertStrip>` adjacent.
 */

import {
  forwardRef,
  type ReactNode,
  type ChangeEvent,
  type FocusEvent,
  type KeyboardEvent,
} from 'react';

// ---------------------------------------------------------------------------
// Field — wrapper label + contrôle, inline ou stacked
// ---------------------------------------------------------------------------

export interface FieldProps {
  /** Label lisible — obligatoire, pas de `placeholder` qui joue ce rôle. */
  label: ReactNode;
  children: ReactNode;
  /** Si 'inline', label à gauche, contrôle à droite (pour property grids). */
  layout?: 'stacked' | 'inline';
  /** Largeur explicite (px ou css). Ne pas s'appuyer sur le parent flex. */
  width?: string | number;
  /** Id du champ — sert à brancher `htmlFor` automatiquement. */
  htmlFor?: string;
}

export function Field({ label, children, layout = 'stacked', width, htmlFor }: FieldProps) {
  if (layout === 'inline') {
    return (
      <label
        htmlFor={htmlFor}
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
      htmlFor={htmlFor}
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
// Props communes restreintes pour tous les inputs DS
// ---------------------------------------------------------------------------

interface BaseInputProps<E extends HTMLElement> {
  id?: string;
  name?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  /** ≤ 40 caractères. Pas d'indication fonctionnelle ici — utiliser `label`. */
  placeholder?: string;
  /** Composition DS uniquement. Interdits : `bg-*`, `rounded-*`, `shadow-*`. */
  className?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onFocus?: (e: FocusEvent<E>) => void;
  onBlur?: (e: FocusEvent<E>) => void;
  onKeyDown?: (e: KeyboardEvent<E>) => void;
}

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------

export interface TextInputProps extends BaseInputProps<HTMLInputElement> {
  type?: 'text' | 'email' | 'search' | 'tel' | 'url';
  value?: string;
  defaultValue?: string;
  maxLength?: number;
  autoComplete?: 'off' | 'on';
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className = '', type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={`inp ${className}`.trim()}
        {...props}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// NumberInput — force type='number', inputMode='numeric'
// ---------------------------------------------------------------------------

export interface NumberInputProps extends BaseInputProps<HTMLInputElement> {
  value?: number | '';
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput({ className = '', ...props }, ref) {
    return (
      <input
        ref={ref}
        type="number"
        inputMode="numeric"
        className={`inp ${className}`.trim()}
        {...props}
      />
    );
  },
);

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export interface SelectProps extends BaseInputProps<HTMLSelectElement> {
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = '', children, ...props }, ref) {
    return (
      <select ref={ref} className={`sel ${className}`.trim()} {...props}>
        {children}
      </select>
    );
  },
);
