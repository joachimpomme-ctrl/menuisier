import type { AppState } from '../../types';
import type { ProjectAnalysis } from '../projectAnalysis';
import { MATERIALS } from '../../data/materials';
import { buildKnowledgeSummary } from '../../data/knowledge';

export interface AIContext {
  systemPrompt: string;
  projectSummary: string;
  estimatedTokens: number;
}

/**
 * Build structured context for the AI assistant.
 * Uses ProjectAnalysis for accurate multi-panel data.
 */
export function buildAIContext(state: AppState, analysis: ProjectAnalysis): AIContext {
  const mat = MATERIALS[state.materialKey];

  // Build project summary with multi-panel data
  const panelSummary = analysis.panels.map(p =>
    `  - ${p.panelDef.label}: ${p.panelDef.width}\u00d7${p.panelDef.height}cm \u00e9p.${p.panelDef.thickness * 10}mm \u2014 ${p.panelCount} panneau(x), ${p.pieces.length} pi\u00e8ces, ${p.efficiency.toFixed(0)}% efficacit\u00e9`
  ).join('\n');

  // Summarize pieces (grouped if > 20)
  let pieceSummary: string;
  if (analysis.totalPieces > 20) {
    // Group by body then type
    pieceSummary = state.bodies.map(b => {
      const byType = new Map<string, { count: number; dims: string[] }>();
      b.pieces.forEach(p => {
        const key = p.type;
        if (!byType.has(key)) byType.set(key, { count: 0, dims: [] });
        const entry = byType.get(key)!;
        entry.count += p.qty;
        entry.dims.push(`${p.length}\u00d7${p.width}`);
      });
      const parts = [...byType.entries()].map(([t, v]) => `${v.count} ${t}`).join(', ');
      return `  ${b.name} (${b.width}\u00d7${b.depth}cm): ${parts}`;
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
    `Corps: ${state.bodies.length}, Pi\u00e8ces: ${analysis.totalPieces}`,
    `Panneaux:`,
    panelSummary,
    `Co\u00fbt total: ${analysis.totalCost.toFixed(0)}\u20ac, Poids: ~${analysis.weightKg.toFixed(0)}kg`,
    `Pi\u00e8ces:`,
    pieceSummary,
  ].join('\n');

  const knowledge = buildKnowledgeSummary();

  const systemPrompt = `Tu es un menuisier expert. Tu aides \u00e0 concevoir et r\u00e9aliser des meubles sur mesure en panneaux.
R\u00e9ponds en fran\u00e7ais. Sois concis et pratique.
Voici le projet en cours:

${projectSummary}

Base de connaissances:
${knowledge}`;

  const estimatedTokens = Math.ceil(systemPrompt.length / 4);

  return { systemPrompt, projectSummary, estimatedTokens };
}
