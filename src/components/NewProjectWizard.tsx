import { useState, useRef } from 'react';
import type { AppState, MaterialKey, Body } from '../types';
import { MATERIALS } from '../data/materials';
import { TEMPLATES } from '../data/templates';
import { buildKnowledgeSummary } from '../data/knowledge';
import { buildUserKnowledgeContext } from '../lib/knowledgeStore';
import { uid } from '../lib/helpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (state: AppState) => void;
}

type Mode = 'auto' | 'choose' | 'ai';

interface UploadedImage {
  name: string;
  data: string;
  mediaType: string;
  preview: string;
}

// Types de meubles pour l'auto-agencement
const FURNITURE_TYPES = [
  { id: 'bibliotheque', name: 'Bibliothèque', icon: '📚', defaultDepth: 28, shelfSpacing: 32, defaultMaterial: 'cp_bouleau' as MaterialKey },
  { id: 'etagere', name: 'Étagère', icon: '🪵', defaultDepth: 22, shelfSpacing: 35, defaultMaterial: 'cp_bouleau' as MaterialKey },
  { id: 'dressing', name: 'Dressing / Armoire', icon: '👔', defaultDepth: 55, shelfSpacing: 40, defaultMaterial: 'melamine' as MaterialKey },
  { id: 'placard', name: 'Placard', icon: '🚪', defaultDepth: 60, shelfSpacing: 35, defaultMaterial: 'melamine' as MaterialKey },
  { id: 'meuble_tv', name: 'Meuble TV', icon: '📺', defaultDepth: 45, shelfSpacing: 25, defaultMaterial: 'melamine' as MaterialKey },
  { id: 'buffet', name: 'Buffet / Bahut', icon: '🍽', defaultDepth: 40, shelfSpacing: 30, defaultMaterial: 'cp_bouleau' as MaterialKey },
  { id: 'bureau', name: 'Bureau', icon: '🖥', defaultDepth: 65, shelfSpacing: 30, defaultMaterial: 'cp_bouleau' as MaterialKey },
  { id: 'cuisine_bas', name: 'Cuisine (bas)', icon: '🍳', defaultDepth: 56, shelfSpacing: 30, defaultMaterial: 'melamine' as MaterialKey },
  { id: 'cuisine_haut', name: 'Cuisine (haut)', icon: '🍳', defaultDepth: 32, shelfSpacing: 28, defaultMaterial: 'melamine' as MaterialKey },
  { id: 'sdb', name: 'Salle de bain', icon: '🚿', defaultDepth: 45, shelfSpacing: 25, defaultMaterial: 'cp_okoume' as MaterialKey },
];

/**
 * Auto-dimensionne les corps pour remplir l'espace disponible
 */
function autoLayout(
  furnitureType: string,
  wallWidth: number,
  ceilingHeight: number,
  plinthHeight: number,
  plinthDepth: number,
  depth: number,
  mk: MaterialKey,
): { bodies: Body[]; name: string } {
  const mat = MATERIALS[mk];
  const th = mat.defaultThickness / 10;
  const maxSpan = mat.maxSpan18;
  const usableHeight = ceilingHeight - plinthHeight;
  const ft = FURNITURE_TYPES.find(f => f.id === furnitureType)!;

  // Déterminer la hauteur du meuble selon le type
  let meubleHeight = usableHeight;
  if (furnitureType === 'meuble_tv') meubleHeight = Math.min(50, usableHeight);
  else if (furnitureType === 'buffet') meubleHeight = Math.min(90, usableHeight);
  else if (furnitureType === 'bureau') meubleHeight = Math.min(75, usableHeight);
  else if (furnitureType === 'cuisine_bas') meubleHeight = Math.min(72, usableHeight);
  else if (furnitureType === 'cuisine_haut') meubleHeight = Math.min(72, usableHeight);
  else if (furnitureType === 'sdb') meubleHeight = Math.min(65, usableHeight);

  // Largeur max d'un corps = portée max du matériau + 2× épaisseur joues
  // (la tablette doit être ≤ maxSpan)
  const maxBodyWidth = maxSpan + 2 * th;

  // Calculer le nombre de corps nécessaires
  const nbCorps = Math.max(1, Math.ceil(wallWidth / maxBodyWidth));

  // Répartir la largeur équitablement
  const bodyWidth = +(wallWidth / nbCorps).toFixed(1);
  const innerWidth = +(bodyWidth - 2 * th).toFixed(1);

  // Nombre de tablettes réglables selon la hauteur et l'espacement
  const nbShelves = Math.max(0, Math.floor((meubleHeight - 10) / ft.shelfSpacing) - 2);

  const bodies: Body[] = [];
  for (let i = 0; i < nbCorps; i++) {
    const name = nbCorps === 1 ? 'Corps' : `Corps ${i + 1}`;
    const pieces = [
      { id: uid(), name: `Joue gauche`, length: +meubleHeight.toFixed(1), width: depth, qty: 1, type: 'joue' as const },
      { id: uid(), name: `Joue droite`, length: +meubleHeight.toFixed(1), width: depth, qty: 1, type: 'joue' as const },
      { id: uid(), name: `Tablette fixe haut`, length: innerWidth, width: depth, qty: 1, type: 'tablette-fixe' as const },
      { id: uid(), name: `Tablette fixe bas`, length: innerWidth, width: depth, qty: 1, type: 'tablette-fixe' as const },
    ];

    if (nbShelves > 0) {
      pieces.push({
        id: uid(), name: `Tablette réglable`, length: innerWidth, width: depth, qty: nbShelves, type: 'tablette-reglable' as const,
      });
    }

    // Bandeau si meuble va au plafond
    if (meubleHeight >= usableHeight - 5 && plinthHeight > 0) {
      pieces.push({
        id: uid(), name: `Bandeau haut`, length: bodyWidth, width: 8, qty: 1, type: 'bandeau' as const,
      });
    }

    bodies.push({
      id: uid(),
      name,
      width: bodyWidth,
      depth,
      pieces,
    });
  }

  const ftName = FURNITURE_TYPES.find(f => f.id === furnitureType)?.name || 'Meuble';
  return { bodies, name: `${ftName} ${wallWidth}×${meubleHeight} cm` };
}

export default function NewProjectWizard({ isOpen, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<Mode>('auto');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialKey>('cp_bouleau');

  // Auto mode state
  const [autoType, setAutoType] = useState('bibliotheque');
  const [autoWallW, setAutoWallW] = useState(200);
  const [autoCeilH, setAutoCeilH] = useState(250);
  const [autoPlinthH, setAutoPlinthH] = useState(8);
  const [autoPlinthD, setAutoPlinthD] = useState(2);
  const [autoDepth, setAutoDepth] = useState(28);

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Update depth when furniture type changes
  const handleTypeChange = (typeId: string) => {
    setAutoType(typeId);
    const ft = FURNITURE_TYPES.find(f => f.id === typeId);
    if (ft) {
      setAutoDepth(ft.defaultDepth);
      setSelectedMaterial(ft.defaultMaterial);
    }
  };

  // Preview auto layout
  const autoPreview = autoLayout(autoType, autoWallW, autoCeilH, autoPlinthH, autoPlinthD, autoDepth, selectedMaterial);
  const mat = MATERIALS[selectedMaterial];
  const th = mat.defaultThickness / 10;
  const autoTotalPieces = autoPreview.bodies.reduce((s, b) => s + b.pieces.reduce((s2, p) => s2 + p.qty, 0), 0);

  const handleAutoCreate = () => {
    const m = MATERIALS[selectedMaterial];
    const p = m.panels[0];
    onCreate({
      materialKey: selectedMaterial,
      project: {
        name: autoPreview.name,
        wallWidth: autoWallW,
        ceilingHeight: autoCeilH,
        plinthHeight: autoPlinthH,
        plinthDepth: autoPlinthD,
      },
      panel: { width: p.w, height: p.h, thickness: th },
      kerf: 0.3,
      costConfig: { panelPrice: p.defaultPrice },
      bodies: autoPreview.bodies,
    });
  };

  const handleTemplate = (templateId: string) => {
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;
    onCreate(tpl.create(selectedMaterial));
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
        setImages(prev => [...prev, { name: file.name, data: base64, mediaType: file.type as string, preview: dataUrl }]);
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
        { "id": "unique_id", "name": "Nom", "length": 100, "width": 30, "qty": 1, "type": "joue|tablette-fixe|tablette-reglable|bandeau|porte|tiroir-facade|fond|autre" }
      ]
    }
  ]
}`;

      const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];
      if (images.length > 0) {
        images.forEach(img => {
          content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });
        });
        content.push({ type: 'text', text: `Voici ${images.length} photo(s) de l'espace/projet. Analyse-les pour déterminer les dimensions approximatives.\n\nDescription : ${aiPrompt}` });
      } else {
        content.push({ type: 'text', text: aiPrompt });
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content }], system: systemPrompt }),
      });

      if (!response.ok) throw new Error(`Erreur serveur: ${response.status}`);
      const data = await response.json();
      const text = data.content?.[0]?.text || data.text || '';
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
      const jsonStr = (jsonMatch[1] || text).trim();
      const parsed = JSON.parse(jsonStr) as AppState;

      if (!parsed.materialKey || !parsed.project || !parsed.bodies || !Array.isArray(parsed.bodies)) {
        throw new Error('Structure JSON invalide');
      }

      let idCounter = 0;
      parsed.bodies = parsed.bodies.map(b => ({
        ...b, id: b.id || `body_${++idCounter}`,
        pieces: (b.pieces || []).map(p => ({ ...p, id: p.id || `piece_${++idCounter}` })),
      }));

      const pth = parsed.panel?.thickness || 1.8;
      for (const body of parsed.bodies) {
        const innerW = +(body.width - 2 * pth).toFixed(1);
        for (const piece of body.pieces) {
          if (piece.type === 'joue' && piece.width !== body.depth) piece.width = body.depth;
          if ((piece.type === 'tablette-fixe' || piece.type === 'tablette-reglable') && Math.abs(piece.length - innerW) > 0.5) piece.length = innerW;
          if ((piece.type === 'tablette-fixe' || piece.type === 'tablette-reglable') && piece.width !== body.depth) piece.width = body.depth;
        }
      }

      onCreate(parsed);
    } catch (err) {
      console.error('AI generation error:', err);
      setAiError(err instanceof Error ? err.message : 'Erreur de génération');
    }
    setAiLoading(false);
  };

  const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-500 focus:outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h3 className="text-amber-700 font-bold text-sm">Nouveau projet</h3>
            <p className="text-xs text-stone-500 mt-0.5">Entrez vos dimensions, choisissez un modèle, ou décrivez votre projet</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg px-2">x</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-5 pt-4 overflow-x-auto hide-scrollbar">
          {([
            { key: 'auto' as Mode, label: 'Mes dimensions', shortLabel: 'Dimensions' },
            { key: 'choose' as Mode, label: 'Modèles', shortLabel: 'Modèles' },
            { key: 'ai' as Mode, label: 'Description IA', shortLabel: 'IA' },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setMode(tab.key)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                mode === tab.key ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ===== AUTO MODE ===== */}
          {mode === 'auto' && (
            <div className="space-y-4">
              {/* Furniture type selector */}
              <div>
                <label className="text-xs font-medium text-stone-500 mb-2 block">Type de meuble</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FURNITURE_TYPES.map(ft => (
                    <button key={ft.id} onClick={() => handleTypeChange(ft.id)}
                      className={`text-left rounded-lg p-2.5 text-xs transition-all ${
                        autoType === ft.id
                          ? 'bg-amber-50 border-2 border-amber-400 text-amber-800 font-semibold'
                          : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
                      }`}>
                      <span className="mr-1">{ft.icon}</span> {ft.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Space dimensions */}
              <div>
                <label className="text-xs font-medium text-stone-500 mb-2 block">Dimensions de l'espace</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-stone-400 mb-1 block">Largeur dispo (cm)</label>
                    <input type="number" min={20} max={1000} step={0.1} value={autoWallW}
                      onChange={e => setAutoWallW(parseFloat(e.target.value) || 200)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-400 mb-1 block">Hauteur plafond (cm)</label>
                    <input type="number" min={50} max={500} step={0.1} value={autoCeilH}
                      onChange={e => setAutoCeilH(parseFloat(e.target.value) || 250)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-400 mb-1 block">Profondeur meuble (cm)</label>
                    <input type="number" min={10} max={100} step={0.1} value={autoDepth}
                      onChange={e => setAutoDepth(parseFloat(e.target.value) || 30)} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[11px] text-stone-400 mb-1 block">Plinthe (cm, 0 si aucune)</label>
                    <input type="number" min={0} max={30} step={0.1} value={autoPlinthH}
                      onChange={e => { setAutoPlinthH(parseFloat(e.target.value) || 0); if (parseFloat(e.target.value) === 0) setAutoPlinthD(0); }} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Material */}
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Matériau</label>
                <select className={inputClass} value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value as MaterialKey)}>
                  {Object.entries(MATERIALS).map(([k, m]) => (
                    <option key={k} value={k}>{m.name} — portée max {m.maxSpan18}cm</option>
                  ))}
                </select>
              </div>

              {/* Live preview */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <h4 className="text-xs font-semibold text-amber-700 mb-2">Aperçu : {autoPreview.name}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-600">
                  <div>
                    <span className="text-stone-400 block">Corps</span>
                    <span className="font-semibold text-lg text-amber-700">{autoPreview.bodies.length}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Largeur/corps</span>
                    <span className="font-semibold">{autoPreview.bodies[0]?.width ?? 0} cm</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Pièces total</span>
                    <span className="font-semibold">{autoTotalPieces}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Int. tablette</span>
                    <span className="font-semibold">{autoPreview.bodies[0] ? (autoPreview.bodies[0].width - 2 * th).toFixed(1) : 0} cm</span>
                  </div>
                </div>
                {autoPreview.bodies.length > 0 && (
                  <div className="mt-3 text-[11px] text-stone-500 space-y-0.5">
                    {autoPreview.bodies[0].pieces.map((p, i) => (
                      <div key={i}>• {p.name} : {p.length}×{p.width} cm ×{p.qty}</div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleAutoCreate}
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 transition-colors">
                Créer ce projet
              </button>
            </div>
          )}

          {/* ===== TEMPLATES MODE ===== */}
          {mode === 'choose' && (
            <div className="space-y-3">
              {/* Material */}
              <div className="mb-3">
                <label className="text-xs text-stone-500 mb-1.5 block">Matériau</label>
                <select className={inputClass} value={selectedMaterial}
                  onChange={(e) => setSelectedMaterial(e.target.value as MaterialKey)}>
                  {Object.entries(MATERIALS).map(([k, m]) => (
                    <option key={k} value={k}>{m.name} — portée max {m.maxSpan18}cm</option>
                  ))}
                </select>
              </div>

              <button onClick={handleBlank}
                className="w-full text-left rounded-xl border-2 border-dashed border-stone-300 hover:border-amber-400 p-4 transition-colors group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <div>
                    <div className="font-semibold text-sm text-stone-700 group-hover:text-amber-700 transition-colors">Projet vierge</div>
                    <div className="text-xs text-stone-500">Partez de zéro et construisez votre meuble pièce par pièce</div>
                  </div>
                </div>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEMPLATES.map(tpl => (
                  <button key={tpl.id} onClick={() => handleTemplate(tpl.id)}
                    className="text-left rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 p-4 transition-all group">
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

          {/* ===== AI MODE ===== */}
          {mode === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Décrivez votre projet</label>
                <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Je veux une bibliothèque de 2m de large pour un mur de 2.5m de haut, 3 modules côte à côte avec des tablettes réglables. Le mur a une plinthe de 8cm..."
                  className={inputClass + " min-h-[120px] resize-y"} />
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 mb-1.5 block">Photos (optionnel)</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {images.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img.preview} alt={img.name} className="w-16 h-16 object-cover rounded-lg border border-stone-200" />
                      <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
                    </div>
                  ))}
                  <button onClick={() => fileRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-stone-300 hover:border-amber-400 flex items-center justify-center text-stone-400 hover:text-amber-600 transition-colors">+</button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                </div>
              </div>

              {aiError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{aiError}</div>
              )}

              <button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()}
                className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-50 transition-colors">
                {aiLoading ? 'Génération en cours...' : 'Générer avec l\'IA'}
              </button>

              <p className="text-[10px] text-stone-400 text-center">
                L'IA génère une structure de départ que vous pouvez ensuite modifier librement.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
