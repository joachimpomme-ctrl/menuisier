/**
 * Panel — cadre rectangulaire de contenu.
 *
 * Remplace toute "card" arrondie avec shadow. Un Panel a :
 *   - bordure 1px pleine (couleur `--border`)
 *   - optionnel : bandeau de titre sombre en majuscules
 *   - optionnel : rangée d'actions à droite du titre
 *   - radius 2px max, aucune ombre.
 *
 * Contrat strict :
 *   - n'accepte PAS `style` inline — tout réglage passe par une classe
 *     CSS existante du design system (voir `src/index.css`).
 *   - n'accepte PAS `onMouseEnter`, `onClick` au niveau conteneur — un
 *     Panel n'est jamais cliquable. Utiliser un enfant explicite si besoin.
 *   - `className` existe uniquement pour composer des utilities du DS
 *     (`rule-t`, `rule-b`, `scroll-y`). Jamais pour introduire
 *     `rounded-*`, `shadow-*`, `bg-*` Tailwind — voir `rules.md`.
 *
 * Interdictions :
 *   - pas de background coloré décoratif
 *   - pas de padding > spacing.4
 *   - pas de gradient, pas d'animation d'entrée
 */

import type { ReactNode } from 'react';

export interface PanelProps {
  /** Titre du panel — s'affiche en majuscules dans un bandeau sombre. */
  title?: ReactNode;
  /** Actions à droite du titre (boutons compacts uniquement, ≤ 3). */
  actions?: ReactNode;
  /** Si true : padding body à 0, pour tableaux pleine largeur. */
  flush?: boolean;
  /**
   * Si true : le panel s'insère dans un layout 4 zones sans bordures propres,
   * en s'appuyant sur les borders de son parent. Le header reste.
   */
  borderless?: boolean;
  /**
   * Composition d'utilities du DS uniquement (`rule-t`, `scroll-y`, etc.).
   * NE JAMAIS y mettre `rounded-*`, `shadow-*`, `bg-*` Tailwind colorés,
   * `hover:scale-*`, `transition-all`. Voir `ui-system/rules.md`.
   */
  className?: string;
  /** Identifiant ARIA optionnel. */
  id?: string;
  children: ReactNode;
}

export function Panel({
  title,
  actions,
  flush,
  borderless,
  className = '',
  id,
  children,
}: PanelProps) {
  const wrapperCls = borderless ? '' : 'panel';
  return (
    <div className={`${wrapperCls} ${className}`.trim()} id={id}>
      {title !== undefined && (
        <div className="panel-head">
          <span>{title}</span>
          {actions && <span className="flex items-center gap-1.5">{actions}</span>}
        </div>
      )}
      <div className={flush ? 'panel-body-flush' : 'panel-body'}>{children}</div>
    </div>
  );
}
