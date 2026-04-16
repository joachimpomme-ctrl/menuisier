/**
 * SectionTitle — titre de sous-section dans un Panel ou un Inspector.
 *
 * Typo : 10.5px, 0.08em tracking, majuscules, couleur fg-muted.
 * Border-bottom hairline pour séparer sans briser la densité.
 *
 * Usage : utilisé uniquement À L'INTÉRIEUR d'un Panel — jamais comme
 * titre de page (utiliser le title du Panel ou de la Toolbar pour ça).
 */

import type { ReactNode } from 'react';

export interface SectionTitleProps {
  children: ReactNode;
  /** Variante flush : pas de padding latéral (utilisé dans PropertyGrid). */
  flush?: boolean;
}

export function SectionTitle({ children, flush }: SectionTitleProps) {
  const cls = flush ? 'section-title px-0 border-b-0 pb-1' : 'section-title';
  return <div className={cls}>{children}</div>;
}
