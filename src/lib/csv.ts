import type { PieceWithBody, PanelDef, AppState } from '../types';

export function generateCutListCsv(
  allPieces: PieceWithBody[],
  allPanelDefs: PanelDef[],
  state: AppState,
): string {
  const rows: string[] = [];
  // BOM header
  rows.push('Corps,Pièce,Type,Longueur (cm),Largeur (cm),Qté,Panneau,Épaisseur (mm)');

  allPieces.forEach((p) => {
    const panel = p.panelId ? allPanelDefs.find(pd => pd.id === p.panelId) : allPanelDefs[0];
    const panelLabel = panel?.label ?? 'Principal';
    const thicknessMm = (panel?.thickness ?? state.panel.thickness) * 10;
    // Escape CSV fields that might contain commas
    const escape = (s: string) => s.includes(',') ? `"${s}"` : s;
    rows.push(`${escape(p.bodyName)},${escape(p.name)},${p.type},${p.length},${p.width},${p.qty},${escape(panelLabel)},${thicknessMm}`);
  });

  return rows.join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
