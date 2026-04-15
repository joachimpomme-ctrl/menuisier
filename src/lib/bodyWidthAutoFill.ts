export interface AutoFillBodyWidthOptions {
  minWidth?: number;
  maxWidth?: number;
  precision?: number;
}

function toUnits(value: number, precision: number): number {
  return Math.round(value * precision);
}

function fromUnits(value: number, precision: number): number {
  return value / precision;
}

function distributeByLargestRemainder(
  weights: number[],
  unitsToDistribute: number,
  capacities?: number[],
): number[] {
  if (weights.length === 0 || unitsToDistribute <= 0) {
    return Array(weights.length).fill(0);
  }

  const safeWeights = weights.map((weight, index) => {
    const capacity = capacities?.[index];
    if (capacity !== undefined && capacity <= 0) return 0;
    return Math.max(0, weight);
  });

  let totalWeight = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) {
    totalWeight = safeWeights.length;
    for (let i = 0; i < safeWeights.length; i += 1) {
      safeWeights[i] = capacities?.[i] === 0 ? 0 : 1;
    }
  }

  const raw = safeWeights.map((weight) => (unitsToDistribute * weight) / totalWeight);
  const allocated = raw.map((value, index) => {
    const floorValue = Math.floor(value);
    const capacity = capacities?.[index];
    return capacity !== undefined ? Math.min(floorValue, capacity) : floorValue;
  });

  let remainder = unitsToDistribute - allocated.reduce((sum, value) => sum + value, 0);

  if (remainder <= 0) return allocated;

  const order = raw
    .map((value, index) => ({
      index,
      fractional: value - Math.floor(value),
      capacityLeft: capacities ? capacities[index] - allocated[index] : Number.POSITIVE_INFINITY,
    }))
    .filter((entry) => entry.capacityLeft > 0)
    .sort((a, b) => b.fractional - a.fractional || a.index - b.index);

  if (order.length === 0) return allocated;

  let cursor = 0;
  while (remainder > 0) {
    const entry = order[cursor % order.length];
    const cap = capacities ? capacities[entry.index] - allocated[entry.index] : Number.POSITIVE_INFINITY;
    if (cap > 0) {
      allocated[entry.index] += 1;
      remainder -= 1;
    }
    cursor += 1;
    if (cursor > order.length * (unitsToDistribute + 1)) break;
  }

  return allocated;
}

export function autoFillBodyWidths(
  currentWidths: number[],
  targetTotalWidth: number,
  options: AutoFillBodyWidthOptions = {},
): number[] {
  const precision = Math.max(1, Math.round(options.precision ?? 10));
  const widths = currentWidths.map((width) => (Number.isFinite(width) ? width : 0));
  const count = widths.length;

  if (count === 0) return [];

  const targetUnits = Math.max(0, toUnits(targetTotalWidth, precision));
  const baseMinUnits = Math.max(0, toUnits(options.minWidth ?? 0, precision));
  const maxUnits = options.maxWidth !== undefined ? toUnits(options.maxWidth, precision) : undefined;

  if (targetUnits <= 0) {
    return Array(count).fill(0);
  }

  const effectiveMinUnits = Math.min(baseMinUnits, Math.floor(targetUnits / count));
  if (effectiveMinUnits * count >= targetUnits) {
    const even = Array(count).fill(Math.floor(targetUnits / count));
    let carry = targetUnits - even.reduce((sum, width) => sum + width, 0);
    for (let i = 0; i < even.length && carry > 0; i += 1) {
      even[i] += 1;
      carry -= 1;
    }
    return even.map((width) => fromUnits(width, precision));
  }

  const widthUnits = widths.map((width) => Math.max(0, toUnits(width, precision)));
  const weights = widthUnits.some((width) => width > 0)
    ? widthUnits.map((width) => Math.max(1, width))
    : Array(count).fill(1);
  const result = Array(count).fill(0);
  const active = new Set(weights.map((_, index) => index));
  let remainingTarget = targetUnits;

  while (active.size > 0) {
    const activeIndexes = [...active];
    const activeWeights = activeIndexes.map((index) => weights[index]);
    const totalWeight = activeWeights.reduce((sum, weight) => sum + weight, 0);
    let clamped = false;

    for (const index of activeIndexes) {
      const raw = (remainingTarget * weights[index]) / totalWeight;
      if (raw < effectiveMinUnits) {
        result[index] = effectiveMinUnits;
        remainingTarget -= effectiveMinUnits;
        active.delete(index);
        clamped = true;
      } else if (maxUnits !== undefined && raw > maxUnits) {
        result[index] = maxUnits;
        remainingTarget -= maxUnits;
        active.delete(index);
        clamped = true;
      }
    }

    if (!clamped) {
      const allocations = distributeByLargestRemainder(activeWeights, remainingTarget);
      activeIndexes.forEach((index, offset) => {
        result[index] = allocations[offset];
      });
      remainingTarget = 0;
      break;
    }

    if (remainingTarget <= 0) {
      break;
    }
  }

  const delta = targetUnits - result.reduce((sum, width) => sum + width, 0);
  if (delta !== 0 && result.length > 0) {
    result[result.length - 1] += delta;
  }

  return result.map((width) => fromUnits(width, precision));
}
