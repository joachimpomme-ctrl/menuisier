/**
 * Toolbar — rail horizontal de contrôles et métriques.
 *
 * Remplace les "actions bars" SaaS avec gros CTA colorés.
 *
 * Structure :
 *   - hauteur fixe 40px, fond panel, border-bottom 1px border
 *   - 3 zones horizontales : [start] [middle (flex)] [end]
 *   - rails séparés par `border-right 1px border` entre zones
 *
 * Composants compagnons :
 *   - <ToolbarButton /> — bouton compact 26px, variantes default / primary / ghost
 *   - <ToolbarMetric /> — bloc KPI label+value, séparés par filets internes
 *   - <ToolbarTabs /> — onglets majuscules sobres, un seul actif
 *
 * Règles :
 *   - au MAX 1 bouton primary par Toolbar
 *   - jamais d'emoji en label
 *   - jamais de transition scale, seulement changement de background
 *
 * Contrat strict :
 *   - Les composants N'ACCEPTENT PAS tout le `ButtonHTMLAttributes` — seulement
 *     les props listées explicitement ci-dessous. Un bouton qui a besoin de
 *     `style`, `formAction`, `dangerouslySetInnerHTML`, etc. ne doit pas
 *     être un `<ToolbarButton>`. Refactorer à la place.
 */

import type { ReactNode, MouseEvent } from 'react';

// ---------------------------------------------------------------------------
// Toolbar shell
// ---------------------------------------------------------------------------

export interface ToolbarProps {
  /** Zone gauche — identité projet, fil d'ariane. Pas de CTA. */
  start?: ReactNode;
  /** Zone centrale — métriques (`<ToolbarMetric>`). Scroll horizontal si trop large. */
  children?: ReactNode;
  /** Zone droite — 1 à 3 boutons d'action, dont **au plus un** `variant="primary"`. */
  end?: ReactNode;
  /**
   * Ne rien mettre d'autre ici que des utilities DS (`rule-b`, `rule-t`).
   * Jamais `bg-*`, `rounded-*`, `shadow-*`, `p-*` Tailwind directs.
   */
  className?: string;
}

export function Toolbar({ start, children, end, className = '' }: ToolbarProps) {
  return (
    <div className={`flex items-stretch rule-b bg-[color:var(--bg-panel)] ${className}`.trim()}>
      {start !== undefined && (
        <div className="flex items-center rule-r">
          {start}
        </div>
      )}
      <div className="flex items-stretch flex-1 overflow-x-auto hide-scrollbar">
        {children}
      </div>
      {end !== undefined && (
        <div className="flex items-center gap-1 px-2 rule-l">
          {end}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolbarButton
// ---------------------------------------------------------------------------
//
// Volontairement fermé : n'accepte que les props d'usage métier.
// Pas de `...rest` HTMLAttributes — si un agent a besoin de `style` ou
// `onMouseDown`, c'est le signe qu'il ne devrait pas utiliser ToolbarButton.

export interface ToolbarButtonProps {
  variant?: 'default' | 'primary' | 'ghost';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Libellé d'accessibilité lu par les lecteurs d'écran (recommandé). */
  'aria-label'?: string;
  /** Tooltip natif — court, sans emoji. */
  title?: string;
  type?: 'button' | 'submit';
  /**
   * Composition d'utilities DS uniquement (`!h-5 !px-1.5 !text-[10px]` pour
   * variante compacte interne). NE PAS introduire `rounded-*`, `bg-*`,
   * `shadow-*`, `hover:scale-*`.
   */
  className?: string;
  children: ReactNode;
}

export function ToolbarButton({
  variant = 'default',
  onClick,
  disabled,
  title,
  type = 'button',
  className = '',
  children,
  ...ariaProps
}: ToolbarButtonProps) {
  const variantCls =
    variant === 'primary' ? 'tbtn-primary'
    : variant === 'ghost' ? 'tbtn-ghost'
    : '';
  return (
    <button
      type={type}
      className={`tbtn ${variantCls} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaProps['aria-label']}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// ToolbarMetric — KPI dense inline
// ---------------------------------------------------------------------------

export interface ToolbarMetricProps {
  /** Libellé court, 3 à 6 caractères (ex. "Larg", "Haut", "Pièces"). */
  label: string;
  /**
   * Valeur — string | number pour le rendu mono standard.
   * ReactNode accepté uniquement si typographie gérée (rarissime).
   */
  value: ReactNode;
  /** Unité optionnelle (mm, €, kg). Rendue en 10px sans-serif, gris. */
  unit?: string;
}

export function ToolbarMetric({ label, value, unit }: ToolbarMetricProps) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">
        {value}
        {unit && (
          <span className="text-[10px] text-[color:var(--fg-subtle)] ml-1 font-sans">
            {unit}
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ToolbarTabs — rangée d'onglets sobres (pas de pills, pas de fond coloré)
// ---------------------------------------------------------------------------

export interface ToolbarTab<K extends string = string> {
  key: K;
  label: ReactNode;
  disabled?: boolean;
}

export interface ToolbarTabsProps<K extends string = string> {
  tabs: ToolbarTab<K>[];
  active: K;
  onChange: (key: K) => void;
}

export function ToolbarTabs<K extends string = string>({
  tabs,
  active,
  onChange,
}: ToolbarTabsProps<K>) {
  return (
    <div className="flex rule-b bg-[color:var(--bg-panel)]">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            disabled={t.disabled}
            onClick={() => onChange(t.key)}
            className={
              'px-3 py-1.5 border-r border-[color:var(--border-hairline)] ' +
              'uppercase tracking-wider text-[10.5px] font-semibold ' +
              (isActive
                ? 'bg-[color:var(--bg-panel-alt)] text-[color:var(--fg)] shadow-[inset_0_-2px_0_var(--accent)]'
                : 'text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--bg-panel-alt)]')
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
