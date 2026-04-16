import type { FurnitureType } from '../../lib/knowledge/types';
import { Panel, ToolbarButton } from '../../ui-system';

interface Props {
  onSelect: (type: FurnitureType) => void;
}

const TYPES: { id: FurnitureType; name: string }[] = [
  { id: 'bibliotheque', name: 'Bibliothèque' },
  { id: 'etagere_murale', name: 'Étagère murale' },
  { id: 'placard', name: 'Placard' },
  { id: 'armoire', name: 'Armoire' },
  { id: 'vestiaire_entree', name: 'Vestiaire entrée' },
  { id: 'meuble_tv', name: 'Meuble TV' },
  { id: 'buffet', name: 'Buffet' },
  { id: 'bureau', name: 'Bureau' },
  { id: 'commode', name: 'Commode' },
  { id: 'cuisine', name: 'Cuisine' },
  { id: 'meuble_salle_de_bain', name: 'Salle de bain' },
  { id: 'meuble_chaussures', name: 'Meuble chaussures' },
  { id: 'cave_vin', name: 'Cave à vin' },
  { id: 'banquette_coffre', name: 'Banquette coffre' },
  { id: 'sous_escalier', name: 'Sous-escalier' },
  { id: 'lit_cabane_mezzanine', name: 'Lit cabane / Mezzanine' },
  { id: 'table', name: 'Table' },
];

export default function StepType({ onSelect }: Props) {
  return (
    <Panel title="Choix du meuble">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TYPES.map((typeItem) => (
          <ToolbarButton
            key={typeItem.id}
            variant="ghost"
            onClick={() => onSelect(typeItem.id)}
            className="!h-auto !justify-start !px-3 !py-2 text-left"
          >
            <span className="text-[12px] leading-tight">{typeItem.name}</span>
          </ToolbarButton>
        ))}
      </div>
    </Panel>
  );
}
