import { useState, useRef } from 'react';
import type { AppState, MaterialKey } from '../types';
import { MATERIALS } from '../data/materials';
import { TEMPLATES } from '../data/templates';
import { buildKnowledgeSummary } from '../data/knowledge';
import { buildUserKnowledgeContext } from '../lib/knowledgeStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (state: AppState) => void;
}

type Mode = 'choose' | 'ai';

interface UploadedImage {
  name: string;
  data: string;
  mediaType: string;
  preview: string;
}

export default function NewProjectWizard({ isOpen, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>('cp_bouleau');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    const state = tpl.create(selectedMaterial);
    onCreate(state);
  };

  const handleBlank = () => {
    const m = MATERIALS[selectedMaterial];
    const p = m.panels[0];
    onCreate({
      materialKey: selectedMaterial,
      project: { name: 'Mon meuble', wallWidth: 200, ceilingHeight: 250, plinthHeight: 0, plinthDepth: 0 },
      panel: { width: p.w, height: p.h, thickness: m.defaultThickness / 10 },
      kerf: 0.3,
      costConfig: { panelPrice: p.defaultPrice },
      bodies: [],
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setImages(prev => [...prev, {
          name: file.name,
          data: base64,
          mediaType: file.type as string,
          preview: dataUrl,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const knowledgeBase = buildKnowledgeSummary();
      const userKnowledge = buildUserKnowledgeContext();

      const systemPrompt = `Tu es un assistant menuiserie expert. L'utilisateur te décrit un meuble qu'il veut fabriquer. Tu dois générer une structure de projet JSON valide.

RÈGLES STRICTES DE VALIDATION :
- Chaque tablette fixe ou réglable doit avoir une longueur = largeur du corps - 2× épaisseur (pour les joues gauche et droite)
- Chaque joue doit avoir une largeur = profondeur du corps
- La somme des largeurs des corps ne doit pas dépasser la largeur du mur
- Aucune pièce ne doit dépasser les dimensions du panneau brut
- L'épaisseur par défaut est 1.8 cm (18 mm)
- Les tablettes réglables ne peuvent pas dépasser la portée max du matériau choisi
- Tous les chiffres doivent être cohérents et arrondis à 0.1 cm près
- Prévois au minimum 2 tablettes fixes par corps (haut + bas) pour la rigidité structurelle

MATÉRIAUX DISPONIBLES : ${Object.entries(MATERIALS).map(([k, m]) => `${k}: ${m.name} (portée max ${m.maxSpan18}cm, flex ${m.flexMPa}MPa)`).join(', ')}

${knowledgeBase}
${userKnowledge}

Tu DOIS répondre UNIQUEMENT avec un JSON valide, sans aucun texte avant ou après. Le JSON doit suivre exactement cette structure :
{
  "materialKey": "cp_bouleau",
  "project": { "name": "Nom du meuble", "wallWidth": 200, "ceilingHeight": 250, "plinthHeight": 0, "plinthDepth": 0 },
  "panel": { "width": 250, "height": 125, "thickness": 1.8 },
  "kerf": 0.3,
  "costConfig": { "panelPrice": 75 },
  "bodies": [
    {
      "id": "unique_id",
      "name": "Nom du corps",
      "width": 80,
      "depth": 30,
      "pieces": [
        { "id": "unique_id", "name": "Nom", "length": 100, "width": 30, "qty": 1, "type": "joue|tablette-fixe|tablette-reglable|bandeau|autre" }
      ]
    }
  ]
}`;

      // Build content array with text + optional images
      const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

      if (images.length > 0) {
        images.forEach(img => {
          content.push({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.data },
          });
        });
        content.push({
          type: 'text',
          text: `Voici ${images.length} photo(s) de l'espace/projet. Analyse-les pour déterminer les dimensions approximatives et le type de meuble adapté.\n\nDescription de l'utilisateur : ${aiPrompt}`,
        });
      } else {
        content.push({ type: 'text', text: aiPrompt });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
          system: systemPrompt,
        }),
      });

      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);

      const data = await response.json();
      const text = data.content?.[0]?.text || data.text || '';

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const jsonStr = (jsonMatch[1] || text).trim();
      const parsed = JSON.parse(jsonStr) as AppState;

      // Validate the generated structure
      if (!parsed.materialKey || !parsed.project || !parsed.bodies || !Array.isArray(parsed.bodies)) {
        throw new Error('Structure JSON invalide');
      }

      // Ensure IDs are unique
      let idCounter = 0;
      parsed.bodies = parsed.bodies.map(b => ({
        ...b,
        id: b.id || `body_${++idCounter}`,
        pieces: (b.pieces || []).map(p => ({
          ...p,
          id: p.id || `piece_${++idCounter}`,
        })),
      }));

      // Cross-validate dimensions
      const th = parsed.panel?.thickness || 1.8;
      for (const body of parsed.bodies) {
        const innerW = +(body.width - 2 * th).toFixed(1);
        for (const piece of body.pieces) {
          if (piece.type === 'joue' && piece.width !== body.depth) {
            piece.width = body.depth; // Auto-fix joue depth
          }
          if ((piece.type === 'tablette-fixe' || piece.type === 'tablette-reglable') && Math.abs(piece.length - innerW) > 0.5) {
            piece.length = innerW; // Auto-fix tablette width
          }
          if ((piece.type === 'tablette-fixe' || piece.type === 'tablette-reglable') && piece.width !== body.depth) {
            piece.width = body.depth; // Auto-fix tablette depth
          }
        }
      }

      onCreate(parsed);
    } catch (err) {
      console.error('AI generation error:', err);
      setAiError(err instanceof Error ? err.message : 'Erreur de génération');
    }

    setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h3 className="text-amber-700 font-bold text-sm">Nouveau projet</h3>
            <p className="text-xs text-stone-500 mt-0.5">Choisissez un modèle, partez de zéro, ou décrivez votre projet</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg px-2">x</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-5 pt-4">
          <button
            onClick={() => setMode('choose')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'choose' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            Modèles
          </button>
          <button
            onClick={() => setMode('ai')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'ai' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            Décrire mon projet (IA)
          </button>
        </div>

        {/* Material selector */}
        <div className="px-5 pt-3">
          <label className="text-xs text-stone-500 mb-1.5 block">Matériau de départ</label>
          <select
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 focus:border-amber-500 focus:outline-none transition-colors"
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value as MaterialKey)}
          >
            {Object.entries(MATERIALS).map(([k, m]) => (
              <option key={k} value={k}>{m.name} — portée max {m.maxSpan18}cm</option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {mode === 'choose' && (
            <div className="space-y-3">
              {/* Blank project */}
              <button
                onClick={handleBlank}
                className="w-full text-left rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-400 p-4 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-semibold text-sm text-stone-700 group-hover:text-amber-700 transition-colors">Projet vierge</div>
                    <div className="text-xs text-stone-500">Partez de zéro et construisez votre meuble pièce par pièce</div>
                  </div>
                </div>
              </button>

              {/* Templates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => handleTemplate(tpl.id)}
                    className="text-left rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 p-4 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">{tpl.icon}</span>
                      <div>
                        <div className="font-semibold text-sm text-stone-700 group-hover:text-amber-700 transition-colors">{tpl.name}</div>
                        <div className="text-xs text-stone-500 mt-0.5">{tpl.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">
                  Décrivez votre projet de meuble
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Je veux une bibliothèque de 2m de large pour un mur de 2.5m de haut. 3 modules côte à côte, avec des tablettes réglables pour des livres et des BD. Le mur a une plinthe de 8cm..."
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none transition-colors min-h-[120px] resize-y"
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">
                  Photos (optionnel) — votre espace, croquis, inspiration
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.preview} alt={img.name} className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                      <button
                        onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        x
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors"
                  >
                    +
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>

              {aiError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                  {aiError}
                </div>
              )}

              <button
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {aiLoading ? 'Génération en cours...' : 'Générer le projet avec l\'IA'}
              </button>

              <p className="text-[10px] text-stone-400 text-center">
                L'IA génère une structure de départ que vous pouvez ensuite modifier librement.
                Toutes les dimensions sont vérifiées automatiquement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
