import type { AppState, MaterialKey, Piece, PieceType } from '../../types';
import { MATERIALS } from '../../data/materials';
import { uid } from '../helpers';

const VALID_PIECE_TYPES: PieceType[] = [
  'joue', 'tablette-fixe', 'tablette-reglable', 'separateur',
  'bandeau', 'porte', 'tiroir-facade', 'fond', 'autre',
];

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// AI Patch — small structured suggestion the IA can emit, applied with 1 clic
// ---------------------------------------------------------------------------
//
// Format expected from the IA inside an ```apply ... ``` fenced block:
//
// ```apply
// {
//   "title": "Profondeur 35 cm pour livres lourds",
//   "project": { "wallDepth": 35 },
//   "panel":   { "thickness": 1.9 },
//   "material": "cp_bouleau",
//   "bodies":  { "all": { "depth": 35 } }
// }
// ```
//
// Only whitelisted fields are applied — anything else is ignored.

export interface AIPatchPieceAdd {
  name: string;
  type: PieceType;
  length: number;
  width: number;
  qty?: number;
  thickness?: number;
}

export interface AIPatchPieceUpdate {
  /** Exact (case-insensitive) name of the piece to update */
  match: string;
  name?: string;
  type?: PieceType;
  length?: number;
  width?: number;
  qty?: number;
  thickness?: number;
}

export interface AIPatchBodyPieces {
  /** Append new pieces to this body */
  add?: AIPatchPieceAdd[];
  /** Remove all pieces whose name (case-insensitive) matches any entry */
  remove?: string[];
  /** Update first piece whose name (case-insensitive) matches `match` */
  update?: AIPatchPieceUpdate[];
}

export interface AIPatch {
  title?: string;
  project?: Partial<{
    name: string;
    wallWidth: number;
    wallDepth: number;
    ceilingHeight: number;
    plinthHeight: number;
    plinthDepth: number;
  }>;
  panel?: Partial<{ thickness: number; width: number; height: number }>;
  material?: MaterialKey;
  bodies?: {
    all?: Partial<{ width: number; depth: number }>;
    byName?: Array<{
      name: string;
      width?: number;
      depth?: number;
      pieces?: AIPatchBodyPieces;
    }>;
    /** Restructure to N equal-width bodies (pieces redistributed proportionally) */
    count?: number;
  };
}

export interface ParsedPatch {
  raw: string;
  patch: AIPatch;
  /** Human-readable summary of what will change */
  summary: string[];
}

const FENCE_RE = /```apply\s*\n([\s\S]*?)```/g;

/** Extract every ```apply``` block from a markdown message */
export function extractPatches(message: string): ParsedPatch[] {
  const out: ParsedPatch[] = [];
  let m: RegExpExecArray | null;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(message)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw) as AIPatch;
      out.push({ raw, patch: parsed, summary: summarizePatch(parsed) });
    } catch {
      // skip invalid JSON
    }
  }
  return out;
}

/** Strip ```apply``` blocks from a message for clean rendering */
export function stripPatches(message: string): string {
  return message.replace(FENCE_RE, '').trim();
}

function summarizePatch(p: AIPatch): string[] {
  const lines: string[] = [];
  if (p.project) {
    const items: string[] = [];
    if (p.project.name) items.push(`nom → "${p.project.name}"`);
    if (p.project.wallWidth != null) items.push(`largeur ${p.project.wallWidth} cm`);
    if (p.project.wallDepth != null) items.push(`profondeur ${p.project.wallDepth} cm`);
    if (p.project.ceilingHeight != null) items.push(`hauteur ${p.project.ceilingHeight} cm`);
    if (p.project.plinthHeight != null) items.push(`plinthe h. ${p.project.plinthHeight} cm`);
    if (p.project.plinthDepth != null) items.push(`plinthe p. ${p.project.plinthDepth} cm`);
    if (items.length) lines.push('Projet : ' + items.join(', '));
  }
  if (p.material) {
    const mat = MATERIALS[p.material];
    lines.push('Matériau : ' + (mat?.name ?? p.material));
  }
  if (p.panel) {
    const items: string[] = [];
    if (p.panel.thickness != null) items.push(`ép. ${p.panel.thickness * 10} mm`);
    if (p.panel.width != null) items.push(`L ${p.panel.width} cm`);
    if (p.panel.height != null) items.push(`H ${p.panel.height} cm`);
    if (items.length) lines.push('Panneau : ' + items.join(', '));
  }
  if (p.bodies?.count != null) {
    lines.push(`Structure : ${p.bodies.count} corps`);
  }
  if (p.bodies?.all) {
    const items: string[] = [];
    if (p.bodies.all.width != null) items.push(`largeur ${p.bodies.all.width} cm`);
    if (p.bodies.all.depth != null) items.push(`profondeur ${p.bodies.all.depth} cm`);
    if (items.length) lines.push('Tous les corps : ' + items.join(', '));
  }
  if (p.bodies?.byName?.length) {
    p.bodies.byName.forEach(b => {
      const items: string[] = [];
      if (b.width != null) items.push(`L ${b.width}`);
      if (b.depth != null) items.push(`P ${b.depth}`);
      if (items.length) lines.push(`${b.name} : ${items.join(', ')}`);
      const pp = b.pieces;
      if (pp?.add?.length) {
        lines.push(`${b.name} : + ${pp.add.length} pièce(s) (${pp.add.map(a => a.name).join(', ')})`);
      }
      if (pp?.remove?.length) {
        lines.push(`${b.name} : − ${pp.remove.length} pièce(s) (${pp.remove.join(', ')})`);
      }
      if (pp?.update?.length) {
        lines.push(`${b.name} : modif ${pp.update.length} pièce(s) (${pp.update.map(u => u.match).join(', ')})`);
      }
    });
  }
  return lines;
}

/** Apply a patch to an AppState (returns new state, never mutates) */
export function applyPatch(state: AppState, patch: AIPatch): AppState {
  const next: AppState = {
    ...state,
    project: { ...state.project },
    panel: { ...state.panel },
    bodies: state.bodies.map(b => ({ ...b })),
  };

  if (patch.project) {
    const p = patch.project;
    if (typeof p.name === 'string') next.project.name = p.name;
    if (typeof p.wallWidth === 'number') next.project.wallWidth = clamp(p.wallWidth, 10, 2000);
    if (typeof p.wallDepth === 'number') next.project.wallDepth = clamp(p.wallDepth, 10, 500);
    if (typeof p.ceilingHeight === 'number') next.project.ceilingHeight = clamp(p.ceilingHeight, 10, 1000);
    if (typeof p.plinthHeight === 'number') next.project.plinthHeight = clamp(p.plinthHeight, 0, 100);
    if (typeof p.plinthDepth === 'number') next.project.plinthDepth = clamp(p.plinthDepth, 0, 50);
  }

  if (patch.material && MATERIALS[patch.material]) {
    next.materialKey = patch.material;
  }

  if (patch.panel) {
    const pa = patch.panel;
    if (typeof pa.thickness === 'number') next.panel.thickness = clamp(pa.thickness, 0.3, 5);
    if (typeof pa.width === 'number') next.panel.width = clamp(pa.width, 50, 500);
    if (typeof pa.height === 'number') next.panel.height = clamp(pa.height, 50, 500);
  }

  if (patch.bodies?.count != null) {
    const n = clamp(Math.round(patch.bodies.count), 1, 20);
    const totalWidth = next.bodies.reduce((s, b) => s + b.width, 0);
    const newWidth = Math.round((totalWidth / n) * 10) / 10;
    const depth = next.bodies[0]?.depth ?? state.project.wallDepth;
    const allPieces = next.bodies.flatMap(b => b.pieces);
    next.bodies = Array.from({ length: n }, (_, i) => {
      const piecesPerBody = Math.ceil(allPieces.length / n);
      return {
        id: next.bodies[i]?.id ?? `body-adapt-${i + 1}`,
        name: `Corps ${i + 1}`,
        width: newWidth,
        depth,
        pieces: allPieces.slice(i * piecesPerBody, (i + 1) * piecesPerBody),
      };
    });
  }

  if (patch.bodies?.all) {
    const a = patch.bodies.all;
    next.bodies = next.bodies.map(b => ({
      ...b,
      width: typeof a.width === 'number' ? clamp(a.width, 10, 500) : b.width,
      depth: typeof a.depth === 'number' ? clamp(a.depth, 10, 200) : b.depth,
    }));
  }

  if (patch.bodies?.byName) {
    for (const upd of patch.bodies.byName) {
      const target = normalizeName(upd.name);
      next.bodies = next.bodies.map(b => {
        if (normalizeName(b.name) !== target) return b;
        const dims = {
          ...b,
          width: typeof upd.width === 'number' ? clamp(upd.width, 10, 500) : b.width,
          depth: typeof upd.depth === 'number' ? clamp(upd.depth, 10, 200) : b.depth,
        };
        return upd.pieces ? { ...dims, pieces: applyPieceOps(dims.pieces, upd.pieces) } : dims;
      });
    }
  }

  return next;
}

function applyPieceOps(pieces: Piece[], ops: AIPatchBodyPieces): Piece[] {
  let next = pieces.slice();

  if (ops.remove?.length) {
    const drop = new Set(ops.remove.map(normalizeName));
    next = next.filter(p => !drop.has(normalizeName(p.name)));
  }

  if (ops.update?.length) {
    for (const u of ops.update) {
      const target = normalizeName(u.match);
      let updated = false;
      next = next.map(p => {
        if (updated || normalizeName(p.name) !== target) return p;
        updated = true;
        const out: Piece = { ...p };
        if (typeof u.name === 'string') out.name = u.name;
        if (u.type && VALID_PIECE_TYPES.includes(u.type)) out.type = u.type;
        if (typeof u.length === 'number') out.length = clamp(u.length, 1, 500);
        if (typeof u.width === 'number') out.width = clamp(u.width, 1, 500);
        if (typeof u.qty === 'number') out.qty = clamp(Math.round(u.qty), 1, 100);
        if (typeof u.thickness === 'number') {
          const v = clamp(u.thickness, 0.1, 5);
          out.thickness = v;
        }
        return out;
      });
    }
  }

  if (ops.add?.length) {
    for (const a of ops.add) {
      if (!a.name || typeof a.length !== 'number' || typeof a.width !== 'number') continue;
      if (!a.type || !VALID_PIECE_TYPES.includes(a.type)) continue;
      const piece: Piece = {
        id: uid(),
        name: a.name,
        type: a.type,
        length: clamp(a.length, 1, 500),
        width: clamp(a.width, 1, 500),
        qty: typeof a.qty === 'number' ? clamp(Math.round(a.qty), 1, 100) : 1,
      };
      if (typeof a.thickness === 'number') piece.thickness = clamp(a.thickness, 0.1, 5);
      next.push(piece);
    }
  }

  return next;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Snippet to add to the system prompt so the IA knows about the patch format */
export const PATCH_INSTRUCTIONS = `
Si l'utilisateur te demande d'ajuster des paramètres concrets du projet (dimensions, matériau, épaisseur, ajout/suppression/modification de pièces...), tu PEUX inclure UN bloc structuré à la fin de ta réponse :

\`\`\`apply
{
  "title": "Description courte",
  "project": { "wallWidth": 280, "wallDepth": 35, "ceilingHeight": 240 },
  "panel": { "thickness": 1.9 },
  "material": "cp_bouleau",
  "bodies": {
    "count": 3,
    "all": { "depth": 35 },
    "byName": [
      {
        "name": "Corps 1",
        "width": 100,
        "pieces": {
          "add":    [{ "name": "Tablette fixe 38×25", "type": "tablette-fixe", "length": 38, "width": 25, "qty": 2, "thickness": 1.9 }],
          "remove": ["Ancien fond 76.4×25"],
          "update": [{ "match": "Joue gauche", "length": 240, "qty": 1 }]
        }
      }
    ]
  }
}
\`\`\`

Règles strictes :
- N'inclus QUE les champs que tu veux modifier (les autres restent inchangés).
- Toutes les dimensions sont en cm. Pour l'épaisseur : 1.9 = 19 mm.
- Matériaux valides : cp_bouleau, cp_peuplier, cp_okoume, mdf, melamine, osb.
- Types de pièce valides (exactement, accent compris) : "joue", "tablette-fixe", "tablette-reglable", "separateur", "bandeau", "porte", "tiroir-facade", "fond", "autre". Ne jamais inventer de type (pas de "separation", "etagere", "shelf"…).
- bodies.byName[].name doit correspondre au nom EXACT d'un corps existant.
- pieces.add : crée une nouvelle pièce. length et width obligatoires, qty défaut 1, thickness optionnelle.
- pieces.remove : tableau de noms — supprime TOUTES les pièces dont le nom correspond (insensible à la casse).
- pieces.update : modifie la PREMIÈRE pièce dont le nom correspond à "match". Tous les autres champs sont optionnels.
- bodies.count : restructure le projet en N corps de largeur égale (redistribution approx. des pièces).
- Inclus le bloc UNIQUEMENT si l'utilisateur demande explicitement un changement. Pour une simple question, n'en mets pas.
- Le bloc ne remplace pas ton explication : commente d'abord, puis propose le patch.
`.trim();
