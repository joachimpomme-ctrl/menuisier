import { useState, useRef } from 'react';
import type { StandardPart } from '../../lib/knowledge/types';
import {
  getAllParts,
  addPart,
  updatePart,
  deletePart,
  exportLibrary,
  importLibrary,
  resetLibrary,
} from '../../lib/partsLibrary';
import PartForm from './PartForm';

interface Props {
  isOpen: boolean;
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

export default function PartsLibraryManager({ isOpen, onClose }: Props) {
  const [parts, setParts] = useState<StandardPart[]>(() => getAllParts());
  const [editing, setEditing] = useState<StandardPart | null>(null);
  const [adding, setAdding] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => setParts(getAllParts());

  const handleAdd = (data: Omit<StandardPart, 'id' | 'source'>) => {
    addPart(data);
    setAdding(false);
    refresh();
  };

  const handleUpdate = (data: Omit<StandardPart, 'id' | 'source'>) => {
    if (editing) {
      updatePart(editing.id, data);
      setEditing(null);
      refresh();
    }
  };

  const handleDelete = (id: string) => {
    deletePart(id);
    refresh();
  };

  const handleExport = () => {
    const blob = new Blob([exportLibrary()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pieces-standard.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = importLibrary(text);
      setImportMsg(`${count} pièce${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''}`);
      refresh();
    } catch {
      setImportMsg('Erreur d\'import');
    }
    e.target.value = '';
    setTimeout(() => setImportMsg(''), 3000);
  };

  const handleReset = () => {
    resetLibrary();
    refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold">Ma bibliothèque de pièces</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setAdding(true); setEditing(null); }}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + Ajouter
          </button>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Exporter
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Importer
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 ml-auto"
          >
            Réinitialiser
          </button>
          {importMsg && (
            <span className="text-xs text-green-600">{importMsg}</span>
          )}
        </div>

        {/* Form (add/edit) */}
        {(adding || editing) && (
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
            <PartForm
              initial={editing ?? undefined}
              onSave={editing ? handleUpdate : handleAdd}
              onCancel={() => { setAdding(false); setEditing(null); }}
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {parts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Bibliothèque vide</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-1.5 pr-2 font-medium">Nom</th>
                  <th className="py-1.5 pr-2 font-medium">Dim.</th>
                  <th className="py-1.5 pr-2 font-medium">Cat.</th>
                  <th className="py-1.5 font-medium w-20"></th>
                </tr>
              </thead>
              <tbody>
                {parts.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-1.5 pr-2">
                      <span className="truncate block max-w-[200px]">{p.name}</span>
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums text-gray-500 text-xs whitespace-nowrap">
                      {p.length_mm}×{p.width_mm}×{p.thickness_mm}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-400 text-xs">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setEditing(p); setAdding(false); }}
                        className="text-xs text-blue-500 hover:text-blue-700 mr-2"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 text-xs text-gray-400">
          {parts.length} pièce{parts.length !== 1 ? 's' : ''} en bibliothèque
        </div>
      </div>
    </div>
  );
}
