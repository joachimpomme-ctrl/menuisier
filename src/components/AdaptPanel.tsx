import { useState } from 'react';
import type { AppState } from '../types';
import { MATERIALS } from '../data/materials';
import { analyzeProject } from '../lib/projectAnalysis';
import { extractPatches, applyPatch } from '../lib/ai/aiPatch';

interface Props {
  state: AppState;
  onApplyState?: (next: AppState) => void;
}

function buildAdaptSystemPrompt(state: AppState): string {
  const mat = MATERIALS[state.materialKey];
  const analysis = analyzeProject(state);

  const projectSummary = [
    `Projet: ${state.project.name}`,
    `Matériau: ${mat.name} (${mat.short}), ép. ${state.panel.thickness * 10}mm`,
    `Espace: ${state.project.wallWidth}×${state.project.wallDepth ?? '?'}×${state.project.ceilingHeight}cm`,
    `${state.bodies.length} corps, ${analysis.totalPieces} pièces, ${analysis.totalCost.toFixed(0)}€, ~${analysis.weightKg.toFixed(0)}kg`,
    state.bodies.map(b => `  ${b.name}: L${b.width}×P${b.depth}cm, ${b.pieces.length} pièces`).join('\n'),
  ].join('\n');

  return `Tu es un assistant menuiserie en mode "adaptation automatique".

Projet actuel:
${projectSummary}

L'utilisateur va te donner une description de modifications à apporter au projet.
Ton rôle : interpréter ces instructions et générer UN seul bloc \`\`\`apply\`\`\` avec TOUS les changements applicables.

Format du bloc apply (inclus uniquement les champs à modifier) :
\`\`\`apply
{
  "title": "Résumé court des changements",
  "project": { "wallWidth": 249, "wallDepth": 25.8, "ceilingHeight": 250, "plinthHeight": 8, "plinthDepth": 6 },
  "panel": { "thickness": 1.9 },
  "material": "cp_bouleau | cp_peuplier | cp_okoume | mdf | melamine | osb",
  "bodies": {
    "count": 3,
    "all": { "depth": 25.8 },
    "byName": [{"name": "Corps 1", "width": 83}]
  }
}
\`\`\`

Règles :
- Dimensions en cm (ex: 1.9 = 19 mm pour l'épaisseur, 249 = 249 cm pour la largeur)
- bodies.count : restructure en N corps de largeur égale — utilise uniquement si le nombre de corps change
- byName : utilise les noms exacts des corps existants (${state.bodies.map(b => `"${b.name}"`).join(', ')})
- N'applique que ce qui est explicitement demandé ou clairement déductible
- Génère UNE ligne d'explication courte AVANT le bloc, puis le bloc apply
- Si une instruction est impossible à modéliser (ex: renfort structurel, type d'assemblage), mentionne-le brièvement APRÈS le bloc`.trim();
}

export default function AdaptPanel({ state, onApplyState }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ explanation: string; summary: string[]; countChanged: boolean } | null>(null);

  const handleSubmit = async () => {
    if (!description.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildAdaptSystemPrompt(state),
          messages: [{ role: 'user', content: description.trim() }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);

      const reply: string = data.reply;
      const patches = extractPatches(reply);

      if (patches.length === 0) {
        setError('Aucun changement détecté dans la réponse. Reformule ta description.');
        setLoading(false);
        return;
      }

      const patch = patches[0];
      const countChanged = patch.patch.bodies?.count != null && patch.patch.bodies.count !== state.bodies.length;

      // Strip the apply block to get just the explanation
      const explanation = reply.replace(/```apply[\s\S]*?```/g, '').trim().split('\n')[0] ?? '';

      setResult({ explanation, summary: patch.summary, countChanged });

      // Auto-apply the patch
      if (onApplyState) {
        onApplyState(applyPatch(state, patch.patch));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="rounded-lg border border-[#c8b89a] bg-[#fdf8f2] mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#6b4c2a] hover:bg-[#f5ede0] transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">✦</span>
          Adapter le projet par description
        </span>
        <span className="text-[#9d9089] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4">
          <p className="text-xs text-[#9d9089] mb-2">
            Décris les changements souhaités — dimensions, nombre de corps, matériau… L'IA interprète et applique automatiquement.
          </p>

          <textarea
            value={description}
            onChange={e => { setDescription(e.target.value); setResult(null); setError(null); }}
            onKeyDown={handleKeyDown}
            placeholder={"Exemple :\nDimensions : 249×25.8×250 cm\n3 corps au lieu de 5\nMélaminé 18 mm"}
            rows={5}
            className="w-full rounded-lg border border-[#e0d8ce] bg-white px-3 py-2.5 text-sm text-[#1c1714] placeholder-[#c4b8ac] focus:border-[#6b4c2a] focus:outline-none resize-y transition-colors font-mono"
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-[#b8a898]">Ctrl+Entrée pour envoyer</span>
            <button
              onClick={handleSubmit}
              disabled={loading || !description.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-[#6b4c2a] px-4 py-2 text-sm font-medium text-white hover:bg-[#5a3f24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyse…
                </>
              ) : (
                'Adapter'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-3 rounded-lg border border-[#b8d4a0] bg-[#f3faf0] px-3 py-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <p className="text-sm text-[#2d5a1a] font-medium">{result.explanation || 'Changements appliqués'}</p>
              </div>
              {result.summary.length > 0 && (
                <ul className="text-xs text-[#4a7a30] space-y-0.5 ml-6">
                  {result.summary.map((line, i) => (
                    <li key={i}>• {line}</li>
                  ))}
                </ul>
              )}
              {result.countChanged && (
                <p className="mt-2 ml-6 text-xs text-[#8a6020] bg-[#fef9ec] border border-[#e8d87a] rounded px-2 py-1">
                  ⚠ Restructuration en {state.bodies.length} corps appliquée approximativement — vérifie les dimensions des pièces dans l'onglet Structure.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
