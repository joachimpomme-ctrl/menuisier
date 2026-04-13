import { useState } from 'react';
import type { StandardPart, StandardPartCategory } from '../../lib/knowledge/types';
import type { MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';

interface Props {
  initial?: StandardPart;
  onSave: (data: Omit<StandardPart, 'id' | 'source'>) => void;
  onCancel: () => void;
}

const CATEGORIES: { value: StandardPartCategory; label: string }[] = [
  { value: 'shelf', label: 'Tablette' },
  { value: 'side_panel', label: 'Joue / côté' },
  { value: 'door', label: 'Porte' },
  { value: 'drawer_front', label: 'Façade tiroir' },
  { value: 'back_panel', label: 'Fond' },
  { value: 'top_bottom', label: 'Dessus / dessous' },
  { value: 'divider', label: 'Séparateur' },
  { value: 'custom', label: 'Autre' },
];

const MAT_OPTIONS = Object.entries(MATERIALS).map(([k, m]) => ({
  value: k as MaterialKey,
  label: m.short,
}));

export default function PartForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<StandardPartCategory>(initial?.category ?? 'shelf');
  const [length_mm, setLength] = useState(initial?.length_mm ?? 800);
  const [width_mm, setWidth] = useState(initial?.width_mm ?? 300);
  const [thickness_mm, setThickness] = useState(initial?.thickness_mm ?? 18);
  const [material_key, setMaterialKey] = useState<MaterialKey | ''>(initial?.material_key ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      length_mm,
      width_mm,
      thickness_mm,
      ...(material_key ? { material_key: material_key as MaterialKey } : {}),
      edge_banding: initial?.edge_banding,
      pre_drilling: initial?.pre_drilling,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Nom</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder="Tablette mélaminé 800×300"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StandardPartCategory)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Matériau</label>
          <select
            value={material_key}
            onChange={(e) => setMaterialKey(e.target.value as MaterialKey | '')}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            <option value="">—</option>
            {MAT_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Longueur mm</label>
          <input
            type="number"
            value={length_mm}
            min={1}
            onChange={(e) => setLength(parseInt(e.target.value, 10) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Largeur mm</label>
          <input
            type="number"
            value={width_mm}
            min={1}
            onChange={(e) => setWidth(parseInt(e.target.value, 10) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Ép. mm</label>
          <input
            type="number"
            value={thickness_mm}
            min={1}
            onChange={(e) => setThickness(parseInt(e.target.value, 10) || 0)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {initial ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}
