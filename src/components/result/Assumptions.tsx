import { useState } from 'react';
import type { Assumption } from '../../lib/knowledge/types';

interface Props {
  assumptions: Assumption[];
}

const MAX_VISIBLE_DECISIONS = 6;

export function getDecisionAssumptions(assumptions: Assumption[]): Assumption[] {
  return assumptions.filter((a) => a.category === 'decision');
}

export function getVerifyAssumptions(assumptions: Assumption[]): Assumption[] {
  return assumptions.filter((a) => a.category !== 'decision' && a.user_should_verify);
}

export function getDefaultAssumptions(assumptions: Assumption[]): Assumption[] {
  return assumptions.filter((a) => a.category !== 'decision' && !a.user_should_verify);
}

export function getVisibleDecisions(
  decisions: Assumption[],
  expanded: boolean,
  maxVisible: number = MAX_VISIBLE_DECISIONS,
): Assumption[] {
  return expanded ? decisions : decisions.slice(0, maxVisible);
}

export function shouldShowMoreDecisions(
  decisions: Assumption[],
  maxVisible: number = MAX_VISIBLE_DECISIONS,
): boolean {
  return decisions.length > maxVisible;
}

export default function Assumptions({ assumptions }: Props) {
  const [expanded, setExpanded] = useState(false);
  const decisions = getDecisionAssumptions(assumptions);
  const toVerify = getVerifyAssumptions(assumptions);
  const auto = getDefaultAssumptions(assumptions);
  const visibleDecisions = getVisibleDecisions(decisions, expanded);
  const showMore = shouldShowMoreDecisions(decisions);

  return (
    <div className="space-y-3">
      {decisions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-indigo-600 uppercase mb-2">
            🔧 Décisions du moteur
          </h4>
          <ul className="space-y-1.5">
            {visibleDecisions.map((a) => (
              <li key={a.key} className="text-sm bg-indigo-50 rounded-lg px-3 py-2">
                <span className="font-medium">{a.value}</span>
                <span className="text-gray-500"> — {a.reason}</span>
              </li>
            ))}
          </ul>
          {showMore && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Voir tout ({decisions.length})
            </button>
          )}
        </div>
      )}
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
