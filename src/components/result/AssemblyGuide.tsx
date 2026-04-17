import type { AssemblyStep } from '../../lib/knowledge/types';
import { AlertStrip } from '../../ui-system';

interface Props {
  steps: AssemblyStep[];
}

export default function AssemblyGuide({ steps }: Props) {
  if (steps.length === 0) {
    return <p className="text-[12px] text-[color:var(--fg-subtle)] italic">Aucune étape.</p>;
  }

  return (
    <ol className="space-y-3">
      {steps.map((step) => (
        <li key={step.step_number} className="border-l-2 border-[color:var(--accent)] pl-3">
          <h4 className="text-[12px] font-semibold text-[color:var(--fg)]">
            <span className="font-mono text-[color:var(--accent)]">{step.step_number}.</span>{' '}
            {step.title}
          </h4>
          <ul className="mt-1 space-y-0.5">
            {step.instructions.map((instr, i) => (
              <li key={i} className="text-[12px] text-[color:var(--fg-muted)]">— {instr}</li>
            ))}
          </ul>
          {step.tip && (
            <div className="mt-1">
              <AlertStrip kind="info">{step.tip}</AlertStrip>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
