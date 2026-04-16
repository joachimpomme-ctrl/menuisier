/**
 * Panel — cadre rectangulaire de contenu.
 *
 * Remplace toute "card" arrondie avec shadow. Un Panel a :
 *   - bordure 1px pleine (couleur `--border`)
 *   - optionnel : bandeau de titre sombre en majuscules
 *   - optionnel : rangée d'actions à droite du titre
 *   - radius 2px max, aucune ombre.
 *
 * Interdictions :
 *   - pas de background coloré décoratif
 *   - pas de padding > spacing.4
 *   - pas de gradient, pas d'animation d'entrée
 */

import type { ReactNode, HTMLAttributes } from 'react';

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Titre du panel — s'affiche en majuscules dans un bandeau sombre. */
  title?: ReactNode;
  /** Actions à droite du titre (boutons compacts uniquement). */
  actions?: ReactNode;
  /** Si true : padding body à 0, pour tableaux pleine largeur. */
  flush?: boolean;
  /**
   * Si true : le panel s'insère dans un layout 4 zones sans bordures propres,
   * en s'appuyant sur les borders de son parent. Le header reste.
   */
  borderless?: boolean;
  children: ReactNode;
}

export function Panel({
  title,
  actions,
  flush,
  borderless,
  className = '',
  children,
  ...rest
}: PanelProps) {
  const wrapperCls = borderless ? '' : 'panel';
  return (
    <div className={`${wrapperCls} ${className}`} {...rest}>
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
