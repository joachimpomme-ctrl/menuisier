interface Props {
  panelPrice: number;
  panelCount: number;
  totalCost: number;
  wastePercent: number;
  wasteCost: number;
  configured: boolean;
  onPriceChange: (price: number) => void;
}

export default function CostPanel({
  panelPrice,
  panelCount,
  totalCost,
  wastePercent,
  wasteCost,
  configured,
  onPriceChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white  p-4">
      <h3 className="text-sm font-semibold text-stone-800 mb-3">Estimation du co&ucirc;t</h3>

      {/* Price input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          min={0}
          step={0.01}
          value={panelPrice || ''}
          placeholder="0"
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onPriceChange(isNaN(val) ? 0 : val);
          }}
          className="w-24 px-2.5 py-1.5 rounded-md bg-white border border-stone-300 text-stone-800 text-sm text-right focus:outline-none focus:border-amber-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-stone-500">&euro;/panneau</span>
      </div>

      {!configured ? (
        <p className="text-xs text-stone-500 italic">
          Renseignez un prix par panneau pour estimer le co&ucirc;t
        </p>
      ) : (
        <div className="space-y-2">
          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-stone-400">Total</span>
            <span className="text-lg font-bold text-amber-700">
              {totalCost.toFixed(2)}&euro; HT
            </span>
          </div>

          {/* Detail */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-stone-500">D&eacute;tail</span>
            <span className="text-xs text-stone-400">
              {panelCount} panneau{panelCount > 1 ? 'x' : ''} &times; {panelPrice.toFixed(2)}&euro;
            </span>
          </div>

          {/* Waste */}
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-stone-500">Chutes</span>
            <span className="text-xs text-stone-400">
              ~{wastePercent.toFixed(0)}% soit ~{wasteCost.toFixed(2)}&euro;
            </span>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-200">
            Estimation indicative, hors quincaillerie et finitions
          </p>
        </div>
      )}
    </div>
  );
}
