import type { ValidationResult } from '../types';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  validation: ValidationResult;
}

const cardClass = "rounded-2xl border bg-white p-4 mb-4";

export default function ValidationTab({ validation }: Props) {
  const { errors, warnings } = validation;
  const isClean = errors.length === 0 && warnings.length === 0;

  // Séparer les tips (💡) des vrais warnings
  const realWarnings = warnings.filter((w) => !w.startsWith('💡'));
  const tips = warnings.filter((w) => w.startsWith('💡'));

  return (
    <div>
      {isClean && (
        <div className={cardClass + " border-emerald-300"}>
          <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aucune anomalie détectée
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className={cardClass + " border-red-300"}>
          <Tip text={TIPS['erreur']}>
            <h4 className="text-red-600 font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Erreurs ({errors.length})
            </h4>
          </Tip>
          <div className="space-y-2">
            {errors.map((e, i) => (
              <div key={i} className="text-sm text-red-700 py-2 px-3 rounded-lg bg-red-50 border border-red-200 leading-relaxed">
                {e}
              </div>
            ))}
          </div>
        </div>
      )}

      {realWarnings.length > 0 && (
        <div className={cardClass + " border-amber-300"}>
          <Tip text={TIPS['avertissement']}>
            <h4 className="text-amber-700 font-semibold text-sm mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Avertissements ({realWarnings.length})
            </h4>
          </Tip>
          <div className="space-y-2">
            {realWarnings.map((w, i) => {
              const tipKey = w.includes('flèche') || w.includes('flexion') ? 'flexion'
                : w.includes('formaldéhyde') || w.includes('E1') ? 'formaldehyde'
                : w.includes('orientation') || w.includes('sens du fil') ? 'orientation-debit'
                : null;
              return (
                <div key={i} className="text-sm text-amber-800 py-2 px-3 rounded-lg bg-amber-50 border border-amber-200 leading-relaxed flex items-start gap-1">
                  <span className="flex-1 break-words">{w}</span>
                  {tipKey && <Tip text={TIPS[tipKey]} side="top"><span /></Tip>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className={cardClass + " border-sky-300"}>
          <h4 className="text-sky-700 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Conseils ({tips.length})
          </h4>
          <div className="space-y-2">
            {tips.map((t, i) => (
              <div key={i} className="text-sm text-sky-800 py-2 px-3 rounded-lg bg-sky-50 border border-sky-200 leading-relaxed break-words">
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
