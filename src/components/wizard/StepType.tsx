import type { FurnitureType } from '../../lib/knowledge/types';

const FURNITURE_SVGS: Record<string, React.ReactNode> = {
  bibliotheque: (
    <svg viewBox="0 0 40 54" fill="none" width="32" height="43">
      <rect x="3" y="2" width="34" height="50" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="12" x2="37" y2="12" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="24" x2="37" y2="24" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="36" x2="37" y2="36" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="46" x2="37" y2="46" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  etagere_murale: (
    <svg viewBox="0 0 48 32" fill="none" width="38" height="26">
      <rect x="3" y="2" width="42" height="28" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="12" x2="45" y2="12" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="22" x2="45" y2="22" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  placard: (
    <svg viewBox="0 0 40 54" fill="none" width="32" height="43">
      <rect x="3" y="2" width="34" height="50" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="2" x2="20" y2="52" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="28" x2="37" y2="28" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="17.5" cy="16" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="22.5" cy="16" r="1.8" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  armoire: (
    <svg viewBox="0 0 40 54" fill="none" width="32" height="43">
      <rect x="3" y="2" width="34" height="50" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="2" x2="20" y2="52" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="11" x2="20" y2="11" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="20" y1="11" x2="37" y2="11" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="18" cy="30" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="22" cy="30" r="1.8" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  vestiaire_entree: (
    <svg viewBox="0 0 40 54" fill="none" width="32" height="43">
      <rect x="3" y="2" width="34" height="50" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="11" x2="37" y2="11" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="36" x2="37" y2="36" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="20" y1="36" x2="20" y2="52" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  meuble_tv: (
    <svg viewBox="0 0 54 32" fill="none" width="43" height="26">
      <rect x="3" y="3" width="48" height="26" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="20" x2="51" y2="20" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="21" y1="3" x2="21" y2="20" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="39" y1="3" x2="39" y2="20" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  buffet: (
    <svg viewBox="0 0 54 38" fill="none" width="43" height="30">
      <rect x="3" y="3" width="48" height="32" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="20" x2="51" y2="20" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="27" y1="3" x2="27" y2="35" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="23" cy="12" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="31" cy="12" r="1.8" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  bureau: (
    <svg viewBox="0 0 54 46" fill="none" width="43" height="37">
      <rect x="3" y="12" width="48" height="4" rx="0.5" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="3" y="16" width="14" height="26" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="26" x2="17" y2="26" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="36" x2="17" y2="36" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="20" y1="16" x2="20" y2="42" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="38" y1="16" x2="38" y2="42" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  commode: (
    <svg viewBox="0 0 40 46" fill="none" width="32" height="37">
      <rect x="3" y="2" width="34" height="42" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="14" x2="37" y2="14" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="26" x2="37" y2="26" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="36" x2="37" y2="36" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="20" cy="8" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="20" cy="20" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="20" cy="31" r="1.8" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  cuisine: (
    <svg viewBox="0 0 54 36" fill="none" width="43" height="29">
      <rect x="3" y="5" width="48" height="28" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="2" width="48" height="4" rx="0.5" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="30" y1="5" x2="30" y2="33" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="17" cy="19" r="1.8" fill="currentColor" opacity=".5"/>
      <circle cx="42" cy="19" r="1.8" fill="currentColor" opacity=".5"/>
    </svg>
  ),
  meuble_salle_de_bain: (
    <svg viewBox="0 0 48 38" fill="none" width="38" height="30">
      <rect x="3" y="2" width="42" height="32" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="14" x2="45" y2="14" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="26" x2="45" y2="26" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="24" y1="2" x2="24" y2="34" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  meuble_chaussures: (
    <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
      <rect x="3" y="2" width="34" height="36" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="3" y1="12" x2="37" y2="12" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
      <line x1="3" y1="22" x2="37" y2="22" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
      <line x1="3" y1="32" x2="37" y2="32" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2"/>
    </svg>
  ),
  cave_vin: (
    <svg viewBox="0 0 40 46" fill="none" width="32" height="37">
      <rect x="3" y="2" width="34" height="42" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="2" x2="20" y2="44" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="16" x2="37" y2="16" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  banquette_coffre: (
    <svg viewBox="0 0 54 34" fill="none" width="43" height="27">
      <rect x="3" y="10" width="48" height="20" rx="1" stroke="currentColor" strokeWidth="2"/>
      <rect x="3" y="5" width="48" height="7" rx="1" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  sous_escalier: (
    <svg viewBox="0 0 54 46" fill="none" width="43" height="37">
      <path d="M3 44 L3 30 L15 30 L15 20 L27 20 L27 10 L51 10 L51 44 Z" stroke="currentColor" strokeWidth="2" fill="none"/>
      <line x1="3" y1="44" x2="51" y2="44" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  lit_cabane_mezzanine: (
    <svg viewBox="0 0 54 46" fill="none" width="43" height="37">
      <rect x="3" y="2" width="48" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="6" y1="6" x2="6" y2="44" stroke="currentColor" strokeWidth="2"/>
      <line x1="48" y1="6" x2="48" y2="44" stroke="currentColor" strokeWidth="2"/>
      <line x1="6" y1="24" x2="48" y2="24" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="10" y="26" width="34" height="14" rx="1" fill="currentColor" opacity=".08" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  ),
  table: (
    <svg viewBox="0 0 54 40" fill="none" width="43" height="32">
      <rect x="3" y="8" width="48" height="5" rx="0.5" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="10" y1="13" x2="10" y2="38" stroke="currentColor" strokeWidth="2"/>
      <line x1="44" y1="13" x2="44" y2="38" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
};

const DEFAULT_SVG = (
  <svg viewBox="0 0 40 46" fill="none" width="32" height="37">
    <rect x="3" y="2" width="34" height="42" rx="1" stroke="currentColor" strokeWidth="2"/>
    <line x1="3" y1="16" x2="37" y2="16" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="3" y1="30" x2="37" y2="30" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
);

interface Props {
  onSelect: (type: FurnitureType) => void;
}

const TYPES: { id: FurnitureType; name: string }[] = [
  { id: 'bibliotheque',        name: 'Bibliothèque'           },
  { id: 'etagere_murale',      name: 'Étagère murale'         },
  { id: 'placard',             name: 'Placard'                },
  { id: 'armoire',             name: 'Armoire'                },
  { id: 'vestiaire_entree',    name: 'Vestiaire entrée'       },
  { id: 'meuble_tv',           name: 'Meuble TV'              },
  { id: 'buffet',              name: 'Buffet'                 },
  { id: 'bureau',              name: 'Bureau'                 },
  { id: 'commode',             name: 'Commode'                },
  { id: 'cuisine',             name: 'Cuisine'                },
  { id: 'meuble_salle_de_bain',name: 'Salle de bain'          },
  { id: 'meuble_chaussures',   name: 'Meuble chaussures'      },
  { id: 'cave_vin',            name: 'Cave à vin'             },
  { id: 'banquette_coffre',    name: 'Banquette coffre'       },
  { id: 'sous_escalier',       name: 'Sous-escalier'          },
  { id: 'lit_cabane_mezzanine',name: 'Lit cabane / Mezzanine' },
  { id: 'table',               name: 'Table'                  },
];

export default function StepType({ onSelect }: Props) {
  return (
    <div>
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-widest text-[#9d9089] mb-1">Étape 1 / 3</p>
        <h3 className="text-base font-semibold text-[#1c1714]">Quel meuble construire ?</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#e0d8ce] hover:border-[#6b4c2a] hover:bg-[#f2ebe0] transition-colors text-center text-[#695f56] hover:text-[#6b4c2a]"
          >
            <span className="flex items-center justify-center h-10">
              {FURNITURE_SVGS[t.id] ?? DEFAULT_SVG}
            </span>
            <span className="text-sm font-medium leading-tight text-[#1c1714]">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
