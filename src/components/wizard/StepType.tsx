import type { FurnitureType } from '../../lib/knowledge/types';

interface Props {
  onSelect: (type: FurnitureType) => void;
}

const TYPES: { id: FurnitureType; name: string; icon: string }[] = [
  { id: 'bibliotheque', name: 'Bibliothèque', icon: '📚' },
  { id: 'etagere_murale', name: 'Étagère murale', icon: '🪵' },
  { id: 'placard', name: 'Placard', icon: '🚪' },
  { id: 'armoire', name: 'Armoire', icon: '👔' },
  { id: 'vestiaire_entree', name: 'Vestiaire entrée', icon: '🧥' },
  { id: 'meuble_tv', name: 'Meuble TV', icon: '📺' },
  { id: 'buffet', name: 'Buffet', icon: '🍽️' },
  { id: 'bureau', name: 'Bureau', icon: '🖥️' },
  { id: 'commode', name: 'Commode', icon: '🗄️' },
  { id: 'cuisine', name: 'Cuisine', icon: '🍳' },
  { id: 'meuble_salle_de_bain', name: 'Salle de bain', icon: '🚿' },
  { id: 'meuble_chaussures', name: 'Meuble chaussures', icon: '👟' },
  { id: 'cave_vin', name: 'Cave à vin', icon: '🍷' },
  { id: 'banquette_coffre', name: 'Banquette coffre', icon: '🪑' },
  { id: 'sous_escalier', name: 'Sous-escalier', icon: '🪜' },
  { id: 'lit_cabane_mezzanine', name: 'Lit cabane / Mezzanine', icon: '🛏️' },
  { id: 'table', name: 'Table', icon: '🪵' },
];

export default function StepType({ onSelect }: Props) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Quel meuble voulez-vous construire ?</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
          >
            <span className="text-3xl">{t.icon}</span>
            <span className="text-sm font-medium leading-tight">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
