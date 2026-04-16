import { useState } from 'react';
import type { FurnitureType, SpaceDimensions, ZoneConfig, ContentItem } from '../../lib/knowledge/types';
import {
  getCategoriesForType,
  contentToZones,
} from '../../lib/knowledge/contentAnalyzer';
import {
  color,
  DataTable,
  NumberInput,
  Panel,
  Toolbar,
  ToolbarButton,
} from '../../ui-system';

interface Props {
  furnitureType: FurnitureType;
  space: SpaceDimensions;
  onApply: (zones: ZoneConfig[]) => void;
  onClose: () => void;
}

export default function ContentMode({ furnitureType, space, onApply, onClose }: Props) {
  const categories = getCategoriesForType(furnitureType);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialValues: Record<string, number> = {};
    for (const category of categories) {
      initialValues[category.id] = 0;
    }
    return initialValues;
  });

  const setQty = (id: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const totalItems = Object.values(quantities).reduce((sum, value) => sum + value, 0);

  const handleGenerate = () => {
    const contents: ContentItem[] = Object.entries(quantities)
      .filter(([, quantity]) => quantity > 0)
      .map(([category, quantity]) => ({ category, quantity }));

    const zones = contentToZones(contents, space, furnitureType);
    if (zones.length > 0) {
      onApply(zones);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
      style={{ backgroundColor: `${color.overlay}66` }}
      onClick={onClose}
    >
      {/* DS-ÉCART : absence de primitive modale/backdrop dans le DS public. */}
      <div className="w-full max-w-[720px]" onClick={(e) => e.stopPropagation()}>
        <Panel title="Que rangez-vous ?" actions={<ToolbarButton onClick={onClose}>Fermer</ToolbarButton>}>
          <div className="space-y-3">
            <div className="text-[12px] text-[color:var(--fg-muted)]">
              Indiquez les quantités approximatives. Les zones sont générées automatiquement à partir du contenu.
            </div>

            <div className="rule-t rule-b">
              <DataTable
                columns={[
                  {
                    key: 'category',
                    header: 'Catégorie',
                    render: (row) => row.label,
                  },
                  {
                    key: 'quantity',
                    header: 'Quantité',
                    align: 'right',
                    render: (row) => (
                      <div className="flex items-center justify-end gap-1">
                        <ToolbarButton
                          variant="ghost"
                          onClick={() => setQty(row.id, (quantities[row.id] ?? 0) - 1)}
                          className="!h-[22px] !px-2"
                          aria-label={`Diminuer ${row.label}`}
                        >
                          -
                        </ToolbarButton>
                        <NumberInput
                          value={quantities[row.id] ?? 0}
                          min={0}
                          onChange={(e) => setQty(row.id, parseInt(e.target.value, 10) || 0)}
                          className="w-[72px] text-right"
                          aria-label={`Quantité ${row.label}`}
                        />
                        <ToolbarButton
                          variant="ghost"
                          onClick={() => setQty(row.id, (quantities[row.id] ?? 0) + 1)}
                          className="!h-[22px] !px-2"
                          aria-label={`Augmenter ${row.label}`}
                        >
                          +
                        </ToolbarButton>
                      </div>
                    ),
                  },
                ]}
                rows={categories}
                rowId={(row) => row.id}
                emptyLabel="Aucune catégorie disponible"
                maxHeight={360}
              />
            </div>

            <Toolbar
              start={(
                <div className="px-2 text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--fg-subtle)]">
                  {totalItems} article{totalItems !== 1 ? 's' : ''}
                </div>
              )}
              end={(
                <>
                  <ToolbarButton onClick={onClose}>Annuler</ToolbarButton>
                  <ToolbarButton variant="primary" onClick={handleGenerate} disabled={totalItems === 0}>
                    Générer les zones
                  </ToolbarButton>
                </>
              )}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
