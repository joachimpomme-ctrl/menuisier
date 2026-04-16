/**
 * DataTable — tableau dense pour données métier.
 *
 * Caractéristiques :
 *   - lignes 24px, police 12px, mono 11px pour colonnes numériques
 *   - headers en majuscules 10.5px, 0.08em tracking
 *   - rangées alternées (panelAlt)
 *   - hover et sélection en accent-bg + trait accent vertical 2px à gauche
 *   - pas d'arrondis, pas de shadow, séparateurs 1px hairline
 *
 * Contrat strict :
 *   - chaque colonne déclare `align: 'left' | 'right'` — `right` active
 *     automatiquement tabular-nums + SF Mono + font-size 11.5px.
 *   - les valeurs sont des `ReactNode`, pas de HTML brut (pas de
 *     `dangerouslySetInnerHTML`).
 *   - PAS de prop `style` inline au niveau table, row ou cell.
 *   - PAS de tri interactif, pas de pagination UI, pas d'accordéon.
 *     Ces comportements, s'ils deviennent nécessaires, feront l'objet
 *     d'une extension explicite documentée, pas d'une prop passe-partout.
 *
 * Pas de :
 *   - tri interactif (à ajouter plus tard, en pattern séparé)
 *   - pagination UI (tables virtuelles en aval si besoin)
 *   - emojis, icônes décoratives
 */

import type { ReactNode, CSSProperties } from 'react';

export interface DataTableColumn<T> {
  /** Clé unique, utilisée comme `key` React et pour le scope accessibilité. */
  key: string;
  /**
   * En-tête de colonne, affiché en majuscules 10.5px.
   * Accepté : string ou nœud simple. Jamais d'emoji.
   */
  header: ReactNode;
  /** Alignement — 'right' bascule en typo monospace tabulaire. */
  align?: 'left' | 'right';
  /** Largeur fixe optionnelle (px ou %). */
  width?: number | string;
  /** Fonction de rendu, reçoit la ligne entière. Doit renvoyer du contenu
   * DS-compatible : texte, nombre, `<ProcurementBadge>`, `<StatusBadge>`,
   * mini-span mono. Jamais de `<div>` avec `bg-*`, `rounded-*`. */
  render: (row: T, rowIndex: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Retourne l'id stable d'une ligne (utilisé pour key + sélection). */
  rowId: (row: T) => string;
  /** Id de la ligne sélectionnée (surlignage accent + trait à gauche). */
  selectedId?: string | null;
  /** Callback au clic sur une ligne. */
  onSelect?: (row: T) => void;
  /** Message affiché si rows est vide. */
  emptyLabel?: string;
  /** Hauteur maximale ; au-delà la table défile. */
  maxHeight?: number | string;
}

export function DataTable<T>({
  columns,
  rows,
  rowId,
  selectedId,
  onSelect,
  emptyLabel = 'Aucune donnée',
  maxHeight,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="p-6 text-center text-[color:var(--fg-subtle)] text-[12px] italic">
        {emptyLabel}
      </div>
    );
  }

  const wrapperStyle: CSSProperties | undefined = maxHeight
    ? { maxHeight, overflowY: 'auto' }
    : undefined;

  return (
    <div className={maxHeight ? 'scroll-y' : ''} style={wrapperStyle}>
      <table className="dtable">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.align === 'right' ? 'num' : undefined}
                style={col.width !== undefined ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const id = rowId(row);
            const isSelected = selectedId === id;
            return (
              <tr
                key={id}
                className={isSelected ? 'is-selected' : undefined}
                onClick={onSelect ? () => onSelect(row) : undefined}
                style={onSelect ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={col.align === 'right' ? 'num' : undefined}>
                    {col.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
