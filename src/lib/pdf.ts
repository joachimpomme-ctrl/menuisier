import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AppState, Piece, ValidationResult, Step, PackedPiece, PanelDef } from '../types';
import type { HardwareItem, Assumption, AssemblyStep } from './knowledge/types';
import type { ProjectAnalysis } from './projectAnalysis';
import { MATERIALS } from '../data/materials';
import { getBodyInnerWidth, getUsableHeight, isSharedLeft } from './helpers';

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
// Plans 2D — primitives & helpers (T2)
// ---------------------------------------------------------------------------

const DIM_COLOR: [number, number, number] = hexToRgb('#9A968F');
const DIM_ACCENT: [number, number, number] = hexToRgb('#3B5FFF');
const PIECE_NUM_COLOR: [number, number, number] = hexToRgb('#3B5FFF');

/** Lighten color by mixing with white (ratio 0 = original, 1 = white). */
function tint(c: [number, number, number], ratio: number): [number, number, number] {
  return [
    Math.round(c[0] + (255 - c[0]) * ratio),
    Math.round(c[1] + (255 - c[1]) * ratio),
    Math.round(c[2] + (255 - c[2]) * ratio),
  ];
}

/** Cote horizontale : ligne avec flèches + label centré au-dessus. */
function drawDimH(
  doc: jsPDF,
  x1: number, x2: number, y: number,
  label: string,
  opts: { offset?: number; color?: [number, number, number]; fontSize?: number } = {},
): void {
  const color = opts.color ?? DIM_COLOR;
  const offset = opts.offset ?? 5;
  const fontSize = opts.fontSize ?? 7;
  const lineY = y + offset;
  const arrow = 1.2;

  doc.setDrawColor(...color);
  doc.setLineWidth(0.12);
  doc.line(x1, y, x1, lineY + 0.5);
  doc.line(x2, y, x2, lineY + 0.5);
  doc.setLineWidth(0.2);
  doc.line(x1, lineY, x2, lineY);
  doc.setFillColor(...color);
  doc.triangle(x1, lineY, x1 + arrow, lineY - arrow / 2, x1 + arrow, lineY + arrow / 2, 'F');
  doc.triangle(x2, lineY, x2 - arrow, lineY - arrow / 2, x2 - arrow, lineY + arrow / 2, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  doc.text(label, (x1 + x2) / 2, lineY - 0.6, { align: 'center' });
}

/** Cote verticale : ligne avec flèches + label rotaté. */
function drawDimV(
  doc: jsPDF,
  y1: number, y2: number, x: number,
  label: string,
  opts: { offset?: number; color?: [number, number, number]; fontSize?: number } = {},
): void {
  const color = opts.color ?? DIM_COLOR;
  const offset = opts.offset ?? 5;
  const fontSize = opts.fontSize ?? 7;
  const lineX = x + offset;
  const arrow = 1.2;

  doc.setDrawColor(...color);
  doc.setLineWidth(0.12);
  doc.line(x, y1, lineX + 0.5, y1);
  doc.line(x, y2, lineX + 0.5, y2);
  doc.setLineWidth(0.2);
  doc.line(lineX, y1, lineX, y2);
  doc.setFillColor(...color);
  doc.triangle(lineX, y1, lineX - arrow / 2, y1 + arrow, lineX + arrow / 2, y1 + arrow, 'F');
  doc.triangle(lineX, y2, lineX - arrow / 2, y2 - arrow, lineX + arrow / 2, y2 - arrow, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  doc.text(label, lineX - 1.5, (y1 + y2) / 2, { align: 'center', angle: 90 });
}

/** Rectangle rempli léger (tinté) + contour de la même couleur. */
function fillTintRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  color: [number, number, number],
  tintRatio = 0.78,
): void {
  if (w <= 0 || h <= 0) return;
  const fill = tint(color, tintRatio);
  doc.setFillColor(...fill);
  doc.setDrawColor(...color);
  doc.setLineWidth(0.15);
  doc.rect(x, y, w, h, 'FD');
}

/** Annotation P{n} centrée sur une zone si la place le permet. */
function drawPieceNumber(
  doc: jsPDF,
  piece: Piece | undefined,
  x: number, y: number, w: number, h: number,
  fontSize = 6,
): void {
  if (!piece || piece.pieceNumber === undefined) return;
  if (w < 4 || h < 2.5) return;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(fontSize);
  doc.setTextColor(...PIECE_NUM_COLOR);
  doc.text(`P${piece.pieceNumber}`, x + w / 2, y + h / 2 + 0.6, { align: 'center' });
}

/** Bandeau de section dans une page plan (titre + sous-titre + ligne séparatrice). */
function planSectionHeader(doc: jsPDF, y: number, title: string, subtitle?: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...TITLE_COLOR);
  doc.text(title, MARGIN, y);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(subtitle, MARGIN, y + 5);
  }
  doc.setDrawColor(...DIM_ACCENT);
  doc.setLineWidth(0.4);
  doc.line(MARGIN, y + 7, PAGE_W - MARGIN, y + 7);
  return y + 11;
}

/**
 * Vue de face — caissons côte à côte avec joues, étagères, séparateurs, portes,
 * plinthe et bandeaux. Cote la largeur de chaque corps + largeur intérieure +
 * hauteur utile. Annotation P{n} sur joues / tablettes fixes / séparateurs /
 * bandeaux quand la place le permet.
 *
 * Dessine dans la fenêtre {origin, area} (mm). Reserve `dimMargin` mm sur la
 * gauche/bas pour les cotes.
 */
function drawFaceView(
  doc: jsPDF,
  state: AppState,
  origin: { x: number; y: number },
  area: { w: number; h: number },
): void {
  const bodies = state.bodies;
  if (bodies.length === 0) return;

  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);
  const th = state.panel.thickness;
  const totalW_cm = bodies.reduce((s, b) => s + b.width, 0);
  const joueLengths = bodies.flatMap((b) => b.pieces.filter((p) => p.type === 'joue').map((p) => p.length));
  const maxH_cm = Math.max(usableHeight, ...joueLengths, 100);

  const dimLeft = 14;
  const dimBottom = 16;
  const dimTop = 4;
  const innerW = area.w - dimLeft - 4;
  const innerH = area.h - dimBottom - dimTop;
  const scale = Math.min(innerW / totalW_cm, innerH / maxH_cm);

  const drawW = totalW_cm * scale;
  const drawH = maxH_cm * scale;
  const x0 = origin.x + dimLeft + (innerW - drawW) / 2;
  const y0 = origin.y + dimTop;

  const colorJoue = hexToRgb('#3b82f6');
  const colorFixe = hexToRgb('#10b981');
  const colorRegl = hexToRgb('#f59e0b');
  const colorSep = hexToRgb('#0ea5e9');
  const colorPorte = hexToRgb('#f97316');
  const colorBand = hexToRgb('#8b5cf6');

  let offX = x0;
  bodies.forEach((b) => {
    const bx = offX;
    const bw = b.width * scale;
    const bh = drawH;
    const tw = Math.max(th * scale, 0.35);
    offX += bw + 2;

    // Body outline (light)
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.rect(bx, y0, bw, bh);

    // Joue gauche (skip if shared)
    const realBi = state.bodies.findIndex((bb) => bb.id === b.id);
    const sl = isSharedLeft(realBi, state.sharedBoundaries ?? []);
    if (!sl) {
      fillTintRect(doc, bx, y0, tw, bh, colorJoue, 0.82);
      const joueG = b.pieces.find((p) => p.type === 'joue');
      drawPieceNumber(doc, joueG, bx, y0, tw, bh, 5);
    }
    // Joue droite
    fillTintRect(doc, bx + bw - tw, y0, tw, bh, colorJoue, 0.82);
    const joueD = b.pieces.filter((p) => p.type === 'joue').slice(-1)[0];
    drawPieceNumber(doc, joueD, bx + bw - tw, y0, tw, bh, 5);

    // Plinthe cutouts (white rect over joues at bottom)
    const ph = state.project.plinthHeight;
    if (ph > 0) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.15);
      doc.rect(bx, y0 + bh - ph * scale, tw, ph * scale, 'FD');
      doc.rect(bx + bw - tw, y0 + bh - ph * scale, tw, ph * scale, 'FD');
    }

    // Fixed shelves (use posY when set, else fallback distribution)
    const fixedExpanded = b.pieces
      .filter((p) => p.type === 'tablette-fixe')
      .flatMap((p) => Array.from({ length: p.qty }, () => p));
    fixedExpanded.forEach((p, i) => {
      const posY = typeof p.posY === 'number'
        ? p.posY
        : fixedExpanded.length === 1
          ? maxH_cm - 2
          : i === 0
            ? maxH_cm - 2
            : i === 1
              ? 2
              : (maxH_cm * (i - 1)) / (fixedExpanded.length - 1);
      const shelfY = y0 + bh - posY * scale - tw / 2;
      fillTintRect(doc, bx + tw, shelfY, bw - 2 * tw, tw, colorFixe, 0.72);
      // P{n} si pièce assez large à l'écran
      if (i === 0) drawPieceNumber(doc, p, bx + tw, shelfY, bw - 2 * tw, tw, 5);
      // H= annotation (côté droit)
      if (typeof p.posY === 'number') {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(...colorFixe);
        doc.text(`H=${posY}`, bx + bw - tw - 0.8, shelfY - 0.5, { align: 'right' });
      }
    });

    // Adjustable shelves (dashed lines)
    const adjustExpanded = b.pieces
      .filter((p) => p.type === 'tablette-reglable')
      .flatMap((p) => Array.from({ length: p.qty }, () => p));
    if (adjustExpanded.length > 0) {
      doc.setDrawColor(...colorRegl);
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([0.8, 0.6], 0);
      adjustExpanded.forEach((p, i) => {
        const posY = typeof p.posY === 'number'
          ? p.posY
          : 20 + (i + 1) * ((maxH_cm - 40) / (adjustExpanded.length + 1));
        const shelfY = y0 + bh - posY * scale;
        doc.line(bx + tw + 0.4, shelfY, bx + bw - tw - 0.4, shelfY);
      });
      doc.setLineDashPattern([], 0);
    }

    // Separateurs (vertical pieces)
    const sepExpanded = b.pieces
      .filter((p) => p.type === 'separateur')
      .flatMap((p) => Array.from({ length: p.qty }, () => p));
    if (sepExpanded.length > 0) {
      const innerWcm = b.width - 2 * th;
      sepExpanded.forEach((sep, si) => {
        const sxCm = typeof sep.posX === 'number'
          ? sep.posX
          : (innerWcm * (si + 1)) / (sepExpanded.length + 1);
        const sx = bx + tw + sxCm * scale - tw / 2;
        const sepLen = sep.length * scale;
        const sepBaseY = typeof sep.posY === 'number' ? sep.posY : (maxH_cm - sep.length) / 2;
        const sepY = y0 + bh - sepBaseY * scale - sepLen;
        fillTintRect(doc, sx, sepY, tw, sepLen, colorSep, 0.78);
        drawPieceNumber(doc, sep, sx, sepY + sepLen / 2 - 2, tw, 3.5, 4.5);
      });
    }

    // Bandeaux
    const bandExpanded = b.pieces
      .filter((p) => p.type === 'bandeau')
      .flatMap((p) => Array.from({ length: p.qty }, () => p));
    bandExpanded.forEach((bd, bdi) => {
      const bdH = bd.width * scale;
      const yTop = typeof bd.posY === 'number'
        ? y0 + bh - bd.posY * scale - bdH
        : y0 - bdH;
      fillTintRect(doc, bx, yTop, bw, bdH, colorBand, 0.78);
      if (bdi === 0) drawPieceNumber(doc, bd, bx, yTop, bw, bdH, 5);
    });

    // Portes (dashed outline only)
    const portes = b.pieces.filter((p) => p.type === 'porte');
    if (portes.length > 0) {
      doc.setDrawColor(...colorPorte);
      doc.setLineWidth(0.3);
      doc.setLineDashPattern([1.2, 0.8], 0);
      const portW = (bw - 2 * tw) / portes.length;
      portes.forEach((_p, pi) => {
        const px = bx + tw + pi * portW;
        doc.rect(px + 0.4, y0 + 0.4, portW - 0.8, bh - 0.8);
        // Door handle dot
        doc.setLineDashPattern([], 0);
        const handle = hexToRgb('#f97316');
        doc.setFillColor(...handle);
        doc.circle(px + portW - 2, y0 + bh / 2, 0.4, 'F');
        doc.setLineDashPattern([1.2, 0.8], 0);
        doc.setDrawColor(...colorPorte);
      });
      doc.setLineDashPattern([], 0);
    }

    // Body label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(b.name, bx + bw / 2, y0 - 1.2, { align: 'center' });

    // Width dim (under body)
    drawDimH(doc, bx, bx + bw, y0 + bh, `${b.width}`, { offset: 4 });
    // Inner width (sharing-aware) on second cote line
    const iw = getBodyInnerWidth(b.width, realBi, state.bodies.length, state.sharedBoundaries ?? [], th);
    const ix1 = sl ? bx : bx + tw;
    drawDimH(doc, ix1, bx + bw - tw, y0 + bh, `${iw}`, { offset: 9, color: DIM_ACCENT, fontSize: 6 });
  });

  // Height dim (left side of all bodies)
  drawDimV(doc, y0, y0 + drawH, x0 - 3, `${maxH_cm}`, { offset: -8 });
  // Thickness annotation
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...DIM_COLOR);
  doc.text(`ép. ${th * 10} mm`, origin.x + area.w - 1, origin.y + 2, { align: 'right' });
}

/**
 * Vue de dessus — chaque corps comme rectangle largeur × profondeur, ligne MUR
 * en haut, joues + dos visibles. Cotes largeur + profondeur.
 */
function drawTopView(
  doc: jsPDF,
  state: AppState,
  origin: { x: number; y: number },
  area: { w: number; h: number },
): void {
  const bodies = state.bodies;
  if (bodies.length === 0) return;

  const th = state.panel.thickness;
  const totalW_cm = bodies.reduce((s, b) => s + b.width, 0);
  const maxDepth_cm = Math.max(...bodies.map((b) => b.depth), 30);

  const dimLeft = 10;
  const dimBottom = 14;
  const dimTop = 10;
  const innerW = area.w - dimLeft - 4;
  const innerH = area.h - dimBottom - dimTop;
  const scale = Math.min(innerW / totalW_cm, innerH / maxDepth_cm);

  const drawW = totalW_cm * scale;
  const x0 = origin.x + dimLeft + (innerW - drawW) / 2;
  const y0 = origin.y + dimTop;

  // Wall line
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(x0 - 4, y0, x0 + drawW + 4, y0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...DIM_COLOR);
  doc.text('MUR', x0 - 4, y0 - 1, { align: 'left' });

  const colorJoue = hexToRgb('#3b82f6');
  const colorFond = hexToRgb('#6b7280');

  let offX = x0;
  bodies.forEach((b, bi) => {
    const bx = offX;
    const bw = b.width * scale;
    const bd = b.depth * scale;
    const tw = Math.max(th * scale, 0.35);
    offX += bw + 2;

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.rect(bx, y0, bw, bd);

    // Joues
    fillTintRect(doc, bx, y0, tw, bd, colorJoue, 0.82);
    fillTintRect(doc, bx + bw - tw, y0, tw, bd, colorJoue, 0.82);
    // Fond
    fillTintRect(doc, bx + tw, y0, bw - 2 * tw, tw / 2.5, colorFond, 0.7);

    // Body label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(b.name, bx + bw / 2, y0 + bd / 2 + 1, { align: 'center' });

    // Width
    drawDimH(doc, bx, bx + bw, y0 + bd, `${b.width}`, { offset: 4 });
    // Depth (only on first body to avoid clutter)
    if (bi === 0) drawDimV(doc, y0, y0 + bd, bx - 1.5, `${b.depth}`, { offset: -6 });
  });
}

/**
 * Vue de côté — profil du premier corps : profondeur × hauteur avec joue,
 * fond, tablettes fixes, plinthe.
 */
function drawSideView(
  doc: jsPDF,
  state: AppState,
  origin: { x: number; y: number },
  area: { w: number; h: number },
): void {
  const body = state.bodies[0];
  if (!body) return;

  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);
  const th = state.panel.thickness;
  const joueLens = body.pieces.filter((p) => p.type === 'joue').map((p) => p.length);
  const maxH_cm = Math.max(usableHeight, ...joueLens, 100);
  const depth = body.depth;

  const dimLeft = 12;
  const dimBottom = 14;
  const dimTop = 10;
  const innerW = area.w - dimLeft - 8;
  const innerH = area.h - dimBottom - dimTop;
  const scale = Math.min(innerW / depth, innerH / maxH_cm);

  const drawW = depth * scale;
  const drawH = maxH_cm * scale;
  const x0 = origin.x + dimLeft + (innerW - drawW) / 2;
  const y0 = origin.y + dimTop;
  const tw = Math.max(th * scale, 0.35);

  const colorJoue = hexToRgb('#3b82f6');
  const colorFond = hexToRgb('#6b7280');
  const colorFixe = hexToRgb('#10b981');

  // Wall line (left)
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(x0, y0 - 4, x0, y0 + drawH + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...DIM_COLOR);
  doc.text('MUR', x0 - 0.5, y0 - 5, { align: 'right' });

  // Joue (side panel as full profile)
  fillTintRect(doc, x0, y0, drawW, drawH, colorJoue, 0.88);
  // Back panel (vertical strip on wall side)
  fillTintRect(doc, x0, y0, tw / 2.5, drawH, colorFond, 0.7);

  // Fixed shelves (lines across depth)
  const fixedExpanded = body.pieces
    .filter((p) => p.type === 'tablette-fixe')
    .flatMap((p) => Array.from({ length: p.qty }, () => p));
  fixedExpanded.forEach((p, i) => {
    const posY = typeof p.posY === 'number'
      ? p.posY
      : fixedExpanded.length === 1
        ? maxH_cm - 2
        : i === 0
          ? maxH_cm - 2
          : i === 1
            ? 2
            : (maxH_cm * (i - 1)) / (fixedExpanded.length - 1);
    const shelfY = y0 + drawH - posY * scale - tw / 2;
    fillTintRect(doc, x0, shelfY, drawW, tw, colorFixe, 0.72);
    if (i === 0) drawPieceNumber(doc, p, x0, shelfY, drawW, tw, 5);
    if (typeof p.posY === 'number') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(4.5);
      doc.setTextColor(...colorFixe);
      doc.text(`H=${posY}`, x0 + drawW - 0.5, shelfY - 0.5, { align: 'right' });
    }
  });

  // Plinthe cutout
  const ph = state.project.plinthHeight;
  const pd = state.project.plinthDepth;
  if (ph > 0 && pd > 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.15);
    doc.rect(x0, y0 + drawH - ph * scale, pd * scale, ph * scale, 'FD');
  }

  // Body label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${body.name} — vue de côté`, x0 + drawW / 2, y0 - 1.2, { align: 'center' });

  // Dims
  drawDimV(doc, y0, y0 + drawH, x0 + drawW + 1, `${maxH_cm}`, { offset: 4 });
  drawDimH(doc, x0, x0 + drawW, y0 + drawH, `${depth}`, { offset: 4 });
}

/**
 * Vue en coupe transversale (section verticale) — comme drawSideView mais on
 * "coupe" la joue côté pour révéler l'intérieur : étagères en pleine largeur
 * cotées H={posY}, profondeur utile cotée, dos en rainure visible.
 */
function drawCrossSection(
  doc: jsPDF,
  state: AppState,
  origin: { x: number; y: number },
  area: { w: number; h: number },
): void {
  const body = state.bodies[0];
  if (!body) return;

  const usableHeight = getUsableHeight(state.project.ceilingHeight, state.project.plinthHeight);
  const th = state.panel.thickness;
  const joueLens = body.pieces.filter((p) => p.type === 'joue').map((p) => p.length);
  const maxH_cm = Math.max(usableHeight, ...joueLens, 100);
  const depth = body.depth;

  const dimLeft = 12;
  const dimBottom = 14;
  const dimTop = 10;
  const innerW = area.w - dimLeft - 12;
  const innerH = area.h - dimBottom - dimTop;
  const scale = Math.min(innerW / depth, innerH / maxH_cm);

  const drawW = depth * scale;
  const drawH = maxH_cm * scale;
  const x0 = origin.x + dimLeft + (innerW - drawW) / 2;
  const y0 = origin.y + dimTop;
  const tw = Math.max(th * scale, 0.35);

  const colorJoue = hexToRgb('#3b82f6');
  const colorFond = hexToRgb('#6b7280');
  const colorFixe = hexToRgb('#10b981');
  const colorRegl = hexToRgb('#f59e0b');
  const colorSep = hexToRgb('#0ea5e9');

  // Mur (gauche)
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.5);
  doc.line(x0, y0 - 4, x0, y0 + drawH + 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...DIM_COLOR);
  doc.text('MUR', x0 - 0.5, y0 - 5, { align: 'right' });

  // Contour du caisson (joue côté virtuellement "coupée" → trait pointillé)
  doc.setDrawColor(...colorJoue);
  doc.setLineWidth(0.35);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.rect(x0, y0, drawW, drawH);
  doc.setLineDashPattern([], 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...colorJoue);
  doc.text('Joue (coupe)', x0 + drawW - 0.5, y0 + 2.5, { align: 'right' });

  // Dos (en arrière, contre mur) — rect rempli mince
  fillTintRect(doc, x0, y0, tw / 2.2, drawH, colorFond, 0.55);
  const fondPiece = body.pieces.find((p) => p.type === 'fond');
  drawPieceNumber(doc, fondPiece, x0, y0 + drawH / 2 - 2, tw / 2.2, 3, 4);

  // Plinthe cutout (transparente)
  const ph = state.project.plinthHeight;
  const pd = state.project.plinthDepth;
  if (ph > 0 && pd > 0) {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.18);
    doc.rect(x0, y0 + drawH - ph * scale, pd * scale, ph * scale, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...DIM_COLOR);
    doc.text(`plinthe ${ph}×${pd}`, x0 + 1, y0 + drawH - ph * scale / 2 + 0.5, { align: 'left' });
  }

  // Fixed shelves (en coupe : pleine largeur, opaque)
  const fixedExpanded = body.pieces
    .filter((p) => p.type === 'tablette-fixe')
    .flatMap((p) => Array.from({ length: p.qty }, () => p));
  fixedExpanded.forEach((p, i) => {
    const posY = typeof p.posY === 'number'
      ? p.posY
      : fixedExpanded.length === 1
        ? maxH_cm - 2
        : i === 0
          ? maxH_cm - 2
          : i === 1
            ? 2
            : (maxH_cm * (i - 1)) / (fixedExpanded.length - 1);
    const shelfY = y0 + drawH - posY * scale - tw / 2;
    // Tablette commence après le dos (x0 + tw/2.2)
    const shelfX = x0 + tw / 2.2;
    const shelfW = drawW - tw / 2.2;
    fillTintRect(doc, shelfX, shelfY, shelfW, tw, colorFixe, 0.55);
    drawPieceNumber(doc, p, shelfX, shelfY, shelfW, tw, 5);
    // Cote H= à gauche (entre mur et tablette)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...colorFixe);
    doc.text(`H=${posY}`, x0 - 0.5, shelfY + tw / 2 + 1, { align: 'right' });
  });

  // Adjustable shelves (en coupe : lignes opaques)
  const adjustExpanded = body.pieces
    .filter((p) => p.type === 'tablette-reglable')
    .flatMap((p) => Array.from({ length: p.qty }, () => p));
  if (adjustExpanded.length > 0) {
    doc.setDrawColor(...colorRegl);
    adjustExpanded.forEach((p, i) => {
      const posY = typeof p.posY === 'number'
        ? p.posY
        : 20 + (i + 1) * ((maxH_cm - 40) / (adjustExpanded.length + 1));
      const shelfY = y0 + drawH - posY * scale;
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([1.2, 0.8], 0);
      doc.line(x0 + tw / 2.2 + 0.3, shelfY, x0 + drawW - 0.3, shelfY);
      doc.setLineDashPattern([], 0);
      // P{n} si premier réglable
      if (i === 0 && p.pieceNumber !== undefined) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);
        doc.setTextColor(...colorRegl);
        doc.text(`P${p.pieceNumber} (régl.)`, x0 + drawW / 2, shelfY - 0.6, { align: 'center' });
      }
    });
  }

  // Séparateurs verticaux (vue de côté = trait vertical à la position posY)
  // On les annote mais sans les dessiner pleins (puisque vu de profil ils sont fins)
  const separators = body.pieces.filter((p) => p.type === 'separateur');
  if (separators.length > 0) {
    doc.setDrawColor(...colorSep);
    doc.setLineWidth(0.4);
    separators.forEach((sep) => {
      const sepLen = sep.length * scale;
      const sepBaseY = typeof sep.posY === 'number' ? sep.posY : (maxH_cm - sep.length) / 2;
      const sepY = y0 + drawH - sepBaseY * scale - sepLen;
      // Position approximative dans la profondeur (centré sur intérieur)
      const sepDX = x0 + tw / 2.2 + (drawW - tw / 2.2) / 2;
      doc.setLineDashPattern([0.6, 0.4], 0);
      doc.line(sepDX, sepY, sepDX, sepY + sepLen);
      doc.setLineDashPattern([], 0);
      if (sep.pieceNumber !== undefined) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(4.5);
        doc.setTextColor(...colorSep);
        doc.text(`P${sep.pieceNumber}`, sepDX + 0.5, sepY + sepLen / 2, { align: 'left' });
      }
    });
  }

  // Body label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEXT_COLOR);
  doc.text(`${body.name} — coupe transversale`, x0 + drawW / 2, y0 - 1.2, { align: 'center' });

  // Cotes
  drawDimV(doc, y0, y0 + drawH, x0 + drawW + 2, `${maxH_cm}`, { offset: 5 });
  drawDimH(doc, x0, x0 + drawW, y0 + drawH, `${depth}`, { offset: 4 });
  // Profondeur utile (intérieur = depth - dos) sur 2ème ligne
  const innerDepth = +(depth - (th / 2.2)).toFixed(1);
  drawDimH(doc, x0 + tw / 2.2, x0 + drawW, y0 + drawH, `${innerDepth} utile`, {
    offset: 9, color: DIM_ACCENT, fontSize: 6,
  });
}

/**
 * Insère 4 pages de plans cotés (face, dessus, côté, coupe) dans le doc.
 * Chaque page : titre + sous-titre matériau/épaisseur + plan + légende.
 */
function appendPlanPages(doc: jsPDF, state: AppState): void {
  const mat = MATERIALS[state.materialKey];
  const subtitle = `${state.project.name} — ${mat.short} ${state.panel.thickness * 10} mm — dimensions en cm`;

  // ---- Page : Vue de face ----
  doc.addPage();
  let y = MARGIN + 5;
  y = planSectionHeader(doc, y, 'Plans cotés — Vue de face', subtitle);
  drawFaceView(doc, state, { x: MARGIN, y }, { w: CONTENT_W, h: PAGE_H - y - 30 });
  drawPlanLegend(doc, PAGE_H - 22);

  // ---- Page : Vue de dessus ----
  doc.addPage();
  y = MARGIN + 5;
  y = planSectionHeader(doc, y, 'Plans cotés — Vue de dessus', subtitle);
  drawTopView(doc, state, { x: MARGIN, y }, { w: CONTENT_W, h: PAGE_H - y - 30 });
  drawPlanLegend(doc, PAGE_H - 22);

  // ---- Page : Vue de côté ----
  doc.addPage();
  y = MARGIN + 5;
  y = planSectionHeader(doc, y, 'Plans cotés — Vue de côté', subtitle);
  drawSideView(doc, state, { x: MARGIN, y }, { w: CONTENT_W, h: PAGE_H - y - 30 });
  drawPlanLegend(doc, PAGE_H - 22);

  // ---- Page : Coupe transversale (intérieur révélé) ----
  doc.addPage();
  y = MARGIN + 5;
  y = planSectionHeader(doc, y, 'Plans cotés — Coupe transversale', subtitle);
  drawCrossSection(doc, state, { x: MARGIN, y }, { w: CONTENT_W, h: PAGE_H - y - 30 });
  drawPlanLegend(doc, PAGE_H - 22);
}

function drawPlanLegend(doc: jsPDF, y: number): void {
  const items: Array<[string, [number, number, number]]> = [
    ['Joue', hexToRgb('#3b82f6')],
    ['Tablette fixe', hexToRgb('#10b981')],
    ['Tablette réglable', hexToRgb('#f59e0b')],
    ['Séparateur', hexToRgb('#0ea5e9')],
    ['Bandeau', hexToRgb('#8b5cf6')],
    ['Porte', hexToRgb('#f97316')],
    ['Fond', hexToRgb('#6b7280')],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...TEXT_COLOR);
  let x = MARGIN;
  for (const [label, color] of items) {
    fillTintRect(doc, x, y - 2.3, 2.6, 2.6, color, 0.7);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(label, x + 3.4, y, { align: 'left' });
    x += doc.getTextWidth(label) + 8;
  }
  doc.setFontSize(6);
  doc.setTextColor(...DIM_COLOR);
  doc.text(
    'P{n} = numéro atelier (cf. liste de découpe). Plans non contractuels — vérifier sur chantier.',
    MARGIN, y + 4,
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface V3PdfData {
  hardware: HardwareItem[];
  assumptions: Assumption[];
  edgeBandingParts: { name: string; sides: string }[];
  drillingParts?: { name: string; ops: string[] }[];
  /** Séquence d'assemblage V3 (13 étapes par défaut). Si présent, remplace
   *  la page Notice "Step[]" legacy pour un rendu atelier complet. */
  assemblyGuide?: AssemblyStep[];
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
  // Plans cotés — 3 vues (face, dessus, côté) avec numérotation atelier P{n}
  // =========================================================================
  appendPlanPages(doc, state);

  // =========================================================================
  // Page suivante — Cut list table (grouped by body, sorted by area desc)
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

        // Label : num\u00e9ro pi\u00e8ce dominant + nom/dim si place dispo
        if (pw > 6 && ph > 3) {
          doc.setTextColor(255, 255, 255);
          if (p.pieceNumber !== undefined) {
            const numFontSize = pw > 25 && ph > 12 ? 9 : pw > 12 && ph > 6 ? 7 : 5.5;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(numFontSize);
            doc.text(`P${p.pieceNumber}`, px + pw / 2, py + ph / 2 + numFontSize * 0.15, {
              align: 'center',
              baseline: 'middle',
            });
          }
          if (pw > 25 && ph > 12) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(5.5);
            const dim = `${p.length}\u00d7${p.width}`;
            doc.text(dim, px + pw / 2, py + ph - 1.5, { align: 'center', maxWidth: pw - 2 });
          }
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

  if (v3Data?.assemblyGuide && v3Data.assemblyGuide.length > 0) {
    // Rendu V3 enrichi : step_number, title, instructions, parts_involved,
    // hardware_involved, tip
    const accent = hexToRgb('#3B5FFF');
    const tipBg = hexToRgb('#FFF8DD');
    const tipBorder = hexToRgb('#FFD23F');
    const partsColor = hexToRgb('#9A968F');

    for (const step of v3Data.assemblyGuide) {
      y = ensureSpace(doc, y, 24);

      // Step number badge (cobalt) + title
      doc.setFillColor(...accent);
      doc.circle(MARGIN + 3, y - 1.8, 2.6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(step.step_number), MARGIN + 3, y - 0.5, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...TITLE_COLOR);
      doc.text(step.title, MARGIN + 8, y);
      y += 6;

      // Instructions
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      for (const instr of step.instructions) {
        y = ensureSpace(doc, y, 6);
        doc.setTextColor(...TEXT_COLOR);
        const lines = doc.splitTextToSize(`\u2022 ${instr}`, CONTENT_W - 8);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5);
          doc.text(line, MARGIN + 4, y);
          y += 4.4;
        }
      }

      // Parts involved (italic, dimmer)
      if (step.parts_involved && step.parts_involved.length > 0) {
        y = ensureSpace(doc, y, 6);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...partsColor);
        const partsText = `Pi\u00e8ces : ${step.parts_involved.join(', ')}`;
        const lines = doc.splitTextToSize(partsText, CONTENT_W - 8);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5);
          doc.text(line, MARGIN + 4, y);
          y += 4;
        }
      }

      // Hardware involved
      if (step.hardware_involved && step.hardware_involved.length > 0) {
        y = ensureSpace(doc, y, 6);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...partsColor);
        const hwText = `Quincaillerie : ${step.hardware_involved.join(', ')}`;
        const lines = doc.splitTextToSize(hwText, CONTENT_W - 8);
        for (const line of lines) {
          y = ensureSpace(doc, y, 5);
          doc.text(line, MARGIN + 4, y);
          y += 4;
        }
      }

      // Tip \u2014 jaune highlight box
      if (step.tip) {
        y = ensureSpace(doc, y, 8);
        const tipLines = doc.splitTextToSize(`\ud83d\udca1 ${step.tip}`, CONTENT_W - 12);
        const tipH = 4 + tipLines.length * 4;
        doc.setFillColor(...tipBg);
        doc.setDrawColor(...tipBorder);
        doc.setLineWidth(0.3);
        doc.rect(MARGIN + 4, y - 2.5, CONTENT_W - 8, tipH, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...TEXT_COLOR);
        let tipY = y;
        for (const line of tipLines) {
          doc.text(line, MARGIN + 6, tipY);
          tipY += 4;
        }
        y += tipH;
      }

      y += 4;
    }
  } else {
    // Fallback legacy V2 : Step[]
    for (const step of steps) {
      y = ensureSpace(doc, y, 20);

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

    // Sort pieces by pieceNumber (atelier order) if available, else by body+type
    const sorted = [...pieces].sort((a, b) => {
      if (a.pieceNumber !== undefined && b.pieceNumber !== undefined) {
        return a.pieceNumber - b.pieceNumber;
      }
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
      const numLabel = p.pieceNumber !== undefined ? `P${p.pieceNumber}` : String(i + 1);
      rows.push([
        numLabel,
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
