import { useState } from 'react';
import type { StandardPart, StandardPartCategory } from '../../lib/knowledge/types';
import { isPanelCategory } from '../../lib/knowledge/types';
import type { MaterialKey } from '../../types';
import { MATERIALS } from '../../data/materials';

interface Props {
  initial?: StandardPart;
  onSave: (data: Omit<StandardPart, 'id' | 'source'>) => void;
  onCancel: () => void;
}

const PANEL_CATEGORIES: { value: StandardPartCategory; label: string }[] = [
  { value: 'shelf', label: 'Tablette' },
  { value: 'side_panel', label: 'Joue / côté' },
  { value: 'door', label: 'Porte' },
  { value: 'drawer_front', label: 'Façade tiroir' },
  { value: 'back_panel', label: 'Fond' },
  { value: 'top_bottom', label: 'Dessus / dessous' },
  { value: 'divider', label: 'Séparateur' },
  { value: 'custom', label: 'Autre panneau' },
];

const HARDWARE_CATEGORIES: { value: StandardPartCategory; label: string }[] = [
  { value: 'hinge', label: 'Charnière' },
  { value: 'slide', label: 'Glissière de tiroir' },
  { value: 'screw', label: 'Vis' },
  { value: 'dowel', label: 'Tourillon / cheville' },
  { value: 'handle', label: 'Poignée / bouton' },
  { value: 'bracket', label: 'Équerre / support' },
  { value: 'edge_band', label: 'Chant / bordure' },
  { value: 'foot', label: 'Pied de meuble' },
];

const MAT_OPTIONS = Object.entries(MATERIALS).map(([k, m]) => ({
  value: k as MaterialKey,
  label: m.short,
}));

const inputCls =
  'w-full border border-[#EFE8DD] rounded-lg px-2.5 py-2 text-sm bg-white text-[#0E0D0C] placeholder-[#9A968F] focus:border-[#3B5FFF] focus:outline-none focus:ring-2 focus:ring-[#3B5FFF]/20';

const labelCls = 'block text-xs font-medium text-[#54514E] mb-1';

export default function PartForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<StandardPartCategory>(initial?.category ?? 'shelf');
  const [length_mm, setLength] = useState<number | ''>(initial?.length_mm ?? '');
  const [width_mm, setWidth] = useState<number | ''>(initial?.width_mm ?? '');
  const [thickness_mm, setThickness] = useState<number | ''>(initial?.thickness_mm ?? '');
  const [material_key, setMaterialKey] = useState<MaterialKey | ''>(initial?.material_key ?? '');

  const [merchant, setMerchant] = useState(initial?.merchant ?? '');
  const [merchant_ref, setMerchantRef] = useState(initial?.merchant_ref ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [price_eur, setPrice] = useState<number | ''>(initial?.price_eur ?? '');
  const [pack_qty, setPackQty] = useState<number | ''>(initial?.pack_qty ?? '');
  const [image_url, setImageUrl] = useState(initial?.image_url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  const isPanel = isPanelCategory(category);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const data: Omit<StandardPart, 'id' | 'source'> = {
      name: name.trim(),
      category,
    };
    if (length_mm !== '') data.length_mm = Number(length_mm);
    if (width_mm !== '') data.width_mm = Number(width_mm);
    if (thickness_mm !== '') data.thickness_mm = Number(thickness_mm);
    if (material_key) data.material_key = material_key as MaterialKey;
    if (merchant.trim()) data.merchant = merchant.trim();
    if (merchant_ref.trim()) data.merchant_ref = merchant_ref.trim();
    if (url.trim()) data.url = url.trim();
    if (price_eur !== '') {
      data.price_eur = Number(price_eur);
      data.currency = initial?.currency ?? 'EUR';
    }
    if (pack_qty !== '') data.pack_qty = Number(pack_qty);
    if (image_url.trim()) data.image_url = image_url.trim();
    if (notes.trim()) data.notes = notes.trim();
    if (initial?.last_checked_at) data.last_checked_at = initial.last_checked_at;
    if (initial?.edge_banding) data.edge_banding = initial.edge_banding;
    if (initial?.pre_drilling) data.pre_drilling = initial.pre_drilling;

    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelCls}>Nom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Tablette mélaminé 800×300"
            required
          />
        </div>
        <div>
          <label className={labelCls}>Catégorie</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as StandardPartCategory)}
            className={inputCls}
          >
            <optgroup label="Panneaux">
              {PANEL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
            <optgroup label="Quincaillerie">
              {HARDWARE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Dimensions — toujours visibles mais facultatives pour quincaillerie */}
      <fieldset className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Longueur mm{isPanel ? '' : ' (opt.)'}</label>
          <input
            type="number"
            value={length_mm}
            min={0}
            onChange={(e) => setLength(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
            className={inputCls}
            required={isPanel}
          />
        </div>
        <div>
          <label className={labelCls}>Largeur mm{isPanel ? '' : ' (opt.)'}</label>
          <input
            type="number"
            value={width_mm}
            min={0}
            onChange={(e) => setWidth(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
            className={inputCls}
            required={isPanel}
          />
        </div>
        <div>
          <label className={labelCls}>Ép. mm{isPanel ? '' : ' (opt.)'}</label>
          <input
            type="number"
            value={thickness_mm}
            min={0}
            onChange={(e) => setThickness(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
            className={inputCls}
            required={isPanel}
          />
        </div>
        {isPanel && (
          <div>
            <label className={labelCls}>Matériau</label>
            <select
              value={material_key}
              onChange={(e) => setMaterialKey(e.target.value as MaterialKey | '')}
              className={inputCls}
            >
              <option value="">—</option>
              {MAT_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        )}
      </fieldset>

      {/* Section marchand */}
      <fieldset className="rounded-lg border border-[#EFE8DD] p-3 space-y-3">
        <legend className="text-[10px] uppercase tracking-widest text-[#9A968F] font-semibold px-1">
          Infos marchand (optionnel)
        </legend>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Marchand</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className={inputCls}
              placeholder="Leroy Merlin"
            />
          </div>
          <div>
            <label className={labelCls}>Référence</label>
            <input
              type="text"
              value={merchant_ref}
              onChange={(e) => setMerchantRef(e.target.value)}
              className={inputCls}
              placeholder="REF-12345"
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>URL fiche produit</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
            placeholder="https://www.leroymerlin.fr/produits/..."
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Prix unitaire (€)</label>
            <input
              type="number"
              step="0.01"
              value={price_eur}
              min={0}
              onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
              className={inputCls}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className={labelCls}>Lot (qté)</label>
            <input
              type="number"
              value={pack_qty}
              min={1}
              onChange={(e) => setPackQty(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)}
              className={inputCls}
              placeholder="1"
            />
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-end">
            {image_url ? (
              <img
                src={image_url}
                alt=""
                className="h-12 w-12 rounded border border-[#EFE8DD] object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            ) : null}
          </div>
        </div>

        <div>
          <label className={labelCls}>URL image (optionnel)</label>
          <input
            type="url"
            value={image_url}
            onChange={(e) => setImageUrl(e.target.value)}
            className={inputCls}
            placeholder="https://media.leroymerlin.fr/..."
          />
        </div>
      </fieldset>

      <div>
        <label className={labelCls}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputCls} resize-y min-h-[60px]`}
          placeholder="Charge max 25kg, ouverture 110°, etc."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm border border-[#EFE8DD] text-[#54514E] rounded-lg hover:bg-[#FFFCF7]"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm bg-[#3B5FFF] text-white rounded-lg hover:bg-[#1E3FCC] font-semibold"
        >
          {initial ? 'Modifier' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}
