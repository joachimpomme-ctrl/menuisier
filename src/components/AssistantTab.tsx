import { useState, useRef, useEffect } from 'react';
import type { AppState, ChatMessage, UploadedPdf, ValidationResult, PieceWithBody } from '../types';
import { MATERIALS } from '../data/materials';
import { listKnowledgeDocs } from '../lib/knowledgeStore';
import { analyzeProject } from '../lib/projectAnalysis';
import { buildAIContext } from '../lib/ai/buildContext';
import KnowledgeManager from './KnowledgeManager';
import Tip from './Tip';
import TIPS from '../data/tips';

/** Max chars of user knowledge injected into the system prompt */
const MAX_KNOWLEDGE_CHARS = 3000;

interface Props {
  state: AppState;
  validation: ValidationResult;
  allPieces: PieceWithBody[];
  totalPieces: number;
  panelCount: number;
  projectId: string;
}

const CHAT_KEY_PREFIX = 'menuisier_chat_';

function loadChat(projectId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_KEY_PREFIX + projectId);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChat(projectId: string, messages: ChatMessage[]): void {
  try {
    if (messages.length === 0) {
      localStorage.removeItem(CHAT_KEY_PREFIX + projectId);
    } else {
      localStorage.setItem(CHAT_KEY_PREFIX + projectId, JSON.stringify(messages));
    }
  } catch {
    // ignore quota errors
  }
}

interface UploadedImage {
  name: string;
  data: string; // base64
  mediaType: string; // image/jpeg, image/png, etc.
  preview: string; // data URL for thumbnail
}

const cardClass = "rounded-2xl border border-stone-200 bg-white  p-4 mb-4";
const inputClass = "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-800 placeholder-stone-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-colors";

export default function AssistantTab({ state, validation, allPieces, totalPieces: _totalPieces, panelCount: _panelCount, projectId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(projectId));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [kbVersion, setKbVersion] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reload chat when switching projects
  useEffect(() => {
    setMessages(loadChat(projectId));
  }, [projectId]);

  // Persist chat per project
  useEffect(() => {
    saveChat(projectId, messages);
  }, [projectId, messages]);

  const handlePdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('PDF trop volumineux (max 10 Mo)');
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPdfs((prev) => [...prev, { name: file.name, data: base64 }]);
      setError(null);
    } catch {
      setError('Erreur de lecture du PDF');
    }
    e.target.value = '';
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > 15 * 1024 * 1024) {
        setError(`Image trop volumineuse : ${file.name} (max 15 Mo)`);
        continue;
      }

      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError(`Format non supporté : ${file.name}. Utilisez JPG, PNG, GIF ou WebP.`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64 = dataUrl.split(',')[1];
        const mediaType = file.type;

        setImages((prev) => [...prev, {
          name: file.name,
          data: base64,
          mediaType,
          preview: dataUrl,
        }]);
        setError(null);
      } catch {
        setError(`Erreur de lecture : ${file.name}`);
      }
    }
    e.target.value = '';
  };

  // kbVersion in deps ensures re-render when user adds/removes docs
  const kbDocs = listKnowledgeDocs();
  const kbDocCount = kbDocs.length + 0 * kbVersion;

  // --- Build filtered user knowledge, capped at MAX_KNOWLEDGE_CHARS ---
  const buildFilteredUserKnowledge = (): string => {
    if (kbDocs.length === 0) return '';

    const materialName = mat.name.toLowerCase();
    const materialShort = mat.short.toLowerCase();
    const materialKeywords: string[] = [materialName, materialShort];
    if (materialName.includes('contreplaqué') || materialShort.includes('cp')) materialKeywords.push('contreplaqué', 'cp');
    if (state.materialKey === 'mdf') materialKeywords.push('mdf', 'medium');
    if (state.materialKey === 'melamine') materialKeywords.push('mélaminé', 'melamine', 'aggloméré');
    if (state.materialKey === 'osb') materialKeywords.push('osb');

    const allMats = ['contreplaqué', 'mdf', 'mélaminé', 'melamine', 'osb', 'aggloméré'];

    let totalLen = 0;
    const parts: string[] = [];

    for (const d of kbDocs) {
      const lo = (d.summary + d.name).toLowerCase();
      const mentionsMaterial = materialKeywords.some(kw => lo.includes(kw));
      const mentionsOther = allMats.some(m => lo.includes(m)) && !mentionsMaterial;
      if (mentionsOther) continue; // skip docs about other materials

      // Truncate individual doc summary to fit budget
      const budget = MAX_KNOWLEDGE_CHARS - totalLen;
      if (budget <= 100) break; // no room left
      const summary = d.summary.length > budget ? d.summary.slice(0, budget) + '…' : d.summary;
      parts.push(`[${d.name}] ${summary}`);
      totalLen += summary.length + d.name.length + 4;
    }

    if (parts.length === 0) return '';
    return '\n\nConnaissances utilisateur:\n' + parts.join('\n');
  };

  const buildSystemPrompt = (): string => {
    const analysis = analyzeProject(state);
    const aiContext = buildAIContext(state, analysis);
    const userKnowledge = buildFilteredUserKnowledge();

    const extras: string[] = [];

    if (images.length > 0) {
      extras.push(`${images.length} photo(s) jointes — analyse dimensions, assemblages, défauts.`);
    }

    // Only include validation summary if there are issues
    if (validation.errors.length > 0 || validation.warnings.length > 0) {
      const items = [
        ...validation.errors.map(e => '❌ ' + e),
        ...validation.warnings.map(w => '⚠ ' + w),
      ];
      extras.push(`Validation: ${items.join(' | ')}`);
    }

    if (pdfs.length > 0) {
      extras.push(`${pdfs.length} PDF fournis.`);
    }

    if (userKnowledge) {
      extras.push(userKnowledge);
    }

    return aiContext.systemPrompt + (extras.length > 0 ? '\n\n' + extras.join('\n') : '');
  };

  // --- Lot 5.1: Payload size warning ---
  const estimateTokens = (): number => {
    const systemTokens = Math.ceil(buildSystemPrompt().length / 4);
    const messagesTokens = Math.ceil(
      messages.reduce((sum, m) => sum + m.content.length, 0) / 4
    );
    const inputTokens = Math.ceil(input.length / 4);
    return systemTokens + messagesTokens + inputTokens;
  };

  const estimatedTokens = estimateTokens();
  const tokenWarningLevel: 'none' | 'yellow' | 'red' =
    estimatedTokens > 15000 ? 'red' :
    estimatedTokens > 8000 ? 'yellow' :
    'none';

  const send = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setError(null);

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m, i) => {
        if (m.role === 'user' && i === newMessages.length - 1) {
          // Build multimodal content for the last user message
          const content: Array<Record<string, unknown>> = [];

          // Add PDFs
          if (pdfs.length > 0) {
            pdfs.forEach(d => {
              content.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: d.data },
              });
            });
          }

          // Add images
          if (images.length > 0) {
            images.forEach(img => {
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.data },
              });
            });
          }

          // Add text
          content.push({ type: 'text', text: m.content });

          // If we have attachments, use multimodal format
          if (content.length > 1) {
            return { role: 'user' as const, content };
          }
        }
        return { role: m.role, content: m.content };
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: buildSystemPrompt(),
          messages: apiMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}`);
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Erreur : ${message}` }]);
    }

    setLoading(false);
  };

  const attachCount = pdfs.length + images.length;

  const suggestions = [
    `Portée max tablettes en ${mat.short} ?`,
    `8 kg/mètre de livres sur ${allPieces.find(p => p.type === 'tablette-reglable')?.length || 96} cm ?`,
    `Revue critique — quels risques ?`,
    `Comment traiter la jonction des 2 corps ?`,
    ...(images.length > 0 ? ['Analyse cette photo de mon chantier'] : []),
  ];

  return (
    <div>
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <Tip text={TIPS['assistant-ia']}>
            <h4 className="text-amber-700 font-semibold text-sm">Assistant IA — {mat.short}</h4>
          </Tip>
          <div className="flex items-center gap-1.5">
            {attachCount > 0 && (
              <span className="text-xs text-stone-500">{attachCount} pj</span>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Effacer l\'historique de chat de ce projet ?')) {
                    setMessages([]);
                  }
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:bg-stone-100 hover:text-red-500 border border-stone-200 transition-colors"
                title="Effacer l'historique"
              >
                🗑
              </button>
            )}
            {/* Camera button — mobile only uses capture */}
            <button
              onClick={() => cameraRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:bg-stone-100 border border-stone-200 transition-colors"
              title="Prendre une photo"
            >
              📷
            </button>
            {/* Photo gallery */}
            <button
              onClick={() => photoRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:bg-stone-100 border border-stone-200 transition-colors"
              title="Choisir une photo"
            >
              🖼
            </button>
            {/* PDF */}
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-stone-400 hover:bg-stone-100 border border-stone-200 transition-colors"
              title="Ajouter un PDF"
            >
              PDF
            </button>
            {/* Hidden file inputs */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImage} />
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />
          </div>
        </div>

        {/* Attachments preview */}
        {(pdfs.length > 0 || images.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {images.map((img, i) => (
              <div key={`img-${i}`} className="relative group">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-14 h-14 rounded-lg object-cover border border-stone-200"
                />
                <button
                  onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-stone-300 text-stone-500 hover:text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
            {pdfs.map((d, i) => (
              <span key={`pdf-${i}`} className="text-xs bg-white rounded-lg px-2.5 py-1 text-stone-400 flex items-center gap-1.5 border border-stone-200 h-14">
                📄 {d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name}
                <button onClick={() => setPdfs((ds) => ds.filter((_, j) => j !== i))} className="text-stone-500 hover:text-red-400">x</button>
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-stone-500 mb-3 flex items-center gap-1.5 flex-wrap">
          <span>Contexte : {mat.short} + validation ({validation.errors.length}e/{validation.warnings.length}w)</span>
          <button
            onClick={() => setShowKnowledge(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 hover:bg-amber-100 text-stone-600 hover:text-amber-700 border border-stone-200 transition-colors"
          >
            📚 {kbDocCount} doc{kbDocCount > 1 ? 's' : ''}
          </button>
          {images.length > 0 && <span>+ {images.length} photo{images.length > 1 ? 's' : ''}</span>}
          {pdfs.length > 0 && <span>+ {pdfs.length} PDF</span>}
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="rounded-xl bg-stone-50 p-4 mb-3 min-h-[200px] max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-stone-400 text-sm text-center py-8">
              <div className="mb-3 text-stone-500">Exemples de questions :</div>
              <div className="space-y-1">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    className="block w-full text-left px-3 py-2 rounded-lg text-xs text-stone-500 hover:bg-white hover:text-amber-700 transition-colors"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-stone-700 border border-stone-200'
              }`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-stone-500 text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Réflexion...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 flex flex-col gap-1">
            <input
              className={inputClass}
              placeholder={images.length > 0 ? "Décris ce que tu veux vérifier sur la photo..." : "Ta question..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            {tokenWarningLevel !== 'none' && (
              <span className={`text-[10px] leading-tight ${tokenWarningLevel === 'red' ? 'text-red-500' : 'text-amber-600'}`}>
                {tokenWarningLevel === 'red'
                  ? `~${Math.round(estimatedTokens / 1000)}k tokens — Payload trop volumineux, le résumé sera tronqué`
                  : `~${Math.round(estimatedTokens / 1000)}k tokens`}
              </span>
            )}
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Envoyer
          </button>
        </div>
      </div>

      {/* Knowledge Manager Modal — accessible directly from assistant */}
      <KnowledgeManager
        isOpen={showKnowledge}
        onClose={() => setShowKnowledge(false)}
        onUpdate={() => setKbVersion(v => v + 1)}
      />
    </div>
  );
}
