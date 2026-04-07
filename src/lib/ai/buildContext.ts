import type { AppState } from '../../types';
import type { ProjectAnalysis } from '../projectAnalysis';
import { MATERIALS } from '../../data/materials';
import { buildKnowledgeSummary } from '../../data/knowledge';
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

  const knowledge = buildKnowledgeSummary();

  const systemPrompt = `Tu es un menuisier expert. R\u00e9ponds en fran\u00e7ais, concis et pratique.

${projectSummary}

${knowledge}

${PATCH_INSTRUCTIONS}`;

  const estimatedTokens = Math.ceil(systemPrompt.length / 4);

  return { systemPrompt, projectSummary, estimatedTokens };
}
