import { useState } from 'react';
import type { PieceType } from '../../types';
import { PIECE_COLORS } from '../../data/materials';
import { cardClass, sectionTitle } from './styles';

interface GlossaryEntry {
  type: PieceType;
  label: string;
  icon: string;
  desc: string;
  illustration: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  {
    type: 'joue', label: 'Joue', icon: '📏',
    desc: "Panneau vertical qui forme le côté gauche ou droit du meuble. C'est la pièce structurelle principale : elle porte tout le poids des tablettes et de leur contenu.",
    illustration: "Un meuble a 2 joues (gauche + droite). Quand 2 corps sont collés, on peut partager une seule joue entre les deux (joue commune).",
  },
  {
    type: 'tablette-fixe', label: 'Tablette fixe', icon: '🔩',
    desc: "Étagère collée et vissée de manière permanente. Elle rigidifie le caisson (comme un cadre). Impossible à déplacer après montage.",
    illustration: "Minimum 2 par corps : une en haut, une en bas. Elles empêchent le meuble de se déformer en losange (équerrage).",
  },
  {
    type: 'tablette-reglable', label: 'Tablette réglable', icon: '↕',
    desc: "Étagère posée sur des taquets amovibles (petites broches métalliques). On peut la repositionner pour adapter la hauteur au contenu.",
    illustration: "Installée en dernier. Les taquets se glissent dans des trous percés tous les 32 mm dans les joues (système 32).",
  },
  {
    type: 'bandeau', label: 'Bandeau', icon: '🎀',
    desc: "Pièce décorative, souvent placée en haut du meuble, qui cache l'espace entre le dessus du meuble et le plafond.",
    illustration: "Donne un aspect fini et intégré au meuble. Sa longueur = largeur totale du corps.",
  },
  {
    type: 'porte', label: 'Porte', icon: '🚪',
    desc: "Panneau mobile fixé par des charnières (type Ø35 mm). Permet de fermer tout ou partie du meuble.",
    illustration: "2 mm de jeu entre portes. Largeur max 60 cm en 18 mm (risque de voile au-delà). 2 à 5 charnières selon la hauteur.",
  },
  {
    type: 'tiroir-facade', label: 'Façade tiroir', icon: '🗄',
    desc: "Face avant visible du tiroir. Fixée par vis depuis l'intérieur du caisson tiroir. Mêmes règles de jeu que les portes.",
    illustration: "Le caisson tiroir (invisible derrière) fait ~25 mm de moins en hauteur. Coulisses : 12.5 mm de jeu latéral de chaque côté.",
  },
  {
    type: 'separateur', label: 'Séparateur', icon: '┃',
    desc: "Panneau vertical intercalé entre deux tablettes pour diviser un espace en compartiments. Réduit la portée des tablettes longues et donne un rendu bibliothèque sur mesure.",
    illustration: "Hauteur = distance entre les 2 tablettes qui l'encadrent. Profondeur = profondeur du corps. Posé sur taquets ou collé/vissé aux tablettes fixes.",
  },
  {
    type: 'fond', label: 'Fond (dos)', icon: '📦',
    desc: "Panneau fin (3-6 mm) fixé à l'arrière du meuble. Il rigidifie le caisson et empêche le basculement.",
    illustration: "Généralement en HDF ou CP 3-6 mm, rainuré dans les joues ou agrafé. Indispensable pour l'équerrage.",
  },
];

export function pieceTypeLabel(type: PieceType): string {
  const entry = GLOSSARY.find((g) => g.type === type);
  return entry?.label ?? type;
}

export default function Glossary() {
  const [open, setOpen] = useState(false);

  return (
    <div className={cardClass}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
      >
        <h3 className={sectionTitle + " mb-0"}>Lexique des pièces</h3>
        <span className="text-xs text-stone-400">{open ? '▲ Fermer' : '▼ Ouvrir'}</span>
      </button>
      <p className="text-[10px] text-stone-400 mt-1">
        {open ? "Chaque type de pièce a un rôle précis dans le meuble." : "Que sont les joues, tablettes fixes, etc. ? Cliquez pour comprendre."}
      </p>

      {open && (
        <div className="mt-3 space-y-3">
          {GLOSSARY.map((g) => (
            <div key={g.type} className="flex gap-3 items-start">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: PIECE_COLORS[g.type] }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-stone-800">{g.icon} {g.label}</span>
                  <span className="text-[10px] text-stone-400 font-mono bg-stone-100 px-1.5 py-0.5 rounded">{g.type}</span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">{g.desc}</p>
                <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">💡 {g.illustration}</p>
              </div>
            </div>
          ))}

          {/* Mini-schéma anatomie */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mt-3">
            <p className="text-[10px] font-semibold text-stone-600 mb-2">ANATOMIE D'UN CORPS (vue de face)</p>
            <svg viewBox="0 0 200 160" className="w-full max-w-[280px] mx-auto" style={{ height: 160 }}>
              <rect x="10" y="5" width="180" height="150" fill="none" stroke="#d6d3d1" strokeWidth="1" strokeDasharray="4,2" />
              <rect x="15" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
              <rect x="173" y="10" width="12" height="140" fill="#3b82f6" opacity=".3" stroke="#3b82f6" strokeWidth="1" rx="1" />
              <rect x="27" y="12" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
              <rect x="27" y="135" width="146" height="8" fill="#10b981" opacity=".4" stroke="#10b981" strokeWidth="1" rx="1" />
              <line x1="30" y1="55" x2="170" y2="55" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
              <line x1="30" y1="90" x2="170" y2="90" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,3" />
              <rect x="10" y="0" width="180" height="6" fill="#8b5cf6" opacity=".3" stroke="#8b5cf6" strokeWidth="0.5" rx="1" />
              <text x="5" y="85" fontSize="7" fill="#3b82f6" fontWeight="600" transform="rotate(-90,5,85)" textAnchor="middle">Joue G</text>
              <text x="195" y="85" fontSize="7" fill="#3b82f6" fontWeight="600" transform="rotate(90,195,85)" textAnchor="middle">Joue D</text>
              <text x="100" y="8" fontSize="7" fill="#8b5cf6" fontWeight="600" textAnchor="middle" dy="-4">Bandeau</text>
              <text x="100" y="18" fontSize="6" fill="#10b981" fontWeight="600" textAnchor="middle">Tabl. fixe haute</text>
              <text x="100" y="133" fontSize="6" fill="#10b981" fontWeight="600" textAnchor="middle">Tabl. fixe basse</text>
              <text x="100" y="52" fontSize="6" fill="#f59e0b" textAnchor="middle">Tabl. réglable</text>
              <text x="100" y="87" fontSize="6" fill="#f59e0b" textAnchor="middle">Tabl. réglable</text>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
