/**
 * MENUISIER — Terminal Métier — Design Tokens
 *
 * Source unique de vérité pour toute l'interface.
 * Les mêmes valeurs sont reflétées dans `src/index.css` sous forme de
 * variables CSS (--token-name). Toute nouvelle règle de style DOIT
 * utiliser ces tokens, jamais de valeur littérale codée en dur.
 *
 * Règles absolues :
 *   - 1 couleur d'accent : ambre technique.
 *   - 0 ombre (shadow: none).
 *   - Border radius maximum : 4px (2px par défaut).
 *   - Bordures fines 1px uniquement comme séparateurs.
 *   - Aucun gradient, aucun emoji décoratif.
 *   - Densité utile > espace décoratif.
 */

// ---------------------------------------------------------------------------
// Couleurs — palette restreinte
// ---------------------------------------------------------------------------

export const color = {
  /** Fond principal de l'application, légèrement cassé pour éviter le blanc pur clinique */
  canvas:        '#f6f6f4',
  /** Panneaux de contenu (tables, formulaires, inspecteurs) */
  panel:         '#ffffff',
  /** Strips alternées dans les tableaux + états hover discrets */
  panelAlt:      '#fbfbf9',
  /** Ruban de header, bandeau de titre de panel */
  overlay:       '#1d1d1b',
  overlayFg:     '#e8e6e1',

  /** Bordure noire technique pour les cadres forts */
  border:        '#1d1d1b',
  /** Bordure gris chaud pour séparateurs secondaires */
  borderWeak:    '#d4d1cb',
  /** Filet interne ultra fin */
  borderHairline:'#e5e2dc',

  fg:            '#141413',
  fgMuted:       '#6a6763',
  fgSubtle:      '#8e8a85',

  /** UNIQUE couleur d'accent — ambre technique, ni amber tailwind, ni orange SaaS */
  accent:        '#a66400',
  accentInk:     '#ffffff',
  accentBg:      '#f5e9d6',

  alert:         '#a2231d',
  alertBg:       '#f5d9d8',
} as const;

// ---------------------------------------------------------------------------
// Statuts procurement — pattern critique métier
// ---------------------------------------------------------------------------

export const procurementColor = {
  buy_exact:      { fg: '#2d5a3d', bg: '#e4eee6' },
  buy_and_rework: { fg: '#8a5a00', bg: '#f4e9d1' },
  cut_from_sheet: { fg: '#333c4d', bg: '#dfe3ea' },
} as const;

export const procurementLabel = {
  buy_exact:      'ACHAT',
  buy_and_rework: 'ACHAT+RETOUCHE',
  cut_from_sheet: 'DÉBIT',
} as const;

export type ProcurementStatus = keyof typeof procurementColor;

// ---------------------------------------------------------------------------
// Spacing — pas de 2px, utile uniquement
// ---------------------------------------------------------------------------

export const spacing = {
  '0':   '0px',
  'px':  '1px',
  '0.5': '2px',
  '1':   '4px',
  '1.5': '6px',
  '2':   '8px',
  '2.5': '10px',
  '3':   '12px',
  '4':   '16px',
  '5':   '20px',
  '6':   '24px',
  '8':   '32px',
} as const;

// ---------------------------------------------------------------------------
// Border & radius — maximum 4px, radius par défaut 2px
// ---------------------------------------------------------------------------

export const radius = {
  none: '0px',
  sm:   '2px',
  md:   '3px',
  lg:   '4px',
} as const;

export const border = {
  width: {
    hairline: '1px',
    regular:  '1px',
    emphasis: '2px',
  },
} as const;

// ---------------------------------------------------------------------------
// Typographie
// ---------------------------------------------------------------------------

export const font = {
  family: {
    sans: '"Inter", ui-sans-serif, system-ui, -apple-system, "Helvetica Neue", sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
  },
  size: {
    /** 9.5px — labels de metric, micro-tags */
    micro:   '9.5px',
    /** 10.5px — headers de panel, section titles */
    overline:'10.5px',
    /** 11px — données en mono dans tableaux denses */
    xs:      '11px',
    /** 12px — corps de texte technique */
    sm:      '12px',
    /** 13px — corps par défaut */
    base:    '13px',
    /** 14px — valeurs de metric importantes */
    md:      '14px',
    /** 16px — titres d'écran uniquement */
    lg:      '16px',
  },
  weight: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
  },
  tracking: {
    tight:  '0',
    overline: '0.08em',
    mono:   '0',
  },
  features: {
    /** tabular-nums actif partout pour aligner les colonnes numériques */
    default: '"tnum" 1, "ss01" 1',
  },
} as const;

// ---------------------------------------------------------------------------
// Durées d'animation — volontairement courtes et discrètes
// ---------------------------------------------------------------------------

export const motion = {
  /** Hover/focus — change de couleur, pas d'animation visible */
  fast:   '80ms',
  /** Transitions de layout */
  normal: '150ms',
} as const;

// ---------------------------------------------------------------------------
// Dimensions standards — cohérence densité
// ---------------------------------------------------------------------------

export const size = {
  /** Hauteur standard des boutons et inputs */
  control:      '26px',
  /** Hauteur des lignes de tableau dense */
  row:          '24px',
  /** Hauteur du header de panel */
  panelHead:    '28px',
  /** Hauteur du ruban de header application */
  ribbon:       '40px',
  /** Touch targets mobiles (WCAG) — appliqué via media query */
  controlCoarse:'36px',
} as const;

// ---------------------------------------------------------------------------
// Export agrégé — usage dans tests et outillage
// ---------------------------------------------------------------------------

export const tokens = {
  color,
  procurementColor,
  procurementLabel,
  spacing,
  radius,
  border,
  font,
  motion,
  size,
} as const;

export type Tokens = typeof tokens;
