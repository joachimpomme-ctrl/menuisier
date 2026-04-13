import { useState } from 'react';
import type { StandardPart } from '../../lib/knowledge/types';
import { getAllParts } from '../../lib/partsLibrary';

interface Props {
  onSelect: (part: StandardPart) => void;
  onClose: () => void;
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

export default function PartSelector({ onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');
  const parts = getAllParts();

  const filtered = filter
    ? parts.filter(
        (p) =>
          p.name.toLowerCase().includes(filter.toLowerCase()) ||
          (CATEGORY_LABELS[p.category] ?? '').toLowerCase().includes(filter.toLowerCase()),
      )
    : parts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">Pièces standard</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher..."
            className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucune pièce trouvée</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((part) => (
                <button
                  key={part.id}
                  onClick={() => { onSelect(part); onClose(); }}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{part.name}</div>
                    <div className="text-xs text-gray-400">
                      {part.length_mm}×{part.width_mm}×{part.thickness_mm}mm
                      {' — '}
                      {CATEGORY_LABELS[part.category] ?? part.category}
                    </div>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    part.source === 'template'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {part.source === 'template' ? 'LM' : 'Perso'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
