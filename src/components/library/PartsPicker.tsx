import { useMemo, useState } from 'react';
import type { StandardPart } from '../../lib/knowledge/types';
import { getAllParts } from '../../lib/partsLibrary';

interface PartsPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (part: StandardPart) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  shelf: 'Tablette',
  side_panel: 'Joue',
  door: 'Porte',
  drawer_front: 'Façade tiroir',
  back_panel: 'Fond',
  top_bottom: 'Dessus/dessous',
  divider: 'Séparateur',
  custom: 'Autre',
};

export default function PartsPicker({ isOpen, onClose, onSelect }: PartsPickerProps) {
  const [query, setQuery] = useState('');
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rafraîchir la liste à chaque ouverture, la library peut être enrichie via PartsLibraryManager
  const parts = useMemo(() => getAllParts(), [isOpen]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return parts;
    return parts.filter((part) => part.name.toLowerCase().includes(normalized));
  }, [parts, query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">Choisir une pièce standard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une pièce..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#3B5FFF] focus:outline-none focus:ring-2 focus:ring-[#3B5FFF]/20"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucune pièce trouvée</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-1.5 pr-2 font-medium">Nom</th>
                  <th className="py-1.5 pr-2 font-medium">Dim.</th>
                  <th className="py-1.5 pr-2 font-medium">Cat.</th>
                  <th className="py-1.5 font-medium w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((part) => (
                  <tr key={part.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-2">
                      <span className="truncate block max-w-[220px]">{part.name}</span>
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums text-gray-500 text-xs whitespace-nowrap">
                      {part.length_mm}×{part.width_mm}×{part.thickness_mm}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-400 text-xs">
                      {CATEGORY_LABELS[part.category] ?? part.category}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          onSelect(part);
                          onClose();
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg bg-[#E5EAFF] text-[#3B5FFF] hover:bg-[#3B5FFF] font-medium"
                      >
                        Utiliser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
          {filtered.length} pièce{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
