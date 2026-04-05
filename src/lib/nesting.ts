import type { PieceWithBody, PackingBin, PackedPiece } from '../types';

interface ExpandedPiece extends PieceWithBody {
  uid: string;
  cW: number;
  cH: number;
}

export function packPieces(
  pieces: PieceWithBody[],
  panelWidth: number,
  panelHeight: number,
  kerf: number
): PackingBin[] {
  const expanded: ExpandedPiece[] = [];
  pieces.forEach((p) => {
    for (let i = 0; i < p.qty; i++) {
      expanded.push({
        ...p,
        uid: `${p.id}_${i}`,
        cW: p.length + kerf,
        cH: p.width + kerf,
      });
    }
  });

  expanded.sort((a, b) => Math.max(b.cW, b.cH) - Math.max(a.cW, a.cH));

  const bins: PackingBin[] = [];

  const tryPlace = (bin: PackingBin, pc: ExpandedPiece): boolean => {
    const orientations = [
      { w: pc.cW, h: pc.cH, r: false },
      { w: pc.cH, h: pc.cW, r: true },
    ];

    for (const sh of bin.shelves) {
      for (const o of orientations) {
        if (sh.rem >= o.w && sh.h >= o.h) {
          bin.pl.push({
            ...pc,
            x: panelWidth - sh.rem,
            y: sh.y,
            pw: o.w,
            ph: o.h,
            rotated: o.r,
          } as PackedPiece);
          sh.rem -= o.w;
          return true;
        }
      }
    }

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

  for (const pc of expanded) {
    let placed = false;
    for (const bin of bins) {
      if (tryPlace(bin, pc)) {
        placed = true;
        break;
      }
    }
    if (!placed) {
      const newBin: PackingBin = { shelves: [], pl: [] };
      tryPlace(newBin, pc);
      bins.push(newBin);
    }
  }

  return bins;
}
