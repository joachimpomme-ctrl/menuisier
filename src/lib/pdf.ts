import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppState, ValidationResult, Step, PackedPiece, PanelDef } from '../types';
import type { HardwareItem, Assumption } from './knowledge/types';
import type { ProjectAnalysis } from './projectAnalysis';
import { MATERIALS } from '../data/materials';
import { getUsableHeight } from './helpers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

const PIECE_COLORS: Record<string, string> = {
  'joue': '#3b82f6',
  'tablette-fixe': '#10b981',
  'tablette-reglable': '#f59e0b',
  'separateur': '#0ea5e9',
  'bandeau': '#8b5cf6',
  'porte': '#f97316',
  'tiroir-facade': '#06b6d4',
  'fond': '#6b7280',
  'autre': '#ec4899',
};

const MARGIN = 20; // mm
const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const CONTENT_W = PAGE_W - 2 * MARGIN; // usable width mm
const TITLE_COLOR = hexToRgb('#1e3a5f');
const TEXT_COLOR = hexToRgb('#333333');
const ROW_ALT_COLOR: [number, number, number] = [245, 245, 250];

function frenchDate(): string {
  const d = new Date();
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Footer helper — called after all pages are created
// ---------------------------------------------------------------------------

function addFooters(doc: jsPDF): void {
  const total = doc.getNumberOfPages();
  const date = frenchDate();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT_COLOR);

    // bottom left
    doc.text('Menuisier \u2014 Dossier de fabrication', MARGIN, PAGE_H - 10);
    // bottom center
    doc.text(`Page ${i} / ${total}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
    // bottom right
    doc.text(date, PAGE_W - MARGIN, PAGE_H - 10, { align: 'right' });
  }
}

// ---------------------------------------------------------------------------
// Section helper
// ---------------------------------------------------------------------------

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TITLE_COLOR);
  doc.text(title, MARGIN, y);
  return y + 8;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - 25) {
    doc.addPage();
    return MARGIN + 10;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface V3PdfData {
  hardware: HardwareItem[];
  assumptions: Assumption[];
  edgeBandingParts: { name: string; sides: string }[];
  drillingParts?: { name: string; ops: string[] }[];
}

export async function generatePdf(
  state: AppState,
  analysis: ProjectAnalysis,
  validation: ValidationResult,
  steps: Step[],
  v3Data?: V3PdfData,
): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mat = MATERIALS[state.materialKey];
  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);
  const date = frenchDate();

  // =========================================================================
  // Page 1 — Cover + Summary
  // =========================================================================
  let y = MARGIN + 15;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...TITLE_COLOR);
  doc.text(state.project.name, MARGIN, y);
  y += 10;

  // Date
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(date, MARGIN, y);
  y += 12;

  // Material
  y = sectionTitle(doc, y, 'Materiau');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${mat.name} — epaisseur ${state.panel.thickness * 10} mm`, MARGIN, y);
  y += 6;
  doc.text(
    `Panneau ${state.panel.width} \u00d7 ${state.panel.height} cm`,
    MARGIN,
    y,
  );
  y += 10;

  // Dimensions
  y = sectionTitle(doc, y, 'Dimensions');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`Mur : ${state.project.wallWidth} cm (L) \u00d7 ${state.project.wallDepth} cm (P)`, MARGIN, y);
  y += 5;
  doc.text(`Plafond : ${state.project.ceilingHeight} cm`, MARGIN, y);
  y += 5;
  doc.text(`Hauteur utile : ${usableHeight} cm (plinthe ${state.project.plinthHeight} cm)`, MARGIN, y);
  y += 10;

  // Summary
  y = sectionTitle(doc, y, 'Resume');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);

  doc.text(`Corps : ${state.bodies.length}`, MARGIN, y);
  y += 5;
  doc.text(`Pieces totales : ${analysis.totalPieces}`, MARGIN, y);
  y += 5;
  doc.text(`Panneaux necessaires : ${analysis.totalPanelCount}`, MARGIN, y);
  y += 5;
  doc.text(`Efficacite moyenne : ${analysis.avgEfficiency.toFixed(1)} %`, MARGIN, y);
  y += 5;
  if (analysis.weightKg > 0) {
    doc.text(`Poids estime : ${analysis.weightKg.toFixed(1)} kg`, MARGIN, y);
    y += 5;
  }
  y += 5;

  // Multi-panel breakdown table
  if (analysis.panels.length > 0) {
    y = sectionTitle(doc, y, 'Panneaux');

    const panelRows = analysis.panels.map((pu) => [
      pu.panelDef.label,
      `${pu.panelDef.width} \u00d7 ${pu.panelDef.height}`,
      `${pu.panelDef.thickness * 10}`,
      String(pu.panelCount),
      `${pu.efficiency.toFixed(1)} %`,
      pu.panelDef.price > 0 ? `${pu.cost.toFixed(2)} \u20ac` : '-',
    ]);

    // Grand total row
    panelRows.push([
      { content: 'Total', colSpan: 3, styles: { fontStyle: 'bold' } },
      '', '',
      String(analysis.totalPanelCount),
      `${analysis.avgEfficiency.toFixed(1)} %`,
      analysis.configured ? `${analysis.totalCost.toFixed(2)} \u20ac` : '-',
    ] as unknown as string[]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Panneau', 'Dim. (cm)', 'Ep. (mm)', 'Qte', 'Efficacite', 'Cout']],
      body: panelRows,
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT_COLOR },
      headStyles: {
        fillColor: TITLE_COLOR,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: ROW_ALT_COLOR },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Cost summary
  if (analysis.configured) {
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, y, 'Estimation de cout');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(`Cout matiere total : ${analysis.totalCost.toFixed(2)} \u20ac HT`, MARGIN, y);
    y += 10;
  }

  if (v3Data && v3Data.hardware.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, y, 'Quincaillerie');

    const hwRows = v3Data.hardware.map((h) => [
      h.name,
      String(h.quantity),
      h.category,
      h.unit_price_eur !== undefined ? `${(h.unit_price_eur * h.quantity).toFixed(2)} €` : '—',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Article', 'Qte', 'Categorie', 'Cout']],
      body: hwRows,
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT_COLOR },
      headStyles: { fillColor: TITLE_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ROW_ALT_COLOR },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (v3Data && v3Data.drillingParts && v3Data.drillingParts.length > 0) {
    y = ensureSpace(doc, y, 30);
    y = sectionTitle(doc, y, 'Plans de percage');

    const drillingRows = v3Data.drillingParts.flatMap((part) =>
      part.ops.map((op, index) => [index === 0 ? part.name : '', op]),
    );

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Piece', 'Operations']],
      body: drillingRows,
      styles: { font: 'helvetica', fontSize: 9, textColor: TEXT_COLOR, cellPadding: 2 },
      headStyles: { fillColor: TITLE_COLOR, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: ROW_ALT_COLOR },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (v3Data && v3Data.assumptions.length > 0) {
    y = ensureSpace(doc, y, 20);
    y = sectionTitle(doc, y, 'Hypotheses et decisions');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const decisions = v3Data.assumptions.filter(
      (a) => a.category === 'decision' || a.key.endsWith('_decision'),
    );
    const toVerify = v3Data.assumptions.filter(
      (a) => a.category !== 'decision' && !a.key.endsWith('_decision') && a.user_should_verify,
    );
    const auto = v3Data.assumptions.filter(
      (a) => a.category !== 'decision' && !a.key.endsWith('_decision') && !a.user_should_verify,
    );

    if (decisions.length > 0) {
      doc.setTextColor(...hexToRgb('#4f46e5'));
      doc.setFont('helvetica', 'bold');
      doc.text('Decisions du moteur :', MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      for (const a of decisions) {
        y = ensureSpace(doc, y, 6);
        const lines = doc.splitTextToSize(`• ${a.value} — ${a.reason}`, CONTENT_W - 8);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5);
          doc.text(line, MARGIN + 4, y);
          y += 4.5;
        }
      }
      y += 3;
    }

    if (toVerify.length > 0) {
      doc.setTextColor(...hexToRgb('#ea580c'));
      doc.setFont('helvetica', 'bold');
      doc.text('A verifier :', MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      for (const a of toVerify) {
        y = ensureSpace(doc, y, 6);
        const lines = doc.splitTextToSize(`• ${a.value} — ${a.reason}`, CONTENT_W - 8);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5);
          doc.text(line, MARGIN + 4, y);
          y += 4.5;
        }
      }
      y += 3;
    }

    if (auto.length > 0) {
      doc.setTextColor(...TEXT_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text('Hypotheses et valeurs par defaut :', MARGIN, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      for (const a of auto) {
        y = ensureSpace(doc, y, 6);
        doc.text(`• ${a.key}: ${a.value}`, MARGIN + 4, y);
        y += 4.5;
      }
      y += 3;
    }
  }

  // Validation summary
  y = ensureSpace(doc, y, 15);
  y = sectionTitle(doc, y, 'Validation');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(
    `${validation.errors.length} erreur(s), ${validation.warnings.length} avertissement(s)`,
    MARGIN,
    y,
  );
  y += 6;

  if (validation.errors.length > 0) {
    doc.setTextColor(...hexToRgb('#dc2626'));
    doc.setFont('helvetica', 'bold');
    doc.text('Erreurs bloquantes :', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const error of validation.errors) {
      const lines = doc.splitTextToSize(`• ${error}`, CONTENT_W - 8);
      for (const line of lines) {
        y = ensureSpace(doc, y, 5);
        doc.text(line, MARGIN + 4, y);
        y += 4.5;
      }
    }
    y += 3;
  }

  if (validation.warnings.length > 0) {
    doc.setTextColor(...hexToRgb('#ea580c'));
    doc.setFont('helvetica', 'bold');
    doc.text('Avertissements :', MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    for (const warning of validation.warnings) {
      const lines = doc.splitTextToSize(`• ${warning}`, CONTENT_W - 8);
      for (const line of lines) {
        y = ensureSpace(doc, y, 5);
        doc.text(line, MARGIN + 4, y);
        y += 4.5;
      }
    }
  }

  // =========================================================================
  // Page 2+ — Cut list table (grouped by body, sorted by area desc)
  // =========================================================================
  doc.addPage();

  y = MARGIN + 5;
  y = sectionTitle(doc, y, 'Liste de decoupe');

  // Build a lookup: panelId -> panelDef label & thickness
  const defaultPanelDef = analysis.panels.find(p => p.panelDef.id === 'default')?.panelDef;
  const allPanelDefs = analysis.panels.map(p => p.panelDef);

  function getPanelLabel(panelId?: string): string {
    if (!panelId || panelId === 'default') {
      return defaultPanelDef?.label ?? `${mat.short} ${state.panel.thickness * 10}mm`;
    }
    return allPanelDefs.find(d => d.id === panelId)?.label ?? panelId;
  }

  function getPanelThicknessMm(panelId?: string): number {
    if (!panelId || panelId === 'default') {
      return (defaultPanelDef?.thickness ?? state.panel.thickness) * 10;
    }
    const pd = allPanelDefs.find(d => d.id === panelId);
    return pd ? pd.thickness * 10 : state.panel.thickness * 10;
  }

  // Group pieces by body, then sort within each group by area desc
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableBody: any[][] = [];
  let grandTotalQty = 0;

  for (const b of state.bodies) {
    const bodyPieces = [...b.pieces].sort((a, bx) => bx.length * bx.width * bx.qty - a.length * a.width * a.qty);
    let bodyQty = 0;

    for (const p of bodyPieces) {
      bodyQty += p.qty;
      const edgeInfo = v3Data?.edgeBandingParts.find((e) => e.name === p.name);
      tableBody.push([
        p.name,
        p.type,
        String(p.length),
        String(p.width),
        String(p.qty),
        getPanelLabel(p.panelId),
        String(getPanelThicknessMm(p.panelId)),
        edgeInfo?.sides ?? '—',
      ]);
    }

    // Subtotal row for body
    tableBody.push([
      { content: `${b.name} — ${bodyQty} pcs`, colSpan: 8, styles: { fontStyle: 'bold', fillColor: [235, 235, 240] } },
    ]);

    grandTotalQty += bodyQty;
  }

  // Grand total
  tableBody.push([
    { content: `TOTAL : ${grandTotalQty} pieces`, colSpan: 8, styles: { fontStyle: 'bold', fillColor: TITLE_COLOR } },
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['Piece', 'Type', 'L (cm)', 'l (cm)', 'Qte', 'Panneau', 'Ep. (mm)', 'Chant']],
    body: tableBody,
    styles: { font: 'helvetica', fontSize: 8, textColor: TEXT_COLOR, cellPadding: 2 },
    headStyles: {
      fillColor: TITLE_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: { fillColor: ROW_ALT_COLOR },
    // Override the grand total row text color to white
    didParseCell(data) {
      // Grand total row (last body row)
      if (data.section === 'body' && data.row.index === tableBody.length - 1) {
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
  });

  // =========================================================================
  // Nesting diagrams — MULTI-PANEL
  // =========================================================================
  for (const panelUsage of analysis.panels) {
    const pd = panelUsage.panelDef;
    const panelW = pd.width;  // cm
    const panelH = pd.height; // cm
    const scaleW = CONTENT_W; // fit 170mm width
    const rawScale = scaleW / panelW; // mm per cm
    const rawDiagramH = panelH * rawScale; // mm height of one diagram
    const maxDiagramH = (PAGE_H - 2 * MARGIN - 30) / 2; // max height for 2 per page
    const effectiveScale = rawDiagramH > maxDiagramH ? maxDiagramH / panelH : rawScale;
    const effectiveDiagramW = panelW * effectiveScale;
    const effectiveDiagramH = panelH * effectiveScale;

    let diagramsOnPage = 0;
    doc.addPage();
    y = MARGIN + 5;
    y = sectionTitle(doc, y, `Calepinage — ${pd.label} — ${pd.width}\u00d7${pd.height} cm`);

    panelUsage.nesting.bins.forEach((bin, idx) => {
      // Check if we need a new page (max 2 diagrams per page)
      if (diagramsOnPage >= 2) {
        doc.addPage();
        y = MARGIN + 10;
        diagramsOnPage = 0;
      }

      y = ensureSpace(doc, y, effectiveDiagramH + 20);

      // Panel label
      const binUsed = bin.pl.reduce((s: number, p: PackedPiece) => s + p.pw * p.ph, 0);
      const binTotal = panelW * panelH;
      const binEfficiency = binTotal > 0 ? (binUsed / binTotal) * 100 : 0;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...TEXT_COLOR);
      doc.text(
        `Panneau ${idx + 1} / ${panelUsage.nesting.bins.length} — Efficacite ${binEfficiency.toFixed(1)} %`,
        MARGIN,
        y,
      );
      y += 5;

      // Panel outline
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.5);
      doc.rect(MARGIN, y, effectiveDiagramW, effectiveDiagramH);

      // Pieces
      for (const p of bin.pl) {
        const color = PIECE_COLORS[p.type] ?? PIECE_COLORS['autre'];
        const [r, g, b] = hexToRgb(color);
        doc.setFillColor(r, g, b);
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.3);

        const px = MARGIN + p.x * effectiveScale;
        const py = y + p.y * effectiveScale;
        const pw = p.pw * effectiveScale;
        const ph = p.ph * effectiveScale;

        doc.rect(px, py, pw, ph, 'FD');

        // Label (only if big enough)
        if (pw > 12 && ph > 5) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(255, 255, 255);
          const labelText = `${p.name} ${p.length}\u00d7${p.width}`;
          doc.text(labelText, px + 1, py + 3.5, { maxWidth: pw - 2 });
        }
      }

      y += effectiveDiagramH + 10;
      diagramsOnPage++;
    });
  }

  // =========================================================================
  // Validation detail page
  // =========================================================================
  doc.addPage();
  y = MARGIN + 5;
  y = sectionTitle(doc, y, 'Validation detaillee');

  if (validation.errors.length === 0 && validation.warnings.length === 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...hexToRgb('#16a34a'));
    doc.text('Aucune anomalie', MARGIN, y);
  } else {
    // Errors
    if (validation.errors.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...hexToRgb('#dc2626'));
      doc.text('Erreurs', MARGIN, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const err of validation.errors) {
        y = ensureSpace(doc, y, 6);
        doc.text(`\u2022 ${err}`, MARGIN + 4, y);
        y += 5;
      }
      y += 4;
    }

    // Warnings
    if (validation.warnings.length > 0) {
      y = ensureSpace(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...hexToRgb('#ea580c'));
      doc.text('Avertissements', MARGIN, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      for (const w of validation.warnings) {
        y = ensureSpace(doc, y, 6);
        doc.text(`\u2022 ${w}`, MARGIN + 4, y);
        y += 5;
      }
    }
  }

  // =========================================================================
  // Notice de montage
  // =========================================================================
  doc.addPage();
  y = MARGIN + 5;
  y = sectionTitle(doc, y, 'Notice de montage');

  for (const step of steps) {
    y = ensureSpace(doc, y, 20);

    // Step title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...TITLE_COLOR);
    doc.text(step.title, MARGIN, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    for (const item of step.items) {
      y = ensureSpace(doc, y, 6);

      const isWarning = item.startsWith('\u26a0');
      if (isWarning) {
        doc.setTextColor(...hexToRgb('#ea580c'));
      } else {
        doc.setTextColor(...TEXT_COLOR);
      }

      // Wrap long lines
      const lines = doc.splitTextToSize(`\u2022 ${item}`, CONTENT_W - 8);
      for (const line of lines) {
        y = ensureSpace(doc, y, 5);
        doc.text(line, MARGIN + 4, y);
        y += 4.5;
      }
      y += 1;
    }

    y += 4;
  }

  // =========================================================================
  // Footers on every page
  // =========================================================================
  addFooters(doc);

  // =========================================================================
  // Save
  // =========================================================================
  const fileName = `${slugify(state.project.name)}-dossier-${isoDate()}.pdf`;
  doc.save(fileName);
}

// ---------------------------------------------------------------------------
// Cut-list PDF — "Fiche de découpe atelier"
// ---------------------------------------------------------------------------

const CL_PAGE_W = 297; // A4 landscape width mm
const CL_PAGE_H = 210; // A4 landscape height mm
const CL_MARGIN = 15;

const CL_HEADER_BG: [number, number, number] = hexToRgb('#3B5FFF'); // accent (cobalt)
const CL_HEADER_TXT: [number, number, number] = [255, 255, 255];
const CL_ALT_ROW: [number, number, number] = hexToRgb('#E5EAFF'); // accent-light
const CL_TOTAL_BG: [number, number, number] = hexToRgb('#1E3FCC'); // accent-dark

function clFooters(doc: jsPDF, extra: string): void {
  const total = doc.getNumberOfPages();
  const date = frenchDate();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_COLOR);
    doc.text('Fiche de d\u00e9coupe atelier', CL_MARGIN, CL_PAGE_H - 8);
    doc.text(`Page ${i} / ${total}`, CL_PAGE_W / 2, CL_PAGE_H - 8, { align: 'center' });
    doc.text(date, CL_PAGE_W - CL_MARGIN, CL_PAGE_H - 8, { align: 'right' });
    if (i === total && extra) {
      doc.setFontSize(8);
      doc.text(extra, CL_MARGIN, CL_PAGE_H - 14);
    }
  }
}

function clEnsureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > CL_PAGE_H - 20) {
    doc.addPage('landscape');
    return CL_MARGIN + 5;
  }
  return y;
}

export function generateCutListPdf(
  state: AppState,
  analysis: ProjectAnalysis,
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const mat = MATERIALS[state.materialKey];

  // ---- Header ----
  let y = CL_MARGIN + 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...CL_HEADER_BG);
  doc.text(`Fiche de d\u00e9coupe \u2014 ${state.project.name}`, CL_MARGIN, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${frenchDate()} \u2014 Mat\u00e9riau : ${mat.name}`, CL_MARGIN, y + 6);
  y += 14;

  // Build panel definitions lookup
  const defaultPanelDef: PanelDef = {
    id: 'default',
    label: `${mat.short} ${state.panel.thickness * 10}mm`,
    width: state.panel.width,
    height: state.panel.height,
    thickness: state.panel.thickness,
    price: state.costConfig.panelPrice,
  };
  const allPanelDefs = [defaultPanelDef, ...(state.extraPanels ?? [])];

  // Group pieces by panelId
  const piecesByPanel = new Map<string, typeof analysis.allPieces>();
  for (const p of analysis.allPieces) {
    const pid = p.panelId ?? 'default';
    if (!piecesByPanel.has(pid)) piecesByPanel.set(pid, []);
    piecesByPanel.get(pid)!.push(p);
  }

  let grandTotalQty = 0;
  let grandTotalSurface = 0;

  // ---- One section per panel type ----
  for (const pd of allPanelDefs) {
    const pieces = piecesByPanel.get(pd.id);
    if (!pieces || pieces.length === 0) continue;

    y = clEnsureSpace(doc, y, 30);

    // Panel section title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...CL_HEADER_BG);
    doc.text(`${pd.label} \u2014 ${pd.width}\u00d7${pd.height} cm, \u00e9p. ${pd.thickness * 10} mm`, CL_MARGIN, y);
    y += 5;

    // Sort pieces by body then by type
    const sorted = [...pieces].sort((a, b) => {
      const cmp = a.bodyName.localeCompare(b.bodyName);
      if (cmp !== 0) return cmp;
      return a.type.localeCompare(b.type);
    });

    // Build table rows
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[][] = [];
    let sectionQty = 0;
    let sectionSurface = 0;

    sorted.forEach((p, i) => {
      const surface = p.length * p.width * p.qty;
      sectionQty += p.qty;
      sectionSurface += surface;
      rows.push([
        String(i + 1),
        p.bodyName,
        p.name,
        p.type,
        String(p.length),
        String(p.width),
        String(p.qty),
        surface.toLocaleString('fr-FR'),
      ]);
    });

    grandTotalQty += sectionQty;
    grandTotalSurface += sectionSurface;

    // Total row
    rows.push([
      { content: `Total : ${sectionQty} pi\u00e8ces`, colSpan: 7, styles: { fontStyle: 'bold', fillColor: CL_TOTAL_BG, textColor: CL_HEADER_TXT } },
      { content: sectionSurface.toLocaleString('fr-FR'), styles: { fontStyle: 'bold', fillColor: CL_TOTAL_BG, textColor: CL_HEADER_TXT } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: CL_MARGIN, right: CL_MARGIN },
      head: [['N\u00b0', 'Corps', 'Pi\u00e8ce', 'Type', 'Long. (cm)', 'Larg. (cm)', 'Qt\u00e9', 'Surface (cm\u00b2)']],
      body: rows,
      styles: { font: 'helvetica', fontSize: 8, textColor: TEXT_COLOR, cellPadding: 1.8 },
      headStyles: {
        fillColor: CL_HEADER_BG,
        textColor: CL_HEADER_TXT,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      alternateRowStyles: { fillColor: CL_ALT_ROW },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'center' },
        7: { halign: 'right' },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ---- Footer info ----
  const footerExtra = `Trait de scie : ${state.kerf} mm \u2014 Panneaux n\u00e9cessaires : ${analysis.totalPanelCount} \u2014 Surface totale : ${(grandTotalSurface / 10000).toFixed(2)} m\u00b2 (${grandTotalQty} pi\u00e8ces)`;

  clFooters(doc, footerExtra);

  // ---- Save ----
  const fileName = `${slugify(state.project.name)}-fiche-decoupe-${isoDate()}.pdf`;
  doc.save(fileName);
}
