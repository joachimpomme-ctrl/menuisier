import { useState, useRef, useEffect } from 'react';
import type { AppState, ChatMessage, UploadedPdf, ValidationResult, PieceWithBody } from '../types';
import { MATERIALS } from '../data/materials';
import { listKnowledgeDocs } from '../lib/knowledgeStore';
import { analyzeProject } from '../lib/projectAnalysis';
import { buildAIContext } from '../lib/ai/buildContext';
import { extractPatches, stripPatches, applyPatch } from '../lib/ai/aiPatch';
import KnowledgeManager from './KnowledgeManager';
import AdaptPanel from './AdaptPanel';
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
  /** Apply an AI-suggested patch to the current state */
  onApplyState?: (next: AppState) => void;
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
  data: string;
  mediaType: string;
  preview: string;
}

const cardClass = "rounded-lg border border-[#EFE8DD] bg-white p-4 mb-4";
const inputClass = "w-full rounded-lg border border-[#EFE8DD] bg-white px-3 py-2.5 text-sm text-[#0E0D0C] placeholder-[#9A968F] focus:border-[#3B5FFF] focus:outline-none transition-colors";

export default function AssistantTab({ state, validation, allPieces, totalPieces: _totalPieces, panelCount: _panelCount, projectId, onApplyState }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadChat(projectId));
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [appliedPatches, setAppliedPatches] = useState<Set<string>>(new Set());
  const [kbVersion, setKbVersion] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages(loadChat(projectId));
  }, [projectId]);

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

  const kbDocs = listKnowledgeDocs();
  const kbDocCount = kbDocs.length + 0 * kbVersion;

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
      if (mentionsOther) continue;

      const budget = MAX_KNOWLEDGE_CHARS - totalLen;
      if (budget <= 100) break;
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
          const content: Array<Record<string, unknown>> = [];

          if (pdfs.length > 0) {
            pdfs.forEach(d => {
              content.push({
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: d.data },
              });
            });
          }

          if (images.length > 0) {
            images.forEach(img => {
              content.push({
                type: 'image',
                source: { type: 'base64', media_type: img.mediaType, data: img.data },
              });
            });
          }

          content.push({ type: 'text', text: m.content });

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
      <AdaptPanel state={state} onApplyState={onApplyState} />
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <Tip text={TIPS['assistant-ia']}>
            <h4 className="text-[#3B5FFF] font-semibold text-sm">Assistant IA — {mat.short}</h4>
          </Tip>
          <div className="flex items-center gap-1.5">
            {attachCount > 0 && (
              <span className="text-xs text-[#9A968F]">{attachCount} pj</span>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Effacer l\'historique de chat de ce projet ?')) {
                    setMessages([]);
                  }
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-[#9A968F] hover:bg-[#FFFCF7] hover:text-[#A52E16] border border-[#EFE8DD] transition-colors"
                title="Effacer l'historique"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 3h8M5 3V2h2v1M4 3v7h4V3H4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            <button
              onClick={() => cameraRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-[#9A968F] hover:bg-[#FFFCF7] border border-[#EFE8DD] transition-colors"
              title="Prendre une photo"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="3" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="7" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M5 3l.8-1.5h2.4L9 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => photoRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-[#9A968F] hover:bg-[#FFFCF7] border border-[#EFE8DD] transition-colors"
              title="Choisir une photo"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="2" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                <circle cx="4.5" cy="5" r="1" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M1 9l3-3 2.5 2.5L9 6l4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-white text-[#9A968F] hover:bg-[#FFFCF7] border border-[#EFE8DD] transition-colors font-medium"
              title="Ajouter un PDF"
            >
              PDF
            </button>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
            <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImage} />
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />
          </div>
        </div>

        {(pdfs.length > 0 || images.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {images.map((img, i) => (
              <div key={`img-${i}`} className="relative group">
                <img
                  src={img.preview}
                  alt={img.name}
                  className="w-14 h-14 rounded-lg object-cover border border-[#EFE8DD]"
                />
                <button
                  onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-[#EFE8DD] text-[#9A968F] hover:text-[#A52E16] text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
            {pdfs.map((d, i) => (
              <span key={`pdf-${i}`} className="text-xs bg-[#FFFCF7] rounded-lg px-2.5 py-1 text-[#54514E] flex items-center gap-1.5 border border-[#EFE8DD] h-14">
                <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="flex-shrink-0">
                  <rect x="1" y="1" width="10" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M3 5h6M3 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {d.name.length > 15 ? d.name.slice(0, 12) + '...' : d.name}
                <button onClick={() => setPdfs((ds) => ds.filter((_, j) => j !== i))} className="text-[#9A968F] hover:text-[#A52E16]">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-[#9A968F] mb-3 flex items-center gap-1.5 flex-wrap">
          <span>Contexte : {mat.short} + validation ({validation.errors.length}e/{validation.warnings.length}w)</span>
          <button
            onClick={() => setShowKnowledge(true)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FFFCF7] hover:bg-[#E5EAFF] text-[#54514E] hover:text-[#3B5FFF] border border-[#EFE8DD] transition-colors"
          >
            KB {kbDocCount} doc{kbDocCount > 1 ? 's' : ''}
          </button>
          {images.length > 0 && <span>+ {images.length} photo{images.length > 1 ? 's' : ''}</span>}
          {pdfs.length > 0 && <span>+ {pdfs.length} PDF</span>}
        </div>

        {error && (
          <div className="mb-3 text-xs text-[#A52E16] bg-[#FFE4DC] border border-[#FF6B4A] rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-[#FFFCF7] p-4 mb-3 min-h-[200px] max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-[#9A968F] text-sm text-center py-8">
              <div className="mb-3 text-[#54514E]">Exemples de questions :</div>
              <div className="space-y-1">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    className="block w-full text-left px-3 py-2 rounded-lg text-xs text-[#54514E] hover:bg-white hover:text-[#3B5FFF] transition-colors"
                    onClick={() => setInput(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const patches = m.role === 'assistant' ? extractPatches(m.content) : [];
            const cleanContent = patches.length > 0 ? stripPatches(m.content) : m.content;
            return (
              <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-[#3B5FFF] text-white'
                    : 'bg-[#E5EAFF] text-[#0E0D0C]'
                }`}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{cleanContent}</div>
                </div>
                {patches.length > 0 && onApplyState && (
                  <div className="mt-2 space-y-2 text-left">
                    {patches.map((pp, pi) => (
                      <div key={pi} className="inline-block max-w-[85%] rounded-lg border border-[#EFE8DD] bg-[#E5EAFF] px-3 py-2 text-xs">
                        {pp.patch.title && (
                          <div className="font-semibold text-[#3B5FFF] mb-1">{pp.patch.title}</div>
                        )}
                        <ul className="text-[#54514E] space-y-0.5 mb-2">
                          {pp.summary.map((s, si) => (
                            <li key={si}>• {s}</li>
                          ))}
                        </ul>
                        {(() => {
                          const key = `${i}-${pi}`;
                          const applied = appliedPatches.has(key);
                          return applied ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#0E5A3D] font-medium">✓ Appliqué</span>
                              <span className="text-xs text-[#9A968F]">— voir l'onglet Structure</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                const next = applyPatch(state, pp.patch);
                                onApplyState(next);
                                setAppliedPatches(prev => new Set(prev).add(key));
                              }}
                              className="text-xs px-3 py-1.5 rounded-lg bg-[#3B5FFF] text-white font-medium hover:bg-[#1E3FCC] transition-colors"
                            >
                              Appliquer
                            </button>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {loading && (
            <div className="text-[#54514E] text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-[#3B5FFF] rounded-full animate-pulse" />
              Réflexion...
            </div>
          )}
          <div ref={endRef} />
        </div>

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
              <span className={`text-[10px] leading-tight ${tokenWarningLevel === 'red' ? 'text-[#A52E16]' : 'text-[#54514E]'}`}>
                {tokenWarningLevel === 'red'
                  ? `~${Math.round(estimatedTokens / 1000)}k tokens — Payload trop volumineux, le résumé sera tronqué`
                  : `~${Math.round(estimatedTokens / 1000)}k tokens`}
              </span>
            )}
          </div>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-lg bg-[#3B5FFF] text-white text-sm font-medium hover:bg-[#1E3FCC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Envoyer
          </button>
        </div>
      </div>

      <KnowledgeManager
        isOpen={showKnowledge}
        onClose={() => setShowKnowledge(false)}
        onUpdate={() => setKbVersion(v => v + 1)}
      />
    </div>
  );
}
