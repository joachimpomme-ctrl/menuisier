export type PieceType = 'joue' | 'tablette-fixe' | 'tablette-reglable' | 'bandeau' | 'autre';

export type MaterialKey = 'cp_bouleau' | 'cp_peuplier' | 'cp_okoume' | 'mdf' | 'melamine' | 'osb';

export interface PanelSize {
  w: number;
  h: number;
}

export interface Material {
  name: string;
  short: string;
  density: number;
  flexMPa: number;
  thicknesses: number[];
  defaultThickness: number;
  panels: PanelSize[];
  maxSpan18: number;
  screwHolding: string;
  dowels: boolean;
  edgeBanding: boolean;
  edgeFinish: string;
  assembly: string[];
  routing: string;
  finish: string[];
  warnings: string[];
  notes: string;
}

export interface Piece {
  id: string;
  name: string;
  length: number;
  width: number;
  qty: number;
  type: PieceType;
}

export interface Body {
  id: string;
  name: string;
  width: number;
  depth: number;
  pieces: Piece[];
}

export interface Project {
  name: string;
  wallWidth: number;
  ceilingHeight: number;
  plinthHeight: number;
  plinthDepth: number;
}

export interface Panel {
  width: number;
  height: number;
  thickness: number;
}

export interface AppState {
  materialKey: MaterialKey;
  project: Project;
  panel: Panel;
  kerf: number;
  bodies: Body[];
}

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

export interface Step {
  title: string;
  items: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UploadedPdf {
  name: string;
  data: string;
}

export interface PackedPiece extends Piece {
  uid: string;
  bodyName: string;
  bodyId: string;
  x: number;
  y: number;
  pw: number;
  ph: number;
  rotated: boolean;
}

export interface PackingBin {
  shelves: { y: number; h: number; rem: number }[];
  pl: PackedPiece[];
}

export type TabKey = 'structure' | 'debit' | 'montage' | 'notice' | 'validation' | 'ia';

// For pieces with body context (used in allPieces computed)
export interface PieceWithBody extends Piece {
  bodyName: string;
  bodyId: string;
}

// Storage format version for future migrations
export interface StoredProject {
  version: 1;
  state: AppState;
  savedAt: string;
}
