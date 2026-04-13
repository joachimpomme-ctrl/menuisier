import type { HardwareItem } from '../../lib/knowledge/types';

interface Props {
  items: HardwareItem[];
}

export default function HardwareDetail({ items }: Props) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Aucune quincaillerie.</p>;

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="py-1.5 pr-3 font-medium">Article</th>
          <th className="py-1.5 pr-3 font-medium">Qté</th>
          <th className="py-1.5 pr-3 font-medium">Cat.</th>
          <th className="py-1.5 font-medium text-right">P.U.</th>
        </tr>
      </thead>
      <tbody>
        {items.map((h) => (
          <tr key={h.id} className="border-b border-gray-100">
            <td className="py-1 pr-3">{h.name}</td>
            <td className="py-1 pr-3 tabular-nums">{h.quantity}</td>
            <td className="py-1 pr-3 text-gray-400">{h.category}</td>
            <td className="py-1 tabular-nums text-right text-gray-500">
              {h.unit_price_eur !== undefined ? `${h.unit_price_eur.toFixed(2)} €` : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
