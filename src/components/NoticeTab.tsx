import type { Step } from '../types';

interface Props {
  steps: Step[];
  materialName: string;
  thickness: number;
}

const cardClass = "rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 mb-4";

export default function NoticeTab({ steps, materialName, thickness }: Props) {
  return (
    <div>
      <div className="text-sm text-zinc-400 mb-4">
        Notice de montage — {materialName} {thickness * 10} mm
      </div>
      {steps.map((s, i) => (
        <div key={i} className={cardClass}>
          <h4 className="text-amber-400 font-semibold text-sm mb-3">{s.title}</h4>
          <div className="space-y-1">
            {s.items.map((item, j) => (
              <div
                key={j}
                className={`text-sm py-0.5 ${
                  item.startsWith("  →")
                    ? "text-zinc-500 pl-4 font-mono text-xs"
                    : item.startsWith("⚠")
                    ? "text-yellow-400/80"
                    : "text-zinc-300"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
