import type { AssemblyStep } from '../../lib/knowledge/types';

interface Props {
  steps: AssemblyStep[];
}

export default function AssemblyGuide({ steps }: Props) {
  if (steps.length === 0) return <p className="text-sm text-gray-400">Aucune étape.</p>;

  return (
    <ol className="space-y-4">
      {steps.map((step) => (
        <li key={step.step_number} className="border-l-2 border-amber-300 pl-4">
          <h4 className="font-semibold text-sm">
            <span className="text-amber-600">{step.step_number}.</span> {step.title}
          </h4>
          <ul className="mt-1 space-y-0.5">
            {step.instructions.map((instr, i) => (
              <li key={i} className="text-sm text-gray-600">• {instr}</li>
            ))}
          </ul>
          {step.tip && (
            <p className="mt-1 text-xs text-blue-600 bg-blue-50 rounded px-2 py-1 inline-block">
              💡 {step.tip}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
