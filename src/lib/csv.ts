import type { PieceWithBody, PanelDef, AppState } from '../types';

export function generateCutListCsv(
  allPieces: PieceWithBody[],
  allPanelDefs: PanelDef[],
  state: AppState,
): string {
  const rows: string[] = [];
  // En-têtes : N° atelier en première colonne pour faciliter la lecture en débit
  rows.push('N°,Corps,Pièce,Type,Longueur (cm),Largeur (cm),Qté,Panneau,Épaisseur (mm)');

  // Tri stable par pieceNumber pour cohérence avec PDF et UI atelier
  const sorted = [...allPieces].sort((a, b) => {
    if (a.pieceNumber !== undefined && b.pieceNumber !== undefined) {
      return a.pieceNumber - b.pieceNumber;
    }
    return 0;
  });

  sorted.forEach((p) => {
    const panel = p.panelId ? allPanelDefs.find(pd => pd.id === p.panelId) : allPanelDefs[0];
    const panelLabel = panel?.label ?? 'Principal';
    const thicknessMm = (panel?.thickness ?? state.panel.thickness) * 10;
    // Escape CSV fields that might contain commas
    const escape = (s: string) => s.includes(',') ? `"${s}"` : s;
    const numLabel = p.pieceNumber !== undefined ? `P${p.pieceNumber}` : '';
    rows.push(`${numLabel},${escape(p.bodyName)},${escape(p.name)},${p.type},${p.length},${p.width},${p.qty},${escape(panelLabel)},${thicknessMm}`);
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
