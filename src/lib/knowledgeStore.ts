// ---------------------------------------------------------------------------
// Store localStorage pour les documents de connaissances uploadés
// Permet d'enrichir la base au fur et à mesure
// ---------------------------------------------------------------------------

const KNOWLEDGE_KEY = 'menuisier_knowledge_docs';
const SEED_FLAG = 'menuisier_knowledge_seeded_v2';

export interface KnowledgeDoc {
  id: string;
  name: string;
  uploadedAt: string;
  /** Résumé textuel extrait du JSON pour injection dans le prompt IA */
  summary: string;
  /** Nombre d'entrées/règles dans le document */
  entryCount: number;
}

function readDocs(): KnowledgeDoc[] {
  try {
    const raw = localStorage.getItem(KNOWLEDGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as KnowledgeDoc[];
  } catch {
    return [];
  }
}

function writeDocs(docs: KnowledgeDoc[]): void {
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify(docs));
}

export function listKnowledgeDocs(): KnowledgeDoc[] {
  return readDocs();
}

export function deleteKnowledgeDoc(id: string): void {
  writeDocs(readDocs().filter((d) => d.id !== id));
}

export function clearAllKnowledgeDocs(): void {
  localStorage.removeItem(KNOWLEDGE_KEY);
}

/**
 * Extrait un résumé lisible d'un JSON de connaissances.
 * Supporte le format de menuiserie_knowledge_base_v1 et tout objet générique.
 */
function extractSummary(data: Record<string, unknown>): { summary: string; entryCount: number } {
  const lines: string[] = [];
  let count = 0;

  // Nom / version
  if (data.nom) lines.push(`Document : ${data.nom}`);
  if (data.version) lines.push(`Version : ${data.version}`);
  if (data.sources) {
    const src = data.sources as Array<{ id?: string; titre?: string }>;
    lines.push(`Sources : ${src.map((s) => s.titre || s.id || '?').join(', ')}`);
  }

  const tables = data.tables as Record<string, unknown[]> | undefined;
  if (tables && typeof tables === 'object') {
    for (const [tableName, entries] of Object.entries(tables)) {
      if (!Array.isArray(entries) || entries.length === 0) continue;
      count += entries.length;
      lines.push(`\n--- ${tableName} (${entries.length} entrées) ---`);

      // Extraire les premiers éléments comme exemples
      const sample = entries.slice(0, 8);
      for (const entry of sample) {
        if (typeof entry !== 'object' || entry === null) continue;
        const e = entry as Record<string, unknown>;

        // Essayer différents formats communs
        if (e.nom && e.description) {
          lines.push(`• ${e.nom}: ${String(e.description).slice(0, 150)}`);
        } else if (e.nom && e.notes) {
          lines.push(`• ${e.nom}: ${String(e.notes).slice(0, 150)}`);
        } else if (e.regle && e.valeur) {
          lines.push(`• ${e.regle}: ${e.valeur}`);
        } else if (e.description) {
          lines.push(`• ${String(e.description).slice(0, 150)}`);
        } else if (e.nom) {
          lines.push(`• ${e.nom}`);
        } else if (e.anomalie && e.causes) {
          lines.push(`• ${e.anomalie}: ${(e.causes as string[]).join(', ').slice(0, 120)}`);
        } else {
          // Fallback: premières propriétés
          const keys = Object.keys(e).filter((k) => k !== 'id' && k !== 'verified' && k !== 'source_refs');
          const parts = keys.slice(0, 3).map((k) => `${k}=${String(e[k]).slice(0, 50)}`);
          if (parts.length > 0) lines.push(`• ${parts.join(', ')}`);
        }
      }
      if (entries.length > 8) {
        lines.push(`  ... et ${entries.length - 8} autres`);
      }
    }
  }

  // Règles métier en format libre (pas dans tables)
  if (data.regles && Array.isArray(data.regles)) {
    count += (data.regles as unknown[]).length;
    lines.push(`\n--- Règles (${(data.regles as unknown[]).length}) ---`);
    for (const r of (data.regles as Array<Record<string, unknown>>).slice(0, 10)) {
      if (r.description) lines.push(`• ${r.description}`);
      else if (r.regle) lines.push(`• ${r.regle}`);
    }
  }

  // Règles métier v2 format (array at top-level)
  if (data.regles_metier && Array.isArray(data.regles_metier)) {
    const rules = data.regles_metier as Array<Record<string, unknown>>;
    count += rules.length;
    lines.push(`\n--- Règles métier (${rules.length}) ---`);
    for (const r of rules.slice(0, 15)) {
      if (r.action) lines.push(`• [${r.id || ''}] ${r.condition} → ${r.action} (${r.niveau || ''})`);
    }
  }

  // V2 structure: deeply nested domains
  const v2Domains = ['essences', 'proprietes_physiques', 'proprietes_mecaniques', 'defauts_et_pathologies',
    'humidite', 'retractabilite', 'sechage', 'durabilite_et_traitements', 'panneaux_derives',
    'formaldehyde', 'debit_et_calepinage', 'assemblages', 'caissons', 'systeme_32',
    'quincailleries', 'machines', 'usinages', 'outils_de_coupe', 'parametres_usinage',
    'securite', 'maintenance'];
  for (const domain of v2Domains) {
    const val = data[domain];
    if (!val || typeof val !== 'object') continue;
    const jsonStr = JSON.stringify(val);
    const entryEstimate = (jsonStr.match(/"nom"/g) || []).length || Math.ceil(jsonStr.length / 500);
    count += entryEstimate;
    lines.push(`\n--- ${domain} ---`);
    // Extract arrays of named objects
    const extractNamed = (obj: unknown, depth = 0): void => {
      if (depth > 2) return;
      if (Array.isArray(obj)) {
        for (const item of obj.slice(0, 5)) {
          if (typeof item === 'object' && item !== null) {
            const o = item as Record<string, unknown>;
            if (o.nom) lines.push(`• ${o.nom}${o.masse_volumique_12_pct_kg_m3 ? ` (${o.masse_volumique_12_pct_kg_m3} kg/m³)` : ''}${o.durabilite_qualitative ? ` — ${o.durabilite_qualitative}` : ''}`);
            else if (o.classe) lines.push(`• Classe ${o.classe}: ${o.destination || o.libelle || o.usage || o.milieu || ''}`);
            else if (o.type) lines.push(`• ${o.type}: ${o.definition || ''}`);
          }
        }
        if (obj.length > 5) lines.push(`  ... et ${obj.length - 5} autres`);
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
            lines.push(`  ${k} (${v.length}):`);
            extractNamed(v, depth + 1);
          } else if (typeof v === 'string' || typeof v === 'number') {
            if (String(v).length < 100) lines.push(`  ${k}: ${v}`);
          }
        }
      }
    };
    extractNamed(val);
  }

  // Formules v2
  if (data.formules && Array.isArray(data.formules)) {
    const formules = data.formules as Array<Record<string, unknown>>;
    count += formules.length;
    lines.push(`\n--- Formules (${formules.length}) ---`);
    for (const f of formules) {
      lines.push(`• ${f.nom}: ${f.formule}`);
    }
  }

  // Fallback pour structure inconnue : résumer les clés top-level
  if (lines.length <= 2) {
    const topKeys = Object.keys(data).filter((k) => !['nom', 'version', 'sources', 'metadata', 'schema_outline'].includes(k));
    for (const key of topKeys.slice(0, 20)) {
      const val = data[key];
      if (Array.isArray(val)) {
        count += val.length;
        lines.push(`${key}: ${val.length} entrées`);
        for (const item of val.slice(0, 3)) {
          if (typeof item === 'object' && item !== null) {
            const s = JSON.stringify(item).slice(0, 200);
            lines.push(`  ${s}`);
          } else {
            lines.push(`  ${String(item).slice(0, 200)}`);
          }
        }
      } else if (typeof val === 'object' && val !== null) {
        lines.push(`${key}: ${JSON.stringify(val).slice(0, 200)}`);
      } else {
        lines.push(`${key}: ${String(val).slice(0, 200)}`);
      }
    }
  }

  return { summary: lines.join('\n'), entryCount: count };
}

/**
 * Importe un fichier JSON de connaissances et l'ajoute au store.
 */
export async function importKnowledgeDoc(file: File): Promise<KnowledgeDoc> {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.json')) {
      reject(new Error('Seuls les fichiers JSON sont acceptés'));
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      reject(new Error('Fichier trop volumineux (max 20 Mo)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result as string;
        const data = JSON.parse(raw) as Record<string, unknown>;
        const { summary, entryCount } = extractSummary(data);

        const doc: KnowledgeDoc = {
          id: Math.random().toString(36).slice(2, 10),
          name: (data.nom as string) || file.name.replace(/\.json$/, ''),
          uploadedAt: new Date().toISOString(),
          summary,
          entryCount,
        };

        const docs = readDocs();
        docs.push(doc);
        writeDocs(docs);

        resolve(doc);
      } catch {
        reject(new Error('Fichier JSON invalide'));
      }
    };
    reader.onerror = () => reject(new Error('Erreur de lecture'));
    reader.readAsText(file);
  });
}

/**
 * Charge automatiquement la base de connaissances v1 depuis public/knowledge/base_v1.json
 * (une seule fois, au premier lancement de l'app).
 */
export async function seedBaseKnowledge(): Promise<void> {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;

    // Charger v2 en priorité, fallback sur v1
    let resp = await fetch('/knowledge/base_v2.json');
    if (!resp.ok) {
      resp = await fetch('/knowledge/base_v1.json');
    }
    if (!resp.ok) return;

    const data = await resp.json();
    const meta = (data as Record<string, unknown>).metadata as Record<string, unknown> | undefined;
    const version = meta?.version as string || '1.0';
    const isV2 = version.startsWith('2');
    const docId = isV2 ? 'base_v2' : 'base_v1';

    const { summary, entryCount } = extractSummary(data as Record<string, unknown>);

    const doc: KnowledgeDoc = {
      id: docId,
      name: meta?.name as string || (data as Record<string, unknown>).nom as string || `Base menuiserie ${version}`,
      uploadedAt: new Date().toISOString(),
      summary,
      entryCount,
    };

    const docs = readDocs();
    // Remplacer l'ancienne base si elle existe
    const filtered = docs.filter((d) => d.id !== 'base_v1' && d.id !== 'base_v2');
    filtered.unshift(doc);
    writeDocs(filtered);

    localStorage.setItem(SEED_FLAG, '1');
  } catch {
    // Silently fail — base knowledge is optional
  }
}

/**
 * Renvoie le contexte combiné de tous les documents uploadés,
 * prêt pour injection dans le prompt IA.
 */
export function buildUserKnowledgeContext(): string {
  const docs = readDocs();
  if (docs.length === 0) return '';

  const parts = docs.map((d) =>
    `=== Document: ${d.name} (${d.entryCount} entrées, ${d.uploadedAt.slice(0, 10)}) ===\n${d.summary}`
  );

  return '\n\n--- CONNAISSANCES UTILISATEUR ---\n' + parts.join('\n\n');
}
