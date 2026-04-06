export type PieceType = 'joue' | 'tablette-fixe' | 'tablette-reglable' | 'separateur' | 'bandeau' | 'porte' | 'tiroir-facade' | 'fond' | 'autre';

export type MaterialKey = 'cp_bouleau' | 'cp_peuplier' | 'cp_okoume' | 'mdf' | 'melamine' | 'osb';

export interface PanelSize {
  w: number;
  h: number;
  defaultPrice: number; // EUR HT, prix indicatif par panneau
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

export interface PanelDef {
  id: string;
  label: string;
  width: number;    // cm
  height: number;   // cm
  thickness: number; // cm
  price: number;    // EUR HT par panneau
}

export interface Piece {
  id: string;
  name: string;
  length: number;
  width: number;
  qty: number;
  type: PieceType;
  panelId?: string; // undefined = panneau principal (state.panel)
  thickness?: number; // cm — override épaisseur panneau (ex. double joue). undefined = épaisseur du panneau assigné
}

export type DoorPoseType = 'enveloppante' | 'demi-recouvrement' | 'affleurante';

export type DoorPosition = 'bas' | 'haut';

export interface DoorConfig {
  count: 1 | 2;
  poseType: DoorPoseType;
  position?: DoorPosition; // défaut: 'bas'
}

export interface Body {
  id: string;
  name: string;
  width: number;
  depth: number;
  pieces: Piece[];
  doorConfig?: DoorConfig;
}

export interface Project {
  name: string;
  wallWidth: number;
  wallDepth: number;     // profondeur disponible (cm) — contrainte max pour les corps
  ceilingHeight: number;
  plinthHeight: number;
  plinthDepth: number;
}

export interface Panel {
  width: number;
  height: number;
  thickness: number;
}

export interface CostConfig {
  panelPrice: number; // EUR par panneau, 0 = non renseigné
}

export interface AppState {
  materialKey: MaterialKey;
  project: Project;
  panel: Panel;
  kerf: number;
  bodies: Body[];
  costConfig: CostConfig;
  sharedBoundaries?: boolean[];
  extraPanels?: PanelDef[]; // panneaux secondaires (fond 6mm, HDF 3mm, etc.)
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

export interface NestingMetrics {
  panelCount: number;
  usedArea: number;    // cm²
  totalArea: number;   // cm²
  wasteArea: number;   // cm²
  efficiency: number;  // 0-100
}

export interface NestingResult {
  bins: PackingBin[];
  unplaced: PieceWithBody[];
  metrics: NestingMetrics;
  strategy: string;
}

export type TabKey = 'structure' | 'plans' | 'debit' | 'montage' | 'notice' | 'validation' | 'ia';

export interface PieceWithBody extends Piece {
  bodyName: string;
  bodyId: string;
}

// Project management
export interface ProjectMeta {
  id: string;
  name: string;
  materialShort: string;
  bodyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredProject {
  version: 2;
  state: AppState;
  savedAt: string;
}

// Repository abstraction — prépare l'auth future (E)
// Aujourd'hui : LocalProjectRepository (localStorage)
// Demain : RemoteProjectRepository (API + auth) même interface
export interface ProjectRepository {
  list(): ProjectMeta[];
  load(id: string): AppState | null;
  save(id: string, state: AppState): void;
  delete(id: string): void;
  duplicate(id: string, newName: string): string | null;
  getCurrentId(): string | null;
  setCurrentId(id: string | null): void;
}
