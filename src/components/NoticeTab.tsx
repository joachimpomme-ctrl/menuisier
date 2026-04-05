import type { Step } from '../types';
import Tip from './Tip';
import TIPS from '../data/tips';

interface Props {
  steps: Step[];
  materialName: string;
  thickness: number;
}

const cardClass = "rounded-2xl border border-stone-200 bg-white  p-4 mb-4";

// Map step title prefixes to tip keys
const STEP_TIPS: Record<string, string> = {
  '1.': 'releve-cotes',
  '2.': 'debit-notice',
  '3. Rainures': 'rainures',
  '3. Perçages': 'percages-sys32',
  '4.': 'decoupe-plinthe',
  '5.': 'assemblage',
  '6.': 'mise-en-place',
  '7.': 'finitions',
};

function getStepTip(title: string): string | undefined {
  for (const [prefix, key] of Object.entries(STEP_TIPS)) {
    if (title.includes(prefix)) return TIPS[key];
  }
  return undefined;
}

export default function NoticeTab({ steps, materialName, thickness }: Props) {
  return (
    <div>
      <div className="text-sm text-stone-500 mb-4">
        Notice de montage — {materialName} {thickness * 10} mm
      </div>
      {steps.map((s, i) => {
        const tip = getStepTip(s.title);
        return (
          <div key={i} className={cardClass}>
            <div className="mb-3">
              {tip ? (
                <Tip text={tip}><h4 className="text-amber-700 font-semibold text-sm">{s.title}</h4></Tip>
              ) : (
                <h4 className="text-amber-700 font-semibold text-sm">{s.title}</h4>
              )}
            </div>
            <div className="space-y-1">
              {s.items.map((item, j) => {
                // Tip contextuel pour l'équerrage
                const isEquerrage = item.toLowerCase().includes('équerrage') || item.toLowerCase().includes('diagonale');
                return (
                  <div
                    key={j}
                    className={`text-sm py-0.5 flex items-start gap-1 ${
                      item.startsWith("  →")
                        ? "text-stone-500 pl-4 font-mono text-xs"
                        : item.startsWith("⚠") || item.startsWith("⚡")
                        ? "text-yellow-400/80"
                        : item.startsWith("💡")
                        ? "text-blue-300/80"
                        : "text-stone-400"
                    }`}
                  >
                    <span className="flex-1">{item}</span>
                    {isEquerrage && <Tip text={TIPS['equerrage']} side="top"><span /></Tip>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
