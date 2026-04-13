import { useState } from 'react';
import type { FurnitureType, SpaceDimensions, ZoneConfig, ContentItem } from '../../lib/knowledge/types';
import {
  getCategoriesForType,
  contentToZones,
} from '../../lib/knowledge/contentAnalyzer';

interface Props {
  furnitureType: FurnitureType;
  space: SpaceDimensions;
  onApply: (zones: ZoneConfig[]) => void;
  onClose: () => void;
}

export default function ContentMode({ furnitureType, space, onApply, onClose }: Props) {
  const categories = getCategoriesForType(furnitureType);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const c of categories) init[c.id] = 0;
    return init;
  });

  const setQty = (id: string, val: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, val) }));
  };

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0);

  const handleGenerate = () => {
    const contents: ContentItem[] = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([category, quantity]) => ({ category, quantity }));

    const zones = contentToZones(contents, space, furnitureType);
    if (zones.length > 0) {
      onApply(zones);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">Que rangez-vous ?</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <p className="text-xs text-gray-500 mb-3">
            Indiquez les quantités approximatives. Les zones seront générées automatiquement.
          </p>

          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3">
              <label className="text-sm flex-1">{cat.label}</label>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQty(cat.id, (quantities[cat.id] ?? 0) - 1)}
                  className="w-7 h-7 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 text-sm"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={quantities[cat.id] ?? 0}
                  onChange={(e) => setQty(cat.id, parseInt(e.target.value, 10) || 0)}
                  className="w-14 text-center border border-gray-300 rounded py-0.5 text-sm tabular-nums"
                />
                <button
                  onClick={() => setQty(cat.id, (quantities[cat.id] ?? 0) + 1)}
                  className="w-7 h-7 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 text-sm"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex justify-between items-center">
          <span className="text-xs text-gray-400">
            {totalItems} article{totalItems !== 1 ? 's' : ''}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleGenerate}
              disabled={totalItems === 0}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40"
            >
              Générer les zones
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
