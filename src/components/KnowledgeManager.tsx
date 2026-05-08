import { useState, useRef, useCallback } from 'react';
import type { KnowledgeDoc } from '../lib/knowledgeStore';
import { listKnowledgeDocs, deleteKnowledgeDoc, importKnowledgeDoc } from '../lib/knowledgeStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const cardClass = 'rounded-xl border border-[#EFE8DD] bg-white p-4';

export default function KnowledgeManager({ isOpen, onClose, onUpdate }: Props) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>(listKnowledgeDocs());
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setDocs(listKnowledgeDocs());
    onUpdate();
  }, [onUpdate]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      await importKnowledgeDoc(file);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'import");
    }

    setImporting(false);
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    deleteKnowledgeDoc(id);
    refresh();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0E0D0C]/40  p-4">
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-[#EFE8DD] bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE8DD]">
          <div>
            <h3 className="text-[#3B5FFF] font-bold text-sm">Base de connaissances</h3>
            <p className="text-xs text-[#54514E] mt-0.5">
              {docs.length} document{docs.length > 1 ? 's' : ''} — référence pour l'assistant IA
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#54514E] hover:text-[#9A968F] text-lg px-2"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="text-xs text-[#FF6B4A] bg-[#A52E16]/30 border border-[#A52E16]/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {docs.length === 0 && (
            <div className="text-center py-8 text-[#9A968F] text-sm">
              <p className="mb-2">Aucun document de connaissances</p>
              <p className="text-xs text-[#0E0D0C]">
                Uploadez des fichiers JSON contenant des règles métier,
                propriétés de matériaux, normes, etc.
              </p>
            </div>
          )}

          {docs.map((doc) => (
            <div key={doc.id} className={cardClass}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-[#0E0D0C] truncate">{doc.name}</div>
                  <div className="text-xs text-[#54514E] mt-0.5">
                    {doc.entryCount} entrées — {doc.uploadedAt.slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    className="text-xs px-2 py-1 rounded bg-white text-[#54514E] hover:text-[#0E0D0C] border border-[#EFE8DD]"
                  >
                    {expandedId === doc.id ? 'Masquer' : 'Apercu'}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs px-2 py-1 rounded bg-white text-[#FF6B4A] hover:text-[#A52E16] border border-[#EFE8DD]"
                  >
                    Suppr.
                  </button>
                </div>
              </div>

              {expandedId === doc.id && (
                <div className="mt-3 p-3 rounded-lg bg-[#FFFCF7] text-xs text-[#54514E] max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                  {doc.summary.slice(0, 3000)}
                  {doc.summary.length > 3000 && '\n... (tronqué)'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#EFE8DD] flex items-center justify-between gap-3">
          <div className="text-xs text-[#9A968F]">
            Format : JSON avec tables, règles, propriétés...
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="text-xs px-4 py-2 rounded-lg bg-[#3B5FFF] text-white font-medium hover:bg-[#1E3FCC] disabled:opacity-50 transition-colors"
            >
              {importing ? 'Import...' : '+ Importer un document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
