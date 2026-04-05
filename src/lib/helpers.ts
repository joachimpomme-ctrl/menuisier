export const uid = (): string => Math.random().toString(36).slice(2, 8);

export function parseNumber(value: string, fallback: number, min?: number, max?: number): number {
  const n = parseFloat(value);
  if (isNaN(n)) return fallback;
  if (min !== undefined && n < min) return min;
  if (max !== undefined && n > max) return max;
  return n;
}

export function clampInt(value: string, fallback: number, min: number, max: number): number {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
