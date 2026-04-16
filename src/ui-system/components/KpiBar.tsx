/**
 * KpiBar — rangée de KPI métier (typiquement bottom bar du Dashboard).
 *
 * Sert à remplacer tout `<div className="grid grid-cols-N">` ad-hoc où
 * trois à six chiffres totaux doivent se lire en un coup d'œil.
 *
 * Contrat visuel :
 *   - chaque colonne a un badge optionnel (`<ProcurementBadge>` ou autre
 *     nœud sobre — PAS de pill décorative), un chiffre mono tabulaire,
 *     un label overline 10.5px MAJUSCULES
 *   - colonnes séparées par des borders 1px, sans gap
 *   - fond `--bg-panel`, jamais coloré
 *   - pas d'icône emoji, pas de sparkline, pas d'animation
 *
 * Exemple :
 *
 *   <KpiBar
 *     items={[
 *       { key: 'buy', label: 'Achat', value: 12, badge: <ProcurementBadge status="buy_exact" /> },
 *       { key: 'rwk', label: 'Achat+Retouche', value: 4, badge: <ProcurementBadge status="buy_and_rework" /> },
 *       { key: 'cut', label: 'Débit', value: 28, badge: <ProcurementBadge status="cut_from_sheet" /> },
 *     ]}
 *   />
 */

import type { ReactNode } from 'react';

export interface KpiItem {
  /** Clé stable React. */
  key: string;
  /** Label court, 3 à 20 caractères. Sera rendu en overline majuscules. */
  label: string;
  /**
   * Valeur principale — toujours rendue en mono tabular-nums.
   * Accepter string|number garantit que le rendu reste homogène.
   */
  value: string | number;
  /** Unité optionnelle rendue en 10px sans-serif gris (mm, €, kg, pcs). */
  unit?: string;
  /**
   * Badge à gauche de la valeur (ex. `<ProcurementBadge>`).
   * Volontairement un ReactNode pour supporter `StatusBadge` / `ProcurementBadge` uniquement.
   */
  badge?: ReactNode;
}

export interface KpiBarProps {
  items: KpiItem[];
  /** Titre optionnel de la section (overline, aligné à gauche). */
  title?: string;
}

export function KpiBar({ items, title }: KpiBarProps) {
  return (
    <div className="flex flex-col bg-[color:var(--bg-panel)]">
      {title && (
        <div className="section-title px-3">{title}</div>
      )}
      <div
        className="grid gap-0"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((it, i) => (
          <div
            key={it.key}
            className={
              'flex flex-col gap-0.5 px-3 py-2 ' +
              (i > 0 ? 'rule-l' : '')
            }
          >
            {it.badge && <div>{it.badge}</div>}
            <div className="flex items-baseline gap-1">
              <span className="font-mono tabular-nums text-[18px] leading-none">
                {it.value}
              </span>
              {it.unit && (
                <span className="text-[10px] text-[color:var(--fg-subtle)] font-sans">
                  {it.unit}
                </span>
              )}
            </div>
            {!it.badge && (
              <span className="text-[10.5px] uppercase tracking-wider text-[color:var(--fg-subtle)] font-semibold">
                {it.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
