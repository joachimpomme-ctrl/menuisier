import { useState } from 'react';
import type { ValidationResult } from '../types';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  validation: ValidationResult;
  onGoToStructure?: () => void;
}

const cardClass = "rounded-lg border bg-white p-4 mb-4";

export default function ValidationTab({ validation, onGoToStructure }: Props) {
  const { errors, warnings } = validation;
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const realWarnings = warnings.filter((w) => !w.startsWith('💡'));
  const tips = warnings.filter((w) => w.startsWith('💡'));

  const activeErrors = errors.filter((_, i) => !dismissed.has(i));
  const activeWarnings = realWarnings.filter((_, i) => !dismissed.has(1000 + i));

  const isClean = activeErrors.length === 0 && activeWarnings.length === 0;

  const dismiss = (key: number) => {
    setDismissed((prev) => new Set(prev).add(key));
  };

  const resetDismissed = () => setDismissed(new Set());

  return (
    <div>
      {isClean && (
        <div className={cardClass + " border-[#5DD4A0]"}>
          <div className="flex items-center gap-2 text-[#0E5A3D] text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aucune anomalie détectée
            {dismissed.size > 0 && (
              <button
                onClick={resetDismissed}
                className="ml-auto text-[10px] text-[#9A968F] hover:text-[#54514E] transition-colors"
              >
                Réafficher les masqués ({dismissed.size})
              </button>
            )}
          </div>
        </div>
      )}

      {activeErrors.length > 0 && (
        <div className={cardClass + " border-[#FF6B4A]"}>
          <Tip text={TIPS['erreur']}>
            <h4 className="text-[#A52E16] font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Erreurs ({activeErrors.length})
            </h4>
          </Tip>
          <div className="space-y-2">
            {errors.map((e, i) => {
              if (dismissed.has(i)) return null;
              return (
                <div key={i} className="text-sm text-[#A52E16] py-2 px-3 rounded-lg bg-[#FFE4DC] border border-[#FF6B4A] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 break-words">{e}</span>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      {onGoToStructure && (
                        <button
                          onClick={onGoToStructure}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#FFE4DC] text-[#A52E16] hover:bg-[#FF6B4A] border border-[#FF6B4A] font-medium transition-colors"
                        >
                          Corriger
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(i)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#FFFCF7] text-[#9A968F] hover:bg-[#EFE8DD] border border-[#EFE8DD] transition-colors"
                        title="Masquer ce contrôle"
                      >
                        Masquer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeWarnings.length > 0 && (
        <div className={cardClass + " border-[#EFE8DD]"}>
          <Tip text={TIPS['avertissement']}>
            <h4 className="text-[#54514E] font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Avertissements ({activeWarnings.length})
            </h4>
          </Tip>
          <div className="space-y-2">
            {realWarnings.map((w, i) => {
              if (dismissed.has(1000 + i)) return null;
              const tipKey = w.includes('flèche') || w.includes('flexion') ? 'flexion'
                : w.includes('formaldéhyde') || w.includes('E1') ? 'formaldehyde'
                : w.includes('orientation') || w.includes('sens du fil') ? 'orientation-debit'
                : null;
              return (
                <div key={i} className="text-sm text-[#54514E] py-2 px-3 rounded-lg bg-[#FFFCF7] border border-[#EFE8DD] leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="flex-1 break-words">{w}</span>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      {tipKey && <Tip text={TIPS[tipKey]} side="top"><span className="text-[10px] text-[#9A968F]">?</span></Tip>}
                      {onGoToStructure && (
                        <button
                          onClick={onGoToStructure}
                          className="text-[10px] px-2 py-0.5 rounded bg-[#E5EAFF] text-[#3B5FFF] hover:bg-[#EFE8DD] border border-[#EFE8DD] font-medium transition-colors"
                        >
                          Corriger
                        </button>
                      )}
                      <button
                        onClick={() => dismiss(1000 + i)}
                        className="text-[10px] px-2 py-0.5 rounded bg-[#FFFCF7] text-[#9A968F] hover:bg-[#EFE8DD] border border-[#EFE8DD] transition-colors"
                        title="Masquer cet avertissement"
                      >
                        Masquer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className={cardClass + " border-[#EFE8DD]"}>
          <h4 className="text-[#54514E] font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Conseils ({tips.length})
          </h4>
          <div className="space-y-2">
            {tips.map((t, i) => (
              <div key={i} className="text-sm text-[#54514E] py-2 px-3 rounded-lg bg-[#FFFCF7] border border-[#EFE8DD] leading-relaxed break-words">
                {t.replace(/^💡\s*/, '')}
              </div>
            ))}
          </div>
        </div>
      )}

      {dismissed.size > 0 && !isClean && (
        <div className="text-center mt-2">
          <button
            onClick={resetDismissed}
            className="text-[10px] text-[#9A968F] hover:text-[#54514E] transition-colors"
          >
            Réafficher les {dismissed.size} contrôle{dismissed.size > 1 ? 's' : ''} masqué{dismissed.size > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
