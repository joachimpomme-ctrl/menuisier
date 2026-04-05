import type { PieceWithBody, PackingBin, PackedPiece, NestingResult, NestingMetrics } from '../types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ExpandedPiece extends PieceWithBody {
  uid: string;
  cW: number; // length + kerf
  cH: number; // width  + kerf
}

function expand(pieces: PieceWithBody[], kerf: number): ExpandedPiece[] {
  const out: ExpandedPiece[] = [];
  for (const p of pieces) {
    for (let i = 0; i < p.qty; i++) {
      out.push({
        ...p,
        uid: `${p.id}_${i}`,
        cW: p.length + kerf,
        cH: p.width + kerf,
      });
    }
  }
  return out;
}

function fitsPanel(pc: ExpandedPiece, panelWidth: number, panelHeight: number): boolean {
  const minW = Math.min(pc.cW, pc.cH);
  const maxW = Math.max(pc.cW, pc.cH);
  return (minW <= panelWidth && maxW <= panelHeight) || (maxW <= panelWidth && minW <= panelHeight);
}

function computeMetrics(
  pieces: PieceWithBody[],
  bins: PackingBin[],
  panelWidth: number,
  panelHeight: number,
): NestingMetrics {
  const usedArea = pieces.reduce((s, p) => s + p.length * p.width * p.qty, 0);
  const totalArea = panelWidth * panelHeight * bins.length;
  const wasteArea = totalArea - usedArea;
  const efficiency = totalArea > 0 ? (usedArea / totalArea) * 100 : 0;
  return { panelCount: bins.length, usedArea, totalArea, wasteArea, efficiency };
}

// ---------------------------------------------------------------------------
// Strategy 1 — Shelf-based (improved with best-fit shelf selection)
// ---------------------------------------------------------------------------

type SortFn = (a: ExpandedPiece, b: ExpandedPiece) => number;

const shelfSorts: { name: string; fn: SortFn }[] = [
  { name: 'shelf-height-desc', fn: (a, b) => Math.max(b.cW, b.cH) - Math.max(a.cW, a.cH) },
  { name: 'shelf-width-desc', fn: (a, b) => Math.max(b.cW, b.cH) - Math.max(a.cW, a.cH) },
  { name: 'shelf-area-desc', fn: (a, b) => b.cW * b.cH - a.cW * a.cH },
  { name: 'shelf-perimeter-desc', fn: (a, b) => (b.cW + b.cH) - (a.cW + a.cH) },
];

// Override sort 0 & 1 to actually differ:
shelfSorts[0].fn = (a, b) => {
  const aH = Math.max(a.cW, a.cH);
  const bH = Math.max(b.cW, b.cH);
  return bH - aH || (b.cW * b.cH) - (a.cW * a.cH);
};
shelfSorts[1].fn = (a, b) => {
  const aW = Math.min(a.cW, a.cH);
  const bW = Math.min(b.cW, b.cH);
  return bW - aW || (b.cW * b.cH) - (a.cW * a.cH);
};

function runShelf(
  expanded: ExpandedPiece[],
  panelWidth: number,
  panelHeight: number,
  sortFn: SortFn,
): PackingBin[] {
  const sorted = [...expanded].sort(sortFn);
  const bins: PackingBin[] = [];

  const tryPlace = (bin: PackingBin, pc: ExpandedPiece): boolean => {
    const orientations = [
      { w: pc.cW, h: pc.cH, r: false },
      { w: pc.cH, h: pc.cW, r: true },
    ];

    // Best-fit shelf selection: pick the shelf with least remaining space that still fits
    let bestShelf: (typeof bin.shelves)[number] | null = null;
    let bestOri: (typeof orientations)[number] | null = null;
    let bestRem = Infinity;

    for (const sh of bin.shelves) {
      for (const o of orientations) {
        if (sh.rem >= o.w && sh.h >= o.h) {
          const rem = sh.rem - o.w;
          if (rem < bestRem) {
            bestRem = rem;
            bestShelf = sh;
            bestOri = o;
          }
        }
      }
    }

    if (bestShelf && bestOri) {
      bin.pl.push({
        ...pc,
        x: panelWidth - bestShelf.rem,
        y: bestShelf.y,
        pw: bestOri.w,
        ph: bestOri.h,
        rotated: bestOri.r,
      } as PackedPiece);
      bestShelf.rem -= bestOri.w;
      return true;
    }

    // Open a new shelf
    const shelfY = bin.shelves.reduce((s, sh) => s + sh.h, 0);
    for (const o of orientations) {
      if (o.w <= panelWidth && shelfY + o.h <= panelHeight) {
        bin.shelves.push({ y: shelfY, h: o.h, rem: panelWidth - o.w });
        bin.pl.push({
          ...pc,
          x: 0,
          y: shelfY,
          pw: o.w,
          ph: o.h,
          rotated: o.r,
        } as PackedPiece);
        return true;
      }
    }

    return false;
  };

  for (const pc of sorted) {
    let placed = false;
    for (const bin of bins) {
      if (tryPlace(bin, pc)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const newBin: PackingBin = { shelves: [], pl: [] };
      if (tryPlace(newBin, pc)) {
        bins.push(newBin);
      }
    }
  }

  return bins;
}

// ---------------------------------------------------------------------------
// Strategy 2 — Guillotine
// ---------------------------------------------------------------------------

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface GuillotineBin {
  freeRects: FreeRect[];
  pl: PackedPiece[];
}

const guillotineSorts: { name: string; fn: SortFn }[] = [
  { name: 'guillotine-area-desc', fn: (a, b) => (b.cW * b.cH) - (a.cW * a.cH) },
  {
    name: 'guillotine-maxdim-desc',
    fn: (a, b) => Math.max(b.cW, b.cH) - Math.max(a.cW, a.cH) || (b.cW * b.cH) - (a.cW * a.cH),
  },
];

function splitRect(
  rect: FreeRect,
  pw: number,
  ph: number,
): FreeRect[] {
  const rw = rect.w - pw;
  const rh = rect.h - ph;

  // Horizontal split: right rectangle gets full remaining height
  const hSplit: FreeRect[] = [];
  if (rw > 0) hSplit.push({ x: rect.x + pw, y: rect.y, w: rw, h: rect.h });
  if (rh > 0) hSplit.push({ x: rect.x, y: rect.y + ph, w: pw, h: rh });

  // Vertical split: bottom rectangle gets full remaining width
  const vSplit: FreeRect[] = [];
  if (rw > 0) vSplit.push({ x: rect.x + pw, y: rect.y, w: rw, h: ph });
  if (rh > 0) vSplit.push({ x: rect.x, y: rect.y + ph, w: rect.w, h: rh });

  // Pick split that creates the larger single remaining rectangle
  const hMax = hSplit.reduce((m, r) => Math.max(m, r.w * r.h), 0);
  const vMax = vSplit.reduce((m, r) => Math.max(m, r.w * r.h), 0);
  return vMax >= hMax ? vSplit : hSplit;
}

function runGuillotine(
  expanded: ExpandedPiece[],
  panelWidth: number,
  panelHeight: number,
  sortFn: SortFn,
): PackingBin[] {
  const sorted = [...expanded].sort(sortFn);
  const bins: GuillotineBin[] = [];

  const makeBin = (): GuillotineBin => ({
    freeRects: [{ x: 0, y: 0, w: panelWidth, h: panelHeight }],
    pl: [],
  });

  const tryPlace = (bin: GuillotineBin, pc: ExpandedPiece): boolean => {
    const orientations = [
      { w: pc.cW, h: pc.cH, r: false },
      { w: pc.cH, h: pc.cW, r: true },
    ];

    let bestIdx = -1;
    let bestOri: (typeof orientations)[number] | null = null;
    let bestArea = Infinity;

    for (let i = 0; i < bin.freeRects.length; i++) {
      const fr = bin.freeRects[i];
      for (const o of orientations) {
        if (fr.w >= o.w && fr.h >= o.h) {
          const area = fr.w * fr.h;
          if (area < bestArea) {
            bestArea = area;
            bestIdx = i;
            bestOri = o;
          }
        }
      }
    }

    if (bestIdx === -1 || !bestOri) return false;

    const rect = bin.freeRects[bestIdx];
    bin.pl.push({
      ...pc,
      x: rect.x,
      y: rect.y,
      pw: bestOri.w,
      ph: bestOri.h,
      rotated: bestOri.r,
    } as PackedPiece);

    // Remove used rect, add splits
    bin.freeRects.splice(bestIdx, 1);
    const newRects = splitRect(rect, bestOri.w, bestOri.h);
    bin.freeRects.push(...newRects);

    return true;
  };

  for (const pc of sorted) {
    let placed = false;
    for (const bin of bins) {
      if (tryPlace(bin, pc)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const newBin = makeBin();
      if (tryPlace(newBin, pc)) {
        bins.push(newBin);
      }
    }
  }

  // Convert to PackingBin (shelves: [] for compatibility)
  return bins.map((b) => ({ shelves: [], pl: b.pl }));
}

// ---------------------------------------------------------------------------
// Main entry — run all strategies, pick the best
// ---------------------------------------------------------------------------

export function optimizeNesting(
  pieces: PieceWithBody[],
  panelWidth: number,
  panelHeight: number,
  kerf: number,
): NestingResult {
  // Separate pieces that can never fit even in a fresh panel
  const placeable: PieceWithBody[] = [];
  const unplaced: PieceWithBody[] = [];

  for (const p of pieces) {
    const testPiece = expand([p], kerf)[0];
    if (testPiece && fitsPanel(testPiece, panelWidth, panelHeight)) {
      placeable.push(p);
    } else {
      unplaced.push(p);
    }
  }

  if (placeable.length === 0) {
    return {
      bins: [],
      unplaced,
      metrics: computeMetrics(placeable, [], panelWidth, panelHeight),
      strategy: 'none',
    };
  }

  const expanded = expand(placeable, kerf);

  interface StrategyRun {
    name: string;
    bins: PackingBin[];
  }

  const runs: StrategyRun[] = [];

  // 4 shelf runs
  for (const s of shelfSorts) {
    runs.push({ name: s.name, bins: runShelf(expanded, panelWidth, panelHeight, s.fn) });
  }

  // 2 guillotine runs
  for (const s of guillotineSorts) {
    runs.push({ name: s.name, bins: runGuillotine(expanded, panelWidth, panelHeight, s.fn) });
  }

  // Pick the best: fewest panels first, then highest efficiency
  let best: StrategyRun = runs[0];
  for (let i = 1; i < runs.length; i++) {
    const r = runs[i];
    if (
      r.bins.length < best.bins.length ||
      (r.bins.length === best.bins.length &&
        computeMetrics(placeable, r.bins, panelWidth, panelHeight).efficiency >
          computeMetrics(placeable, best.bins, panelWidth, panelHeight).efficiency)
    ) {
      best = r;
    }
  }

  const metrics = computeMetrics(placeable, best.bins, panelWidth, panelHeight);

  return {
    bins: best.bins,
    unplaced,
    metrics,
    strategy: best.name,
  };
}

// ---------------------------------------------------------------------------
// Backward-compatible export
// ---------------------------------------------------------------------------

export function packPieces(
  pieces: PieceWithBody[],
  panelWidth: number,
  panelHeight: number,
  kerf: number,
): PackingBin[] {
  return optimizeNesting(pieces, panelWidth, panelHeight, kerf).bins;
}
