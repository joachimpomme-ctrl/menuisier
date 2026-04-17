import { useState } from 'react';
import Tip from '../Tip';
import { parseNumber } from '../../lib/helpers';
import { inputClass, labelClass } from './styles';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
  tip?: string;
}

export default function NumberInput({ label, value, onChange, step = 1, min, max, suffix, tip }: Props) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  const displayed = focused ? raw : String(value);

  return (
    <div className="min-w-0">
      <label className={labelClass}>
        {tip ? (
          <Tip text={tip}><span>{label}{suffix ? ` (${suffix})` : ''}</span></Tip>
        ) : (
          <>{label}{suffix ? ` (${suffix})` : ''}</>
        )}
      </label>
      <input
        type="number"
        inputMode="decimal"
        pattern="[0-9]*[.,]?[0-9]*"
        step={step}
        min={min}
        max={max}
        className={inputClass}
        value={displayed}
        onChange={(e) => {
          const v = e.target.value.replace(',', '.');
          setRaw(v);
          const n = parseNumber(v, value, min, max);
          onChange(n);
        }}
        onFocus={(e) => {
          setFocused(true);
          setRaw(String(value));
          setTimeout(() => e.target.select(), 0);
        }}
        onBlur={() => { setFocused(false); setRaw(String(value)); }}
      />
    </div>
  );
}
