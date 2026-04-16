/**
 * Legend — légende sobre pour canvas (façade 2D) ou diagramme.
 *
 * Remplace toute construction ad-hoc du genre :
 *
 *   <div className="flex gap-2 text-xs">
 *     <span><span style={{background: '#xxx'}}/> foo</span>
 *   </div>
 *
 * Règles de forme :
 *   - chaque entrée = un swatch 8×8 neutre (fond, bordure, ou outline accent)
 *     + un label 10px gris muted
 *   - pas d'icône emoji, pas de dot rond coloré
 *   - alignement compact horizontal, `flex-wrap` autorisé si la zone est étroite
 *   - jamais plus de 6 entrées dans une seule Legend (au-delà, ouvrir un Panel dédié)
 *
 * Les couleurs des swatches doivent provenir d'un token du DS
 * (`color.border`, `color.fg`, `color.accent`, `color.canvas`) — jamais d'une
 * valeur hex littérale dans l'appelant.
 */

import type { ReactNode } from 'react';

export interface LegendItem {
  key: string;
  /** Libellé court, 4 à 24 caractères. Jamais d'emoji. */
  label: ReactNode;
  /**
   * Style de swatch — restreint aux 4 cas métier :
   *   - 'solid'    : carré plein (couleur `fg` par défaut)
   *   - 'outline'  : bordure pleine sur fond canvas clair
   *   - 'selected' : bordure accent 2px, fond transparent (état sélection)
   *   - 'muted'    : fond `--bg-panel-alt`, bordure `--border-weak`
   */
  swatch: 'solid' | 'outline' | 'selected' | 'muted';
}

export interface LegendProps {
  items: LegendItem[];
  /** Texte libre à droite de la légende (non-swatch), ex. "— suspendu". */
  note?: ReactNode;
}

export function Legend({ items, note }: LegendProps) {
  if (items.length > 6) {
    // Échec silencieux plutôt que tronquer : signal fort pour le développeur.
    throw new Error(
      `Legend: trop d'entrées (${items.length}). Maximum 6 — ouvrir un Panel dédié.`,
    );
  }

  return (
    <div className="p-2 text-[10px] flex flex-wrap gap-x-3 gap-y-1 text-[color:var(--fg-muted)] bg-[color:var(--bg-panel)]">
      {items.map((it) => (
        <span key={it.key} className="inline-flex items-center gap-1">
          <Swatch kind={it.swatch} />
          {it.label}
        </span>
      ))}
      {note && <span>{note}</span>}
    </div>
  );
}

function Swatch({ kind }: { kind: LegendItem['swatch'] }) {
  switch (kind) {
    case 'solid':
      return (
        <span
          className="inline-block w-2 h-2 align-middle"
          style={{ background: 'var(--fg)' }}
        />
      );
    case 'outline':
      return (
        <span
          className="inline-block w-2 h-2 align-middle"
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-panel-alt)',
          }}
        />
      );
    case 'selected':
      return (
        <span
          className="inline-block w-2 h-2 align-middle"
          style={{
            outline: '2px solid var(--accent)',
            outlineOffset: -1,
            background: 'transparent',
          }}
        />
      );
    case 'muted':
      return (
        <span
          className="inline-block w-2 h-2 align-middle"
          style={{
            background: 'var(--bg-panel-alt)',
            border: '1px solid var(--border-weak)',
          }}
        />
      );
  }
}
