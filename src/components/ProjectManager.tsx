import { useState } from 'react';
import { Panel, ToolbarButton } from '../ui-system';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-overlay)]/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Panel
          title="Mes projets"
          actions={<ToolbarButton onClick={onClose}>Fermer</ToolbarButton>}
          className="max-h-[85vh] overflow-hidden"
        >
          <div className="space-y-3">
            <ToolbarButton variant="primary" onClick={onNew} className="w-full">
              Nouveau projet
            </ToolbarButton>

            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {sorted.length === 0 ? (
                <p className="text-center text-[color:var(--fg-muted)] py-8">Aucun projet sauvegardé</p>
              ) : (
                sorted.map((project) => {
                  const isCurrent = project.id === currentId;
                  const isRenaming = renamingId === project.id;
                  const isDeleting = deletingId === project.id;

                  return (
                    <div
                      key={project.id}
                      className={`border p-3 ${
                        isCurrent
                          ? 'border-[color:var(--accent)] bg-[color:var(--accent-bg)]'
                          : 'border-[color:var(--border-weak)] bg-[color:var(--bg-panel)]'
                      }`}
                    >
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
                                className="inp flex-1"
                              />
                              <ToolbarButton onClick={() => confirmRename(project.id)}>OK</ToolbarButton>
                              <ToolbarButton onClick={cancelRename}>Annuler</ToolbarButton>
                            </div>
                          ) : (
                            <button
                              onClick={() => onLoad(project.id)}
                              className="text-[13px] font-semibold text-[color:var(--fg)] hover:text-[color:var(--fg)] truncate block text-left"
                            >
                              {project.name}
                            </button>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="shrink-0 text-[10.5px] uppercase tracking-[0.08em] text-[color:var(--accent)]">
                            Actif
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex items-center gap-3 text-[12px] text-[color:var(--fg-muted)]">
                        <span>{project.materialShort}</span>
                        <span>·</span>
                        <span>{project.bodyCount} corps</span>
                        <span>·</span>
                        <span>{formatDate(project.updatedAt)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {isDeleting ? (
                          <>
                            <span className="text-[12px] text-[color:var(--alert)] mr-1">Confirmer ?</span>
                            <ToolbarButton onClick={() => confirmDelete(project.id)}>Supprimer</ToolbarButton>
                            <ToolbarButton onClick={cancelDelete}>Annuler</ToolbarButton>
                          </>
                        ) : (
                          <>
                            <ToolbarButton onClick={() => onDuplicate(project.id)}>Dupliquer</ToolbarButton>
                            <ToolbarButton onClick={() => startRename(project.id, project.name)}>Renommer</ToolbarButton>
                            <ToolbarButton onClick={() => startDelete(project.id)}>Supprimer</ToolbarButton>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
