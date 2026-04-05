import { useState, useRef, useCallback } from 'react';
import type { KnowledgeDoc } from '../lib/knowledgeStore';
import { listKnowledgeDocs, deleteKnowledgeDoc, importKnowledgeDoc } from '../lib/knowledgeStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const cardClass = 'rounded-xl border border-zinc-800 bg-zinc-900/50 p-4';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <h3 className="text-amber-400 font-bold text-sm">Base de connaissances</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {docs.length} document{docs.length > 1 ? 's' : ''} — enrichit l'IA et la validation
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-lg px-2"
          >
            x
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {docs.length === 0 && (
            <div className="text-center py-8 text-zinc-600 text-sm">
              <p className="mb-2">Aucun document de connaissances</p>
              <p className="text-xs text-zinc-700">
                Uploadez des fichiers JSON contenant des règles métier,
                propriétés de matériaux, normes, etc.
              </p>
            </div>
          )}

          {docs.map((doc) => (
            <div key={doc.id} className={cardClass}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm text-zinc-200 truncate">{doc.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {doc.entryCount} entrées — {doc.uploadedAt.slice(0, 10)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                  >
                    {expandedId === doc.id ? 'Masquer' : 'Apercu'}
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="text-xs px-2 py-1 rounded bg-zinc-800 text-red-400 hover:text-red-300 border border-zinc-700"
                  >
                    Suppr.
                  </button>
                </div>
              </div>

              {expandedId === doc.id && (
                <div className="mt-3 p-3 rounded-lg bg-zinc-950/50 text-xs text-zinc-400 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                  {doc.summary.slice(0, 3000)}
                  {doc.summary.length > 3000 && '\n... (tronqué)'}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="text-xs text-zinc-600">
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
              className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Import...' : '+ Importer un document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
