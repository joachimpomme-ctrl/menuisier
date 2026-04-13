import type { ShoppingList as ShoppingListType } from '../../lib/knowledge/types';

interface Props {
  list: ShoppingListType;
}

export default function ShoppingList({ list }: Props) {
  const standardPanels = list.panels.filter((p) => p.standard_part_id);
  const customPanels = list.panels.filter((p) => !p.standard_part_id);

  return (
    <div className="space-y-4">
      {/* Standard parts (commercial products) */}
      {standardPanels.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Pièces standard (commerce)</h4>
          <div className="space-y-1">
            {standardPanels.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{p.count}× {p.panel_label} ({p.width_mm}×{p.height_mm}mm)</span>
                <span className="text-gray-500 tabular-nums">{(p.count * p.unit_price_eur).toFixed(0)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom panels (cut from sheets) */}
      {customPanels.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
            {standardPanels.length > 0 ? 'Panneaux sur mesure' : 'Panneaux'}
          </h4>
          <div className="space-y-1">
            {customPanels.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{p.count}× {p.panel_label} ({p.width_mm}×{p.height_mm}mm)</span>
                <span className="text-gray-500 tabular-nums">{(p.count * p.unit_price_eur).toFixed(0)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hardware */}
      {list.hardware.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quincaillerie</h4>
          <div className="space-y-1">
            {list.hardware.map((h) => (
              <div key={h.id} className="flex justify-between text-sm">
                <span>{h.quantity}× {h.name}</span>
                {h.unit_price_eur !== undefined && (
                  <span className="text-gray-500 tabular-nums">{(h.quantity * h.unit_price_eur).toFixed(0)} €</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Outils nécessaires</h4>
        <ul className="text-sm text-gray-600 space-y-0.5">
          {list.tools_needed.map((t, i) => (
            <li key={i}>• {t}</li>
          ))}
        </ul>
      </div>

      {/* Total */}
      <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
        <span>Coût estimé</span>
        <span>{list.estimated_cost_eur} €</span>
      </div>
    </div>
  );
}
