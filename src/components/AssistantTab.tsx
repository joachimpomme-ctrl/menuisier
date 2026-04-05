import { useState, useRef, useEffect } from 'react';
import type { AppState, ChatMessage, UploadedPdf, ValidationResult, PieceWithBody } from '../types';
import { MATERIALS } from '../data/materials';

interface Props {
  state: AppState;
  validation: ValidationResult;
  allPieces: PieceWithBody[];
  totalPieces: number;
  panelCount: number;
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";
const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/30 transition-colors";

export default function AssistantTab({ state, validation, allPieces, totalPieces, panelCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfs, setPdfs] = useState<UploadedPdf[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const mat = MATERIALS[state.materialKey];
  const usableHeight = state.project.ceilingHeight - state.project.plinthHeight;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
  };

  const buildSystemPrompt = (): string => {
    return `Tu es un assistant menuiserie expert intégré à un outil de conception de bibliothèque. Réponds en français, concis et technique.

PROJET : mur ${state.project.wallWidth}×${state.project.ceilingHeight} cm, plinthe ${state.project.plinthHeight} cm, hauteur utile ${usableHeight} cm
${state.bodies.length} corps : ${state.bodies.map(b => `${b.name} ${b.width}×${b.depth}cm (${b.pieces.length} pièces)`).join(' / ')}
Total : ${totalPieces} pièces → ${panelCount} panneaux

MATÉRIAU : ${mat.name} — densité ${mat.density}, flexion ${mat.flexMPa} MPa, portée max ${mat.maxSpan18} cm, vis: ${mat.screwHolding}, tourillons: ${mat.dowels ? 'oui' : 'non'}
Assemblage : ${mat.assembly.join(' / ')}
${mat.warnings.length ? '⚠ ' + mat.warnings.join(' | ') : ''}

PIÈCES :
${state.bodies.map(b => b.pieces.map(p => `${b.name} > ${p.name}: ${p.length}×${p.width} ×${p.qty} [${p.type}]`).join('\n')).join('\n')}

VALIDATION : ${validation.errors.length} err, ${validation.warnings.length} warn
${validation.errors.map(e => '❌ ' + e).join('\n')}
${validation.warnings.map(w => '⚠ ' + w).join('\n')}

${pdfs.length ? `${pdfs.length} PDF de référence fournis — utilise-les.` : ''}
Calcul flexion : f = (5·q·L⁴)/(384·E·I), I = b·h³/12. Si modification recommandée, donne la valeur exacte.`;
  };

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
        if (m.role === 'user' && pdfs.length > 0 && i === newMessages.length - 1) {
          return {
            role: 'user' as const,
            content: [
              ...pdfs.map(d => ({
                type: 'document' as const,
                source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: d.data },
              })),
              { type: 'text' as const, text: m.content },
            ],
          };
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

  const suggestions = [
    `Portée max tablettes en ${mat.short} ?`,
    `8 kg/mètre de livres sur ${allPieces.find(p => p.type === 'tablette-reglable')?.length || 96} cm ?`,
    `Revue critique — quels risques ?`,
    `Comment traiter la jonction des 2 corps ?`,
  ];

  return (
    <div>
      <div className={cardClass}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-amber-400 font-semibold text-sm">Assistant IA — {mat.short}</h4>
          <div className="flex items-center gap-2">
            {pdfs.length > 0 && (
              <span className="text-xs text-zinc-500">{pdfs.length} PDF</span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              + PDF réf.
            </button>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePdf} />
          </div>
        </div>

        {pdfs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pdfs.map((d, i) => (
              <span key={i} className="text-xs bg-zinc-800 rounded-lg px-2.5 py-1 text-zinc-300 flex items-center gap-1.5 border border-zinc-700">
                {d.name}
                <button onClick={() => setPdfs((ds) => ds.filter((_, j) => j !== i))} className="text-zinc-500 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}

        <div className="text-xs text-zinc-500 mb-3">
          Contexte : structure + {mat.name} + validation ({validation.errors.length}e/{validation.warnings.length}w)
          {pdfs.length > 0 ? ` + ${pdfs.length} PDF` : ''}
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-400 bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="rounded-xl bg-zinc-950/50 p-4 mb-3 min-h-[200px] max-h-[400px] overflow-y-auto">
          {messages.length === 0 && (
            <div className="text-zinc-600 text-sm text-center py-8">
              <div className="mb-3 text-zinc-500">Exemples de questions :</div>
              <div className="space-y-1">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    className="block w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-500 hover:bg-zinc-800/50 hover:text-amber-400 transition-colors"
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
                  : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              }`}>
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-zinc-500 text-sm flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              Réflexion...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            className={inputClass + " flex-1"}
            placeholder="Ta question..."
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
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
