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
        className="w-full max-w-lg mx-4 max-h-[85vh] flex flex-col bg-white border border-[#EFE8DD] rounded-xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFE8DD]">
          <h2 className="text-lg font-semibold text-[#0E0D0C]">Mes projets</h2>
          <button
            onClick={onClose}
            className="text-[#54514E] hover:text-[#0E0D0C] text-2xl leading-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* New project button */}
        <div className="px-6 pt-4">
          <button
            onClick={onNew}
            className="w-full py-2.5 rounded-lg bg-[#3B5FFF] hover:bg-[#1E3FCC] text-white font-medium transition-colors"
          >
            Nouveau projet
          </button>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {sorted.length === 0 ? (
            <p className="text-center text-[#54514E] py-8">Aucun projet sauvegard&eacute;</p>
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
                      ? 'border-[#3B5FFF]/50 bg-[#EFE8DD]'
                      : 'border-[#EFE8DD] bg-white/40 hover:bg-white/70'
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
                            className="flex-1 px-2 py-1 rounded-md bg-[#EFE8DD] border border-[#EFE8DD] text-[#0E0D0C] text-sm focus:outline-none focus:border-[#3B5FFF]"
                          />
                          <button
                            onClick={() => confirmRename(project.id)}
                            className="text-xs text-[#3B5FFF] hover:text-[#1E3FCC] font-medium transition-colors"
                          >
                            OK
                          </button>
                          <button
                            onClick={cancelRename}
                            className="text-xs text-[#54514E] hover:text-[#9A968F] transition-colors"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onLoad(project.id)}
                          className="text-sm font-bold text-[#0E0D0C] hover:text-[#3B5FFF] transition-colors truncate block text-left"
                        >
                          {project.name}
                        </button>
                      )}
                    </div>
                    {isCurrent && (
                      <span className="shrink-0 flex items-center gap-1.5 text-xs text-[#3B5FFF]">
                        <span className="w-2 h-2 rounded-full bg-[#3B5FFF]" />
                        Actif
                      </span>
                    )}
                  </div>

                  {/* Details row */}
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-[#54514E]">
                    <span>{project.materialShort}</span>
                    <span className="text-[#9A968F]">&middot;</span>
                    <span>{project.bodyCount} corps</span>
                    <span className="text-[#9A968F]">&middot;</span>
                    <span>{formatDate(project.updatedAt)}</span>
                  </div>

                  {/* Actions row */}
                  <div className="mt-3 flex items-center gap-2">
                    {isDeleting ? (
                      <>
                        <span className="text-xs text-[#FF6B4A] mr-1">Confirmer ?</span>
                        <button
                          onClick={() => confirmDelete(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#A52E16]/20 text-[#FF6B4A] hover:bg-[#A52E16]/30 transition-colors"
                        >
                          Supprimer
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="text-xs px-2.5 py-1 rounded-md text-[#54514E] hover:text-[#9A968F] transition-colors"
                        >
                          Annuler
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onDuplicate(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#EFE8DD]/50 text-[#9A968F] hover:bg-[#EFE8DD] transition-colors"
                        >
                          Dupliquer
                        </button>
                        <button
                          onClick={() => startRename(project.id, project.name)}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#EFE8DD]/50 text-[#9A968F] hover:bg-[#EFE8DD] transition-colors"
                        >
                          Renommer
                        </button>
                        <button
                          onClick={() => startDelete(project.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-[#EFE8DD]/50 text-[#FF6B4A] hover:bg-[#A52E16]/20 transition-colors"
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
