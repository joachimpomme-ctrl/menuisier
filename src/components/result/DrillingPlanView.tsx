import type { GeneratedPart } from '../../lib/knowledge/types';
import { formatDrillingPlan } from '../../lib/drilling/formatDrillingPlan';

interface Props {
  parts: GeneratedPart[];
}

export default function DrillingPlanView({ parts }: Props) {
  const drillingPlan = formatDrillingPlan(parts);

  if (drillingPlan.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-1.5 pr-3 font-medium">Pièce</th>
            <th className="py-1.5 pr-3 font-medium">Perçages</th>
            <th className="py-1.5 font-medium text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {drillingPlan.map((part) => (
            <tr key={part.partId} className="border-b border-gray-100">
              <td className="py-1 pr-3">
                {part.partName} × {part.qty}
              </td>
              <td className="py-1 pr-3 text-gray-600">
                {part.groups.map((group) => `${group.count}× ${group.label}`).join(', ')}
              </td>
              <td className="py-1 text-right tabular-nums text-gray-500">
                {part.totalOps}
                <span className="ml-1 text-xs text-gray-400">({part.totalOpsPerUnit} / pièce)</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
