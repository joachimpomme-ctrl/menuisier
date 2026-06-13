import { useState, useMemo, useCallback } from 'react';
import type { AssemblyStep } from '../../lib/knowledge/types';

interface Props {
  steps: AssemblyStep[];
}

/** Stable-ish key so the atelier checklist survives reloads but resets when the
 *  design (and thus the step list) changes. */
function checklistKey(steps: AssemblyStep[]): string {
  const sig = steps.map((s) => `${s.step_number}:${s.title}`).join('|');
  let hash = 0;
  for (let i = 0; i < sig.length; i++) {
    hash = (hash * 31 + sig.charCodeAt(i)) | 0;
  }
  return `montage-checklist:${steps.length}:${hash}`;
}

function loadChecklist(storageKey: string): Set<number> {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? new Set<number>(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function AssemblyGuide({ steps }: Props) {
  const storageKey = useMemo(() => checklistKey(steps), [steps]);
  const [done, setDone] = useState<Set<number>>(() => loadChecklist(storageKey));

  // Reload persisted progress when the design (storageKey) changes — the React
  // "adjust state during render" pattern, no effect needed.
  const [prevKey, setPrevKey] = useState(storageKey);
  if (storageKey !== prevKey) {
    setPrevKey(storageKey);
    setDone(loadChecklist(storageKey));
  }

  const toggle = useCallback(
    (n: number) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(n)) next.delete(n);
        else next.add(n);
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          /* localStorage indisponible — la progression reste en mémoire */
        }
        return next;
      });
    },
    [storageKey],
  );

  const reset = useCallback(() => {
    setDone(new Set());
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* noop */
    }
  }, [storageKey]);

  if (steps.length === 0) return <p className="text-sm text-gray-400">Aucune étape.</p>;

  const doneCount = steps.filter((s) => done.has(s.step_number)).length;

  return (
    <div>
      {/* Progress header */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-[#54514E] font-medium tabular-nums">
              {doneCount}/{steps.length} étapes
            </span>
            {doneCount > 0 && (
              <button
                type="button"
                onClick={reset}
                className="text-[11px] text-[#9A968F] hover:text-[#3B5FFF] font-medium"
              >
                Réinitialiser
              </button>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-[#EFE8DD] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#5DD4A0] transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="space-y-4">
        {steps.map((step) => {
          const isDone = done.has(step.step_number);
          return (
            <li
              key={step.step_number}
              className={`border-l-2 pl-4 transition-colors ${
                isDone ? 'border-[#5DD4A0]' : 'border-[#3B5FFF]'
              }`}
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggle(step.step_number)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#5DD4A0] cursor-pointer"
                  aria-label={`Marquer l'étape ${step.step_number} comme faite`}
                />
                <h4 className={`font-semibold text-sm ${isDone ? 'text-[#9A968F] line-through' : ''}`}>
                  <span className={isDone ? 'text-[#5DD4A0]' : 'text-[#3B5FFF]'}>
                    {step.step_number}.
                  </span>{' '}
                  {step.title}
                </h4>
              </label>
              {!isDone && (
                <>
                  <ul className="mt-1 space-y-0.5 pl-6">
                    {step.instructions.map((instr, i) => (
                      <li key={i} className="text-sm text-gray-600">• {instr}</li>
                    ))}
                  </ul>
                  {step.tip && (
                    <p className="mt-1 ml-6 text-xs text-[#0E0D0C] bg-[#FFF8DD] border border-[#FFD23F] rounded px-2 py-1 inline-block">
                      💡 {step.tip}
                    </p>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
