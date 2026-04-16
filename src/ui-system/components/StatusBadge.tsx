/**
 * StatusBadge — indication de statut en barre verticale + libellé court.
 *
 * PATTERN CRITIQUE MÉTIER : utilisé partout où le statut procurement d'une
 * pièce ou d'un article doit être visible immédiatement, sans avoir à lire.
 *
 * Forme :
 *   - pas une pill arrondie SaaS
 *   - une barre verticale 2×11px de la couleur de statut, suivie d'un label
 *   - tout le bloc hérite de la couleur principale du statut
 *
 * Variantes :
 *   - 'buy_exact'      → vert forêt  (la pièce s'achète telle quelle)
 *   - 'buy_and_rework' → ambre       (la pièce s'achète puis se perce/plaque)
 *   - 'cut_from_sheet' → ardoise     (la pièce se débite d'un panneau)
 *   - 'alert'          → rouge signal (erreur bloquante)
 *
 * Règles :
 *   - jamais de fond plein, jamais de bordure arrondie
 *   - label en majuscules 11px
 *   - compact: première lettre seulement (A / R / D)
 */

import type { ProcurementStatus } from '../tokens';
import { procurementLabel } from '../tokens';

export type BadgeKind = ProcurementStatus | 'alert';

const KIND_LABEL: Record<BadgeKind, string> = {
  buy_exact: procurementLabel.buy_exact,
  buy_and_rework: procurementLabel.buy_and_rework,
  cut_from_sheet: procurementLabel.cut_from_sheet,
  alert: 'ALERTE',
};

const KIND_CLS: Record<BadgeKind, string> = {
  buy_exact: 'sbadge-buy',
  buy_and_rework: 'sbadge-rework',
  cut_from_sheet: 'sbadge-cut',
  alert: 'sbadge-alert',
};

export interface StatusBadgeProps {
  kind: BadgeKind;
  /** Compact : affiche seulement la première lettre (A/R/D/⚠). */
  compact?: boolean;
  /** Titre accessibilité personnalisé (sinon label complet). */
  title?: string;
}

export function StatusBadge({ kind, compact, title }: StatusBadgeProps) {
  const full = KIND_LABEL[kind];
  const label = compact ? full.charAt(0) : full;
  return (
    <span className={`sbadge ${KIND_CLS[kind]}`} title={title ?? full}>
      {label}
    </span>
  );
}

/** Alias métier direct pour lisibilité dans les tableaux de pièces. */
export function ProcurementBadge(
  props: Omit<StatusBadgeProps, 'kind'> & { status: ProcurementStatus },
) {
  const { status, ...rest } = props;
  return <StatusBadge kind={status} {...rest} />;
}
