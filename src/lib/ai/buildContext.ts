import type { AppState } from '../../types';
import type { ProjectAnalysis } from '../projectAnalysis';
import { MATERIALS } from '../../data/materials';
import { buildFullKnowledgeSummary } from '../../data/knowledge';
import { getTransversalRules } from '../knowledge';
import { PATCH_INSTRUCTIONS } from './aiPatch';

export interface AIContext {
  systemPrompt: string;
  projectSummary: string;
  estimatedTokens: number;
}

/**
 * Build structured context for the AI assistant.
 * Uses ProjectAnalysis for accurate multi-panel data.
 * Kept deliberately short — user knowledge is appended by AssistantTab only when relevant.
 */
export function buildAIContext(state: AppState, analysis: ProjectAnalysis): AIContext {
  const mat = MATERIALS[state.materialKey];

  // Build project summary with multi-panel data
  const panelSummary = analysis.panels.map(p =>
    `  - ${p.panelDef.label}: ${p.panelDef.width}\u00d7${p.panelDef.height}cm \u00e9p.${p.panelDef.thickness * 10}mm \u2014 ${p.panelCount} panneau(x), ${p.pieces.length} pi\u00e8ces, ${p.efficiency.toFixed(0)}%`
  ).join('\n');

  // Summarize pieces (grouped if > 20)
  let pieceSummary: string;
  if (analysis.totalPieces > 20) {
    pieceSummary = state.bodies.map(b => {
      const byType = new Map<string, number>();
      b.pieces.forEach(p => {
        byType.set(p.type, (byType.get(p.type) || 0) + p.qty);
      });
      const parts = [...byType.entries()].map(([t, c]) => `${c} ${t}`).join(', ');
      return `  ${b.name} (${b.width}\u00d7${b.depth}): ${parts}`;
    }).join('\n');
  } else {
    pieceSummary = state.bodies.map(b =>
      b.pieces.map(p => `  ${b.name} > ${p.name}: ${p.length}\u00d7${p.width}cm \u00d7${p.qty} [${p.type}]`).join('\n')
    ).join('\n');
  }

  const projectSummary = [
    `Projet: ${state.project.name}`,
    `Mat\u00e9riau: ${mat.name} (${mat.short}), \u00e9p. ${state.panel.thickness * 10}mm`,
    `Espace: ${state.project.wallWidth}\u00d7${state.project.wallDepth ?? '?'}\u00d7${state.project.ceilingHeight}cm, plinthe ${state.project.plinthHeight}cm`,
    `${state.bodies.length} corps, ${analysis.totalPieces} pi\u00e8ces, ${analysis.totalCost.toFixed(0)}\u20ac, ~${analysis.weightKg.toFixed(0)}kg`,
    `Panneaux:`,
    panelSummary,
    `Pi\u00e8ces:`,
    pieceSummary,
  ].join('\n');

  const transversalRules = getTransversalRules();
  const transversalRulesSummary = transversalRules.length > 0
    ? [
        '## Règles transversales actives',
        ...transversalRules.map((rule) =>
          `- ${rule.id} : ${rule.regle} → sévérité ${rule.severite}`
        ),
      ].join('\n')
    : '';
  const knowledge = [
    buildFullKnowledgeSummary(),
    transversalRulesSummary,
  ].filter(Boolean).join('\n\n');

  const systemPrompt = `Tu es un menuisier expert assistant un DIYiste exp\u00e9riment\u00e9 qui con\u00e7oit des meubles sur mesure dans un atelier amateur (scie circulaire, d\u00e9fonceuse, perceuse-visseuse).

# Style de r\u00e9ponse

- Fran\u00e7ais uniquement, ton direct et concret.
- Concis par d\u00e9faut : phrases courtes, listes \u00e0 puces si > 3 points. Pas de baratin.
- Si l'utilisateur pose une question ferm\u00e9e, r\u00e9ponds court \u2014 sans introduction.
- Cite les cotes exactes quand pertinent, en cm (sauf \u00e9paisseurs en mm).

# Unit\u00e9s et conventions

- Toutes les dimensions de l'app sont en **cm** sauf l'\u00e9paisseur des panneaux qui est en **mm** (ex : panneau 18 mm = 1.8 cm en interne).
- Le syst\u00e8me 32 (per\u00e7age \u00d8 5 mm tous les 32 mm) est la r\u00e9f\u00e9rence pour \u00e9tag\u00e8res r\u00e9glables.
- Plinthe par d\u00e9faut 80-100 mm, profondeur de recul plinthe ~50-80 mm.
- Charni\u00e8res 35 mm cuvette \u00e0 100 mm des bords de porte.

# Ce que tu sais sur le projet et le moteur

- Le moteur V3 calcule automatiquement : layout, structure, g\u00e9om\u00e9trie des pi\u00e8ces, quincaillerie, validation (r\u00e8gles m\u00e9tier), production (notice 13 \u00e9tapes), procurement (panneaux + d\u00e9bit imbriqu\u00e9).
- Modules disponibles dans le catalogue : shelf_adjustable, drawer_stack, hanging_rod_short/long, shoe_rack_inclined, tv_niche, wine_rack, bench_storage.
- Types de pi\u00e8ce valides (exactement, accents compris) : joue, tablette-fixe, tablette-reglable, separateur, bandeau, porte, tiroir-facade, fond, autre.
- Mat\u00e9riaux valides : cp_bouleau, cp_peuplier, cp_okoume, mdf, melamine, osb.

# Ce que tu peux faire

- Expliquer un choix du moteur (pourquoi telle \u00e9paisseur, telle profondeur).
- Critiquer un projet sur ses faiblesses structurelles ou ergonomiques.
- Sugg\u00e9rer des modifications concr\u00e8tes via un bloc \`apply\` (voir format ci-dessous).
- Proposer un plan de montage, un ordre de d\u00e9bit, un calage des \u00e9tag\u00e8res.
- Calculer une fl\u00e8che, un porte-\u00e0-faux acceptable, une charge admissible.

# Ce que tu ne fais pas

- Ne jamais inventer un type de pi\u00e8ce ou un mat\u00e9riau hors liste.
- Ne pas donner d'avis sur des sujets hors menuiserie sauf demande explicite.
- Ne pas r\u00e9p\u00e9ter inutilement les donn\u00e9es du projet \u2014 elles sont d\u00e9j\u00e0 ci-dessous.

# Donn\u00e9es du projet en cours

${projectSummary}

${knowledge}

${PATCH_INSTRUCTIONS}`;

  const estimatedTokens = Math.ceil(systemPrompt.length / 4);

  return { systemPrompt, projectSummary, estimatedTokens };
}
