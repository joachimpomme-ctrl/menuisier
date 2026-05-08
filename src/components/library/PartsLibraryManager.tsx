import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import type { StandardPart, StandardPartCategory, UserPartsLibrary } from '../../lib/knowledge/types';
import {
  getAllParts,
  getLibrary,
  replaceLibrary,
  addPart,
  updatePart,
  deletePart,
  exportLibrary,
  exportLibraryCsv,
  importLibrary,
  resetLibrary,
} from '../../lib/partsLibrary';
import { scrapeProductFromUrl } from '../../lib/scrapeProduct';
import { isCloudConfigured, cloudLoadLibrary, cloudSaveLibrary } from '../../lib/cloudSync';
import PartForm from './PartForm';

type SyncState =
  | { kind: 'idle' }
  | { kind: 'pulling' }
  | { kind: 'pushing' }
  | { kind: 'synced'; at: string }
  | { kind: 'error'; msg: string }
  | { kind: 'offline' };

function formatRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 60_000) return 'à l’instant';
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<StandardPartCategory, string> = {
  shelf: 'Tablette',
  side_panel: 'Joue',
  door: 'Porte',
  drawer_front: 'Façade tiroir',
  back_panel: 'Fond',
  top_bottom: 'Dessus/dessous',
  divider: 'Séparateur',
  custom: 'Autre',
  hinge: 'Charnière',
  slide: 'Glissière',
  screw: 'Vis',
  dowel: 'Tourillon',
  handle: 'Poignée',
  bracket: 'Équerre',
  edge_band: 'Chant',
  foot: 'Pied',
};

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatPrice(p: StandardPart): string {
  if (p.price_eur === undefined) return '—';
  const currency = p.currency ?? 'EUR';
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${p.price_eur.toFixed(2)} ${symbol}`;
}

function formatDims(p: StandardPart): string {
  const dims = [p.length_mm, p.width_mm, p.thickness_mm].filter((d) => d !== undefined);
  if (dims.length === 0) return '—';
  return dims.map((d) => d).join('×');
}

export default function PartsLibraryManager({ isOpen, onClose }: Props) {
  const [parts, setParts] = useState<StandardPart[]>(() => getAllParts());
  const [editing, setEditing] = useState<StandardPart | null>(null);
  const [adding, setAdding] = useState(false);
  const [prefill, setPrefill] = useState<Partial<StandardPart> | null>(null);
  const [importMsg, setImportMsg] = useState('');
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeBusy, setScrapeBusy] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);
  const [filterMerchant, setFilterMerchant] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [syncState, setSyncState] = useState<SyncState>({ kind: 'idle' });
  const importRef = useRef<HTMLInputElement>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedJsonRef = useRef<string | null>(null);

  const cloudOn = isCloudConfigured();

  const refresh = () => setParts(getAllParts());

  // -------- Cloud sync : pull on open, debounced push on change --------

  const pushLibrary = useCallback(async () => {
    if (!isCloudConfigured()) return;
    const lib = getLibrary();
    const json = JSON.stringify(lib);
    if (json === lastPushedJsonRef.current) return; // pas de delta
    setSyncState({ kind: 'pushing' });
    try {
      const res = await cloudSaveLibrary(json);
      lastPushedJsonRef.current = json;
      setSyncState({ kind: 'synced', at: res.updatedAt });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'sync KO';
      setSyncState({ kind: 'error', msg });
    }
  }, []);

  const queuePush = useCallback(() => {
    if (!isCloudConfigured()) return;
    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      void pushLibrary();
    }, 800);
  }, [pushLibrary]);

  // Pull au montage
  useEffect(() => {
    if (!isOpen) return;
    if (!isCloudConfigured()) {
      setSyncState({ kind: 'offline' });
      return;
    }
    let cancelled = false;
    (async () => {
      setSyncState({ kind: 'pulling' });
      try {
        const cloud = await cloudLoadLibrary();
        if (cancelled) return;
        const local = getLibrary();
        if (cloud.json) {
          const cloudLib = JSON.parse(cloud.json) as UserPartsLibrary;
          const cloudUpdated = new Date(cloudLib.updated_at ?? 0).getTime();
          const localUpdated = new Date(local.updated_at ?? 0).getTime();
          if (cloudUpdated > localUpdated) {
            replaceLibrary(cloudLib);
            lastPushedJsonRef.current = JSON.stringify(cloudLib);
            setParts(cloudLib.parts);
          } else {
            lastPushedJsonRef.current = JSON.stringify(local);
          }
        } else {
          // Premier sync : push le local
          lastPushedJsonRef.current = null;
          await pushLibrary();
          return;
        }
        const at = cloud.updatedAt ?? new Date().toISOString();
        setSyncState({ kind: 'synced', at });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'pull KO';
        setSyncState({ kind: 'error', msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, pushLibrary]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
        pushTimerRef.current = null;
      }
    };
  }, []);

  // Listes uniques pour les filtres
  const merchants = useMemo(() => {
    const set = new Set<string>();
    for (const p of parts) {
      if (p.merchant) set.add(p.merchant);
    }
    return Array.from(set).sort();
  }, [parts]);

  const visibleParts = useMemo(() => {
    return parts.filter((p) => {
      if (filterMerchant && p.merchant !== filterMerchant) return false;
      if (filterCategory && p.category !== filterCategory) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const haystack = `${p.name} ${p.merchant ?? ''} ${p.merchant_ref ?? ''} ${p.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [parts, filterMerchant, filterCategory, searchText]);

  const handleAdd = (data: Omit<StandardPart, 'id' | 'source'>) => {
    addPart(data);
    setAdding(false);
    setPrefill(null);
    refresh();
    queuePush();
  };

  const handleUpdate = (data: Omit<StandardPart, 'id' | 'source'>) => {
    if (editing) {
      updatePart(editing.id, data);
      setEditing(null);
      refresh();
      queuePush();
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette pièce de la bibliothèque ?')) return;
    deletePart(id);
    refresh();
    queuePush();
  };

  const handleExportJson = () => {
    downloadFile(exportLibrary(), 'pieces-standard.json', 'application/json');
  };

  const handleExportCsv = () => {
    downloadFile(exportLibraryCsv(), 'pieces-standard.csv', 'text/csv;charset=utf-8');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const count = importLibrary(text);
      setImportMsg(`${count} pièce${count > 1 ? 's' : ''} importée${count > 1 ? 's' : ''}`);
      refresh();
      queuePush();
    } catch {
      setImportMsg('Erreur d\'import');
    }
    e.target.value = '';
    setTimeout(() => setImportMsg(''), 3000);
  };

  const handleReset = () => {
    if (!confirm('Réinitialiser la bibliothèque ? Toutes tes pièces personnalisées seront perdues.')) return;
    resetLibrary();
    refresh();
    queuePush();
  };

  const handleScrape = async () => {
    const url = scrapeUrl.trim();
    if (!url) return;
    setScrapeBusy(true);
    setScrapeError(null);
    try {
      const part = await scrapeProductFromUrl(url);
      // Préremplit le formulaire avec les données scrapées
      setPrefill(part);
      setAdding(true);
      setEditing(null);
      setScrapeUrl('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Échec du scrape';
      setScrapeError(msg);
    } finally {
      setScrapeBusy(false);
    }
  };

  const handleRefreshPrices = async () => {
    const candidates = parts.filter((p) => !!p.url);
    if (candidates.length === 0) {
      setRefreshMsg('Aucune pièce avec URL — rien à rafraîchir.');
      setTimeout(() => setRefreshMsg(null), 3000);
      return;
    }
    if (!confirm(`Rafraîchir ${candidates.length} pièce${candidates.length > 1 ? 's' : ''} ? Cela peut prendre quelques secondes et coûte ~${(candidates.length * 0.01).toFixed(2)}€ d'API.`)) {
      return;
    }
    setRefreshBusy(true);
    setRefreshMsg(`Rafraîchissement 0/${candidates.length}…`);
    let ok = 0;
    let errs = 0;
    for (let i = 0; i < candidates.length; i++) {
      const p = candidates[i];
      setRefreshMsg(`Rafraîchissement ${i + 1}/${candidates.length}…`);
      try {
        const fresh = await scrapeProductFromUrl(p.url!);
        const updates: Partial<StandardPart> = {};
        if (fresh.price_eur !== undefined) updates.price_eur = fresh.price_eur;
        if (fresh.currency) updates.currency = fresh.currency;
        if (fresh.image_url) updates.image_url = fresh.image_url;
        if (fresh.merchant) updates.merchant = fresh.merchant;
        if (fresh.merchant_ref) updates.merchant_ref = fresh.merchant_ref;
        updates.last_checked_at = new Date().toISOString();
        updatePart(p.id, updates);
        ok++;
      } catch {
        errs++;
      }
    }
    refresh();
    setRefreshMsg(`${ok} OK, ${errs} erreur${errs > 1 ? 's' : ''}.`);
    setRefreshBusy(false);
    queuePush();
    setTimeout(() => setRefreshMsg(null), 5000);
  };

  const handleManualSync = async () => {
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = null;
    }
    await pushLibrary();
  };

  if (!isOpen) return null;

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    setPrefill(null);
  };

  const formInitial = editing ?? (prefill as StandardPart | null) ?? undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EFE8DD] gap-3">
          <h3 className="text-base font-semibold text-[#0E0D0C]">Ma bibliothèque de pièces</h3>
          <div className="flex items-center gap-2 ml-auto">
            {cloudOn && (
              <button
                onClick={handleManualSync}
                disabled={syncState.kind === 'pushing' || syncState.kind === 'pulling'}
                className="text-[11px] px-2 py-1 rounded-md border border-[#EFE8DD] hover:bg-[#FFFCF7] disabled:opacity-50 flex items-center gap-1.5"
                title="Forcer la synchronisation cloud"
              >
                {syncState.kind === 'pulling' && <span className="text-[#3B5FFF]">⟳ Récupération…</span>}
                {syncState.kind === 'pushing' && <span className="text-[#3B5FFF]">⟳ Envoi…</span>}
                {syncState.kind === 'synced' && (
                  <span className="text-[#0E5A3D]">☁ Synchro {formatRelativeTime(syncState.at)}</span>
                )}
                {syncState.kind === 'error' && (
                  <span className="text-[#A52E16]" title={syncState.msg}>⚠ Erreur sync</span>
                )}
                {syncState.kind === 'idle' && <span className="text-[#9A968F]">☁ Cloud</span>}
              </button>
            )}
            {!cloudOn && (
              <span className="text-[11px] text-[#9A968F]" title="Active la sync cloud dans le menu ⋯">
                ☁ local seulement
              </span>
            )}
            <button onClick={onClose} className="text-[#9A968F] hover:text-[#0E0D0C] text-2xl leading-none px-2">×</button>
          </div>
        </div>

        {/* Scrape URL */}
        <div className="px-5 py-3 border-b border-[#EFE8DD] bg-[#FFFCF7]">
          <label className="block text-[11px] uppercase tracking-widest text-[#9A968F] font-semibold mb-1.5">
            Importer depuis une fiche produit
          </label>
          <div className="flex gap-2 flex-wrap">
            <input
              type="url"
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !scrapeBusy) handleScrape(); }}
              className="flex-1 min-w-[240px] border border-[#EFE8DD] rounded-lg px-3 py-2 text-sm bg-white text-[#0E0D0C] placeholder-[#9A968F] focus:border-[#3B5FFF] focus:outline-none focus:ring-2 focus:ring-[#3B5FFF]/20"
              placeholder="https://www.leroymerlin.fr/produits/..."
              disabled={scrapeBusy}
            />
            <button
              onClick={handleScrape}
              disabled={scrapeBusy || !scrapeUrl.trim()}
              className="text-sm px-4 py-2 bg-[#3B5FFF] text-white rounded-lg hover:bg-[#1E3FCC] font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {scrapeBusy ? 'Analyse…' : 'Analyser'}
            </button>
          </div>
          {scrapeError && (
            <div className="mt-2 text-xs text-[#A52E16] bg-[#FFE4DC] border border-[#FF6B4A] rounded px-2.5 py-1.5">
              {scrapeError}
            </div>
          )}
          <p className="text-[11px] text-[#9A968F] mt-1.5">
            Colle l'URL d'un produit (Leroy Merlin, Castorama, Manomano…). L'IA extrait nom, prix, dimensions, référence.
          </p>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-[#EFE8DD] flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setAdding(true); setEditing(null); setPrefill(null); }}
            className="text-xs px-3 py-1.5 bg-[#3B5FFF] text-white rounded-lg hover:bg-[#1E3FCC] font-semibold"
          >
            + Saisie manuelle
          </button>
          <button
            onClick={handleExportJson}
            className="text-xs px-3 py-1.5 border border-[#EFE8DD] text-[#54514E] rounded-lg hover:bg-[#FFFCF7]"
          >
            Export JSON
          </button>
          <button
            onClick={handleExportCsv}
            className="text-xs px-3 py-1.5 border border-[#EFE8DD] text-[#54514E] rounded-lg hover:bg-[#FFFCF7]"
          >
            Export CSV
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs px-3 py-1.5 border border-[#EFE8DD] text-[#54514E] rounded-lg hover:bg-[#FFFCF7]"
          >
            Importer JSON
          </button>
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={handleRefreshPrices}
            disabled={refreshBusy}
            className="text-xs px-3 py-1.5 border border-[#3B5FFF] text-[#3B5FFF] rounded-lg hover:bg-[#E5EAFF] disabled:opacity-50"
            title="Re-scrape les pièces avec une URL pour mettre à jour leur prix"
          >
            {refreshBusy ? 'Rafraîchissement…' : 'Rafraîchir prix'}
          </button>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 border border-[#FF6B4A] text-[#FF6B4A] rounded-lg hover:bg-[#FFE4DC] ml-auto"
          >
            Réinitialiser
          </button>
          {importMsg && (
            <span className="text-xs text-[#0E5A3D]">{importMsg}</span>
          )}
          {refreshMsg && (
            <span className="text-xs text-[#54514E] w-full mt-1">{refreshMsg}</span>
          )}
        </div>

        {/* Filters */}
        <div className="px-5 py-2.5 border-b border-[#EFE8DD] flex items-center gap-2 flex-wrap text-xs bg-white">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Recherche (nom, marchand, ref, notes)"
            className="flex-1 min-w-[180px] border border-[#EFE8DD] rounded-lg px-2.5 py-1.5 bg-white text-[#0E0D0C] placeholder-[#9A968F] focus:border-[#3B5FFF] focus:outline-none focus:ring-2 focus:ring-[#3B5FFF]/20"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-[#EFE8DD] rounded-lg px-2 py-1.5 bg-white text-[#0E0D0C]"
          >
            <option value="">Toutes catégories</option>
            <optgroup label="Panneaux">
              <option value="shelf">Tablette</option>
              <option value="side_panel">Joue</option>
              <option value="door">Porte</option>
              <option value="drawer_front">Façade tiroir</option>
              <option value="back_panel">Fond</option>
              <option value="top_bottom">Dessus/dessous</option>
              <option value="divider">Séparateur</option>
              <option value="custom">Autre panneau</option>
            </optgroup>
            <optgroup label="Quincaillerie">
              <option value="hinge">Charnière</option>
              <option value="slide">Glissière</option>
              <option value="screw">Vis</option>
              <option value="dowel">Tourillon</option>
              <option value="handle">Poignée</option>
              <option value="bracket">Équerre</option>
              <option value="edge_band">Chant</option>
              <option value="foot">Pied</option>
            </optgroup>
          </select>
          <select
            value={filterMerchant}
            onChange={(e) => setFilterMerchant(e.target.value)}
            className="border border-[#EFE8DD] rounded-lg px-2 py-1.5 bg-white text-[#0E0D0C]"
            disabled={merchants.length === 0}
          >
            <option value="">Tous marchands</option>
            {merchants.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {(filterCategory || filterMerchant || searchText) && (
            <button
              onClick={() => { setFilterCategory(''); setFilterMerchant(''); setSearchText(''); }}
              className="text-[#3B5FFF] hover:text-[#1E3FCC] underline"
            >
              Réinitialiser filtres
            </button>
          )}
        </div>

        {/* Form (add/edit) */}
        {(adding || editing) && (
          <div className="px-5 py-4 border-b border-[#EFE8DD] bg-[#FFFCF7]">
            {prefill && adding && (
              <div className="mb-3 text-xs bg-[#E5EAFF] border border-[#3B5FFF] text-[#3B5FFF] rounded px-2.5 py-1.5">
                ✨ Données extraites depuis l'URL — vérifie et complète si besoin avant d'ajouter.
              </div>
            )}
            <PartForm
              initial={formInitial}
              onSave={editing ? handleUpdate : handleAdd}
              onCancel={closeForm}
            />
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {visibleParts.length === 0 ? (
            <p className="text-sm text-[#9A968F] text-center py-8">
              {parts.length === 0 ? 'Bibliothèque vide' : 'Aucune pièce ne correspond aux filtres'}
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#EFE8DD] text-left text-[#54514E] text-xs uppercase tracking-widest">
                  <th className="py-2 pr-2 font-semibold w-10"></th>
                  <th className="py-2 pr-2 font-semibold">Nom</th>
                  <th className="py-2 pr-2 font-semibold">Cat.</th>
                  <th className="py-2 pr-2 font-semibold tabular-nums">Dim.</th>
                  <th className="py-2 pr-2 font-semibold">Marchand</th>
                  <th className="py-2 pr-2 font-semibold tabular-nums text-right">Prix</th>
                  <th className="py-2 font-semibold w-20"></th>
                </tr>
              </thead>
              <tbody>
                {visibleParts.map((p) => (
                  <tr key={p.id} className="border-b border-[#EFE8DD] hover:bg-[#FFFCF7]">
                    <td className="py-2 pr-2">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-8 w-8 rounded border border-[#EFE8DD] object-cover"
                          loading="lazy"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                        />
                      ) : (
                        <div className="h-8 w-8 rounded border border-[#EFE8DD] bg-[#FFFCF7]" aria-hidden />
                      )}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col">
                        <span className="text-[#0E0D0C] truncate max-w-[260px]" title={p.name}>{p.name}</span>
                        {p.merchant_ref && (
                          <span className="text-[10px] text-[#9A968F] font-mono">{p.merchant_ref}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-[#54514E] text-xs">
                      {CATEGORY_LABELS[p.category]}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-[#54514E] text-xs whitespace-nowrap">
                      {formatDims(p)}
                    </td>
                    <td className="py-2 pr-2 text-[#54514E] text-xs">
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3B5FFF] hover:text-[#1E3FCC] hover:underline"
                          title={p.url}
                        >
                          {p.merchant ?? 'Lien'} ↗
                        </a>
                      ) : (
                        p.merchant ?? '—'
                      )}
                    </td>
                    <td className="py-2 pr-2 tabular-nums text-right text-xs text-[#0E0D0C] font-medium whitespace-nowrap">
                      {formatPrice(p)}
                      {p.pack_qty && p.pack_qty > 1 && (
                        <span className="block text-[10px] text-[#9A968F]">/ lot {p.pack_qty}</span>
                      )}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => { setEditing(p); setAdding(false); setPrefill(null); }}
                        className="text-xs text-[#3B5FFF] hover:text-[#1E3FCC] mr-2"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-xs text-[#FF6B4A] hover:text-[#A52E16]"
                        aria-label="Supprimer"
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
        <div className="px-5 py-3 border-t border-[#EFE8DD] text-xs text-[#9A968F] flex items-center justify-between">
          <span>
            {visibleParts.length} pièce{visibleParts.length !== 1 ? 's' : ''} affichée{visibleParts.length !== 1 ? 's' : ''}
            {visibleParts.length !== parts.length && ` sur ${parts.length}`}
          </span>
        </div>
      </div>
    </div>
  );
}
