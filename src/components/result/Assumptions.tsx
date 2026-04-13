import type { Assumption } from '../../lib/knowledge/types';

interface Props {
  assumptions: Assumption[];
}

export default function Assumptions({ assumptions }: Props) {
  const toVerify = assumptions.filter((a) => a.user_should_verify);
  const auto = assumptions.filter((a) => !a.user_should_verify);

  return (
    <div className="space-y-3">
      {toVerify.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-orange-600 uppercase mb-2">À vérifier</h4>
          <ul className="space-y-1.5">
            {toVerify.map((a) => (
              <li key={a.key} className="text-sm bg-orange-50 rounded-lg px-3 py-2">
                <span className="font-medium">{a.value}</span>
                <span className="text-gray-500"> — {a.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {auto.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Valeurs par défaut</h4>
          <ul className="space-y-1">
            {auto.map((a) => (
              <li key={a.key} className="text-sm text-gray-600">
                <span className="font-medium">{a.key}</span>: {a.value}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
