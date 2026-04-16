/**
 * AlertStrip — encadré de message, rectangulaire, pour erreurs/avertissements/infos.
 *
 * PAS un toast, PAS une card. Juste un bloc horizontal avec :
 *   - trait coloré 3px à gauche (rouge / ambre / ardoise)
 *   - tag mono majuscule 10px à gauche du texte (ERR / AVIS / INFO)
 *   - titre optionnel + corps de message
 *
 * Interdictions :
 *   - pas d'icône emoji
 *   - pas de bordure arrondie > 2px
 *   - pas de shadow
 *   - pas d'animation d'entrée
 */

import type { ReactNode } from 'react';

export type AlertKind = 'error' | 'warning' | 'info';

const KIND_CLS: Record<AlertKind, string> = {
  error: 'is-error',
  warning: 'is-warning',
  info: 'is-info',
};

const KIND_TAG: Record<AlertKind, string> = {
  error: 'ERR',
  warning: 'AVIS',
  info: 'INFO',
};

export interface AlertStripProps {
  kind: AlertKind;
  title?: ReactNode;
  children?: ReactNode;
}

export function AlertStrip({ kind, title, children }: AlertStripProps) {
  return (
    <div className={`alert-strip ${KIND_CLS[kind]}`}>
      <span
        className="font-mono font-semibold text-[10px] tracking-wider pt-[1px] shrink-0"
        style={{ minWidth: 36 }}
      >
        {KIND_TAG[kind]}
      </span>
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold text-[12px]">{title}</div>}
        {children && (
          <div className="text-[12px] text-[color:var(--fg-muted)] leading-tight">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
