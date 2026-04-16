/**
 * PropertyGrid — liste clé/valeur dense pour inspecteurs.
 *
 * Usage typique : colonne droite du layout, affichage des propriétés d'une
 * pièce / zone / corps sélectionné(e).
 *
 * Rendu :
 *   - 2 colonnes : label gauche (muted, 12px), valeur droite (mono 12px)
 *   - pas de bordure horizontale entre lignes, juste un espacement 4px
 *   - groupes séparés par un SectionTitle (utilitaire interne)
 *
 * Règles :
 *   - valeur toujours en mono pour les nombres
 *   - jamais de valeur en couleur, sauf via <StatusBadge />
 *   - pas de padding latéral extravagant
 */

import type { ReactNode } from 'react';

export interface PropertyRow {
  label: string;
  /** Valeur — si string/number, rendue en mono. Sinon ReactNode libre. */
  value: ReactNode;
  /** Monospace explicite (par défaut true sauf si value est ReactElement). */
  mono?: boolean;
}

export interface PropertyGroup {
  title?: string;
  rows: PropertyRow[];
}

export interface PropertyGridProps {
  groups: PropertyGroup[];
}

function isPrimitive(v: unknown): v is string | number {
  return typeof v === 'string' || typeof v === 'number';
}

export function PropertyGrid({ groups }: PropertyGridProps) {
  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, gi) => (
        <div key={gi}>
          {group.title && (
            <div className="section-title px-0 border-b-0 pb-1">{group.title}</div>
          )}
          <dl className="grid gap-y-0.5" style={{ gridTemplateColumns: '1fr auto' }}>
            {group.rows.map((row, ri) => {
              const monoForced = row.mono ?? isPrimitive(row.value);
              return (
                <div
                  key={ri}
                  style={{ display: 'contents' }}
                >
                  <dt className="text-[12px] text-[color:var(--fg-muted)] py-0.5">
                    {row.label}
                  </dt>
                  <dd
                    className={
                      monoForced
                        ? 'text-[12px] font-mono tabular-nums text-right py-0.5'
                        : 'text-[12px] text-right py-0.5'
                    }
                  >
                    {row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}
