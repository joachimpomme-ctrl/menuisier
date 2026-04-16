/**
 * SplitLayout — 4 zones fixes séparées par des borders 1px.
 *
 * Layout métier rigide :
 *
 *     +---------------------------------------------+
 *     |               TOOLBAR (top)                 |
 *     +---------+-------------------+---------------+
 *     | left    |      center       |    right      |
 *     | (wizard |   (façade 2D)     | (inspector)   |
 *     |   280+) |     (flex)        |   (280+)      |
 *     +---------+-------------------+---------------+
 *     |              BOTTOM (rule-t)                |
 *     +---------------------------------------------+
 *
 * Contraintes :
 *   - zones fixes, séparées UNIQUEMENT par des borders 1px (jamais d'ombre
 *     ou de fond de couleur décoratif)
 *   - le centre est seul à s'étirer horizontalement
 *   - left et right ont des min-widths raisonnables (280px par défaut)
 *   - pas de gap entre les zones (gap = 0), seules les borders séparent
 *   - le composant ne gère PAS de splitter draggable (redessinable plus tard)
 *
 * Responsive :
 *   - en viewport < 960px, left et right passent en bottom-sheet / collapsibles
 *     (comportement à gérer par le parent ; SplitLayout reste rigide)
 *
 * Usage :
 *   <SplitLayout
 *     toolbar={<Toolbar …/>}
 *     left={<WizardPanel />}
 *     center={<FacadePanel />}
 *     right={<InspectorPanel />}
 *     bottom={<AlertsAndProcurementPanel />}
 *   />
 */

import type { ReactNode } from 'react';

export interface SplitLayoutProps {
  toolbar?: ReactNode;
  left?: ReactNode;
  center: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  /** Largeur min/max de la colonne gauche. Par défaut 280px à 360px. */
  leftWidth?: string;
  /** Largeur min/max de la colonne droite. Par défaut 280px à 340px. */
  rightWidth?: string;
}

export function SplitLayout({
  toolbar,
  left,
  center,
  right,
  bottom,
  leftWidth = 'minmax(280px, 0.9fr)',
  rightWidth = 'minmax(280px, 0.9fr)',
}: SplitLayoutProps) {
  const hasLeft = left !== undefined;
  const hasRight = right !== undefined;

  const templateColumns = [
    hasLeft ? leftWidth : null,
    'minmax(0, 1.8fr)',
    hasRight ? rightWidth : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col min-h-0 bg-[color:var(--bg-canvas)]">
      {toolbar}
      <div
        className="grid gap-0 flex-1 min-h-0"
        style={{ gridTemplateColumns: templateColumns }}
      >
        {hasLeft && (
          <section className="rule-r overflow-hidden flex flex-col min-h-0">
            {left}
          </section>
        )}
        <section className="overflow-hidden flex flex-col min-h-0">
          {center}
        </section>
        {hasRight && (
          <section className="rule-l overflow-hidden flex flex-col min-h-0">
            {right}
          </section>
        )}
      </div>
      {bottom && (
        <section className="rule-t bg-[color:var(--bg-panel)]">{bottom}</section>
      )}
    </div>
  );
}
