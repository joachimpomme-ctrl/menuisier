import type { PanelDef, AppState } from '../../types';
import { MATERIALS } from '../../data/materials';

/**
 * Get the effective PanelDef for a piece (resolves panelId to actual panel).
 *
 * - panelId undefined or 'default' -> returns the main (default) panel
 * - panelId matching an extraPanel -> returns that extra panel
 * - panelId not found -> falls back to the default panel
 */
export function getPanelForPiece(panelId: string | undefined, state: AppState): PanelDef {
  const mat = MATERIALS[state.materialKey];

  const defaultPanel: PanelDef = {
    id: 'default',
    label: `${mat.short} ${state.panel.thickness * 10}mm`,
    width: state.panel.width,
    height: state.panel.height,
    thickness: state.panel.thickness,
    price: state.costConfig.panelPrice,
  };

  if (!panelId || panelId === 'default') return defaultPanel;

  const extra = (state.extraPanels ?? []).find((p) => p.id === panelId);
  return extra ?? defaultPanel;
}
