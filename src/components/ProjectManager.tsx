import { useState } from 'react';

interface ProjectMeta {
  id: string;
  name: string;
  materialShort: string;
  bodyCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectMeta[];
  currentId: string | null;
  onLoad: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ProjectManager({
  isOpen,
  onClose,
  projects,
  currentId,
  onLoad,
  onNew,
  onDuplicate,
  onRename,
  onDelete,
}: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  function startRename(id: string, currentName: string) {
    setRenamingId(id);
    setRenameValue(currentName);
    setDeletingId(null);
  }

  function confirmRename(id: string) {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  function startDelete(id: string) {
    setDeletingId(id);
    setRenamingId(null);
  }

  function confirmDelete(id: string) {
    onDelete(id);
    setDeletingId(null);
  }

  function cancelDelete() {
    setDeletingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60  transition-opacity"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 max-h-[85vh] flex flex-col bg-white border border-stone-200 rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold text-stone-800">Mes projets</h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-800 text-2xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* New project button */}
        <div className="px-6 pt-4">
          <button
            onClick={onNew}
            className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium transition-colors"
          >
            Nouveau projet
          </button>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-center text-stone-500 py-8">Aucun projet sauvegard&eacute;</p>
          ) : (
            sorted.map((project) => {
              const isCurrent = project.id === currentId;
              const isRenaming = renamingId === project.id;
              const isDeleting = deletingId === project.id;

              return (
                <div
                  key={project.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isCurrent
                      ? 'border-amber-600/50 bg-stone-100'
                      : 'border-stone-200 bg-white/40 hover:bg-white/70'
                  }`}
                >
                  {/* Top row: name + current indicator */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmRename(project.id);
                              if (e.key === 'Escape') cancelRename();
                            }}
                            autoFocus
                            className="flex-1 px-2 py-1 rounded-md bg-stone-100 border border-stone-300 text-stone-800 text-sm focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => confirmRename(project.id)}
                            className="text-xs text-amber-700 hover:text-amber-300 font-medium transition-colors"
                          >
                            OK
                          </button>
                          <button
                            onClick={cancelRename}
                            className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onLoad(project.id)}
                          className="text-sm font-bold text-stone-800 hover:text-amber-700 transition-colors truncate block text-left"
                        >
                          {project.name}
                        </button>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 flex items-center gap-1.5 text-xs text-amber-700">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Actif
                      </span>
                    )}
                  </div>

                  {/* Details row */}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-stone-500">
                    <span>{project.materialShort}</span>
                    <span className="text-stone-400">&middot;</span>
                    <span>{project.bodyCount} corps</span>
                    <span className="text-stone-400">&middot;</span>
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 flex items-center gap-2">
                    {isDeleting ? (
                      <>
                        <span className="text-xs text-red-400 mr-1">Confirmer ?</span>
                        <button
                          onClick={() => confirmDelete(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="text-xs px-2.5 py-1 rounded-md text-stone-500 hover:text-stone-400 transition-colors"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onDuplicate(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-stone-100/50 text-stone-400 hover:bg-stone-100 transition-colors"
                        >
                          Dupliquer
                        </button>
                        <button
                          onClick={() => startRename(project.id, project.name)}
                          className="text-xs px-2.5 py-1 rounded-md bg-stone-100/50 text-stone-400 hover:bg-stone-100 transition-colors"
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => startDelete(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-stone-100/50 text-red-400 hover:bg-red-600/20 transition-colors"
                        >
                          Supprimer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
