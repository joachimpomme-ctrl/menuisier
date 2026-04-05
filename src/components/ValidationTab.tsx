import type { ValidationResult } from '../types';

interface Props {
  validation: ValidationResult;
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";

export default function ValidationTab({ validation }: Props) {
  const { errors, warnings } = validation;
  const isClean = errors.length === 0 && warnings.length === 0;

  return (
    <div>
      {isClean && (
        <div className={cardClass + " !border-emerald-900/50"}>
          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Aucune anomalie détectée
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className={cardClass + " !border-red-900/50"}>
          <h4 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Erreurs ({errors.length})
          </h4>
          <div className="space-y-2">
            {errors.map((e, i) => (
              <div key={i} className="text-sm text-red-300/80 py-1.5 px-3 rounded-lg bg-red-950/30 border border-red-900/30">
                {e}
              </div>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className={cardClass + " !border-yellow-900/50"}>
          <h4 className="text-yellow-400 font-semibold text-sm mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Avertissements ({warnings.length})
          </h4>
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="text-sm text-yellow-300/70 py-1.5 px-3 rounded-lg bg-yellow-950/20 border border-yellow-900/20">
                {w}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
