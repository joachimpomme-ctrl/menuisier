import { useState, useEffect, useRef } from 'react';
import type { AppState, ProjectMeta } from '../types';
import {
  getCloudUrl,
  setCloudUrl,
  isCloudConfigured,
  cloudList,
  cloudSave,
  cloudLoad,
  pushAllToCloud,
} from '../lib/cloudSync';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Current project */
  projectId: string;
  state: AppState;
  /** All local projects */
  localProjects: ProjectMeta[];
  /** Load local state by id */
  loadLocal: (id: string) => AppState | null;
  /** Called when a project is pulled from cloud */
  onPull: (id: string, state: AppState) => void;
}

const cardClass = 'rounded-xl border border-stone-200 bg-white p-4';

export default function CloudSync({
  isOpen,
  onClose,
  projectId,
  state,
  localProjects,
  loadLocal,
  onPull,
}: Props) {
  const [url, setUrl] = useState(getCloudUrl() ?? '');
  const [configured, setConfigured] = useState(isCloudConfigured());
  const [cloudProjects, setCloudProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const urlRef = useRef<HTMLInputElement>(null);

  // Load cloud projects when modal opens and URL is configured
  useEffect(() => {
    if (isOpen && configured) {
      refreshCloud();
    }
  }, [isOpen, configured]);

  const refreshCloud = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await cloudList();
      setCloudProjects(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
      setCloudProjects([]);
    }
    setLoading(false);
  };

  const handleSaveUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setCloudUrl(null);
      setConfigured(false);
      setCloudProjects([]);
      setSuccess('URL supprimée');
      return;
    }
    if (!trimmed.startsWith('https://script.google.com/')) {
      setError("L'URL doit commencer par https://script.google.com/");
      return;
    }
    setCloudUrl(trimmed);
    setConfigured(true);
    setError(null);
    setSuccess('URL enregistrée');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handlePushCurrent = async () => {
    setSyncing(true);
    setError(null);
    try {
      await cloudSave(projectId, state);
      setSuccess('Projet envoyé dans le cloud');
      await refreshCloud();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
    setSyncing(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handlePushAll = async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await pushAllToCloud(localProjects, loadLocal);
      setSuccess(`${result.ok} projet(s) envoyé(s)${result.errors ? `, ${result.errors} erreur(s)` : ''}`);
      await refreshCloud();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
    setSyncing(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handlePull = async (id: string) => {
    setSyncing(true);
    setError(null);
    try {
      const loaded = await cloudLoad(id);
      onPull(id, loaded);
      setSuccess(`Projet "${loaded.project.name}" chargé`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
    setSyncing(false);
    setTimeout(() => setSuccess(null), 3000);
  };

  if (!isOpen) return null;

  const localIds = new Set(localProjects.map((p) => p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-stone-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h3 className="text-amber-700 font-bold text-sm">☁️ Cloud — Google Sheets</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Sync tes projets entre appareils via Google Apps Script
            </p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-400 text-lg px-2">
            x
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* URL Config */}
          <div className={cardClass}>
            <label className="text-xs font-medium text-stone-600 block mb-1.5">
              URL du script Google Apps Script
            </label>
            <div className="flex gap-2">
              <input
                ref={urlRef}
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/xxx/exec"
                className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 placeholder-stone-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                onClick={handleSaveUrl}
                className="text-xs px-3 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-500 transition-colors"
              >
                OK
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1.5">
              Voir le fichier <code className="bg-stone-100 px-1 rounded">google-apps-script.js</code> pour l'installation
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          {configured && (
            <>
              {/* Push actions */}
              <div className="flex gap-2">
                <button
                  onClick={handlePushCurrent}
                  disabled={syncing}
                  className="flex-1 text-xs px-3 py-2.5 rounded-lg bg-amber-50 text-amber-700 font-medium border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                >
                  {syncing ? '...' : '⬆ Envoyer ce projet'}
                </button>
                <button
                  onClick={handlePushAll}
                  disabled={syncing}
                  className="flex-1 text-xs px-3 py-2.5 rounded-lg bg-stone-50 text-stone-600 font-medium border border-stone-200 hover:bg-stone-100 disabled:opacity-50 transition-colors"
                >
                  {syncing ? '...' : '⬆ Tout envoyer'}
                </button>
              </div>

              {/* Cloud projects */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-stone-500">
                    Projets dans le cloud {loading ? '...' : `(${cloudProjects.length})`}
                  </h4>
                  <button
                    onClick={refreshCloud}
                    disabled={loading}
                    className="text-[10px] text-stone-400 hover:text-stone-600"
                  >
                    Rafraîchir
                  </button>
                </div>

                {cloudProjects.length === 0 && !loading && (
                  <p className="text-xs text-stone-400 text-center py-4">
                    Aucun projet dans le cloud — envoie-en un !
                  </p>
                )}

                <div className="space-y-2">
                  {cloudProjects.map((cp) => {
                    const isLocal = localIds.has(cp.id);
                    return (
                      <div key={cp.id} className={cardClass + ' flex items-center justify-between gap-2'}>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-stone-700 font-medium truncate">{cp.name}</div>
                          <div className="text-[10px] text-stone-400">
                            {cp.materialShort} · {cp.bodyCount} corps · {cp.updatedAt?.slice(0, 10)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {isLocal && (
                            <span className="text-[9px] text-green-500 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                              local
                            </span>
                          )}
                          <button
                            onClick={() => handlePull(cp.id)}
                            disabled={syncing}
                            className="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 transition-colors"
                          >
                            ⬇ Charger
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {!configured && (
            <div className="text-center py-6">
              <p className="text-sm text-stone-500 mb-3">
                Configure l'URL de ton Google Apps Script pour commencer
              </p>
              <ol className="text-xs text-stone-400 text-left space-y-1.5 max-w-sm mx-auto">
                <li>1. Crée un Google Sheet "Menuisier"</li>
                <li>2. Extensions → Apps Script</li>
                <li>3. Colle le code de <code className="bg-stone-100 px-1 rounded">google-apps-script.js</code></li>
                <li>4. Déployer → Application Web → "Tout le monde"</li>
                <li>5. Colle l'URL ci-dessus</li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 text-[10px] text-stone-400">
          Le localStorage reste la source principale — le cloud est un backup/sync.
        </div>
      </div>
    </div>
  );
}
