import type { DrillingOp, GeneratedPart } from '../knowledge/types';

export interface DrillingPartSummary {
  partId: string;
  partName: string;
  qty: number;
  groups: { label: string; count: number; diameter_mm: number; depth_mm: number }[];
  totalOpsPerUnit: number;
  totalOps: number;
}

const DRILLING_LABELS: Record<DrillingOp['type'], string> = {
  system_32: 'Système 32 (taquets)',
  hinge_cup_35: 'Cup charnière Ø35',
  cam_15: 'Confirmat',
  shelf_pin_5: 'Taquet Ø5',
  dowel_8: 'Tourillon Ø8',
  other: 'Autre',
};

export function formatDrillingPlan(parts: GeneratedPart[]): DrillingPartSummary[] {
  return parts
    .filter((part) => Array.isArray(part.drilling) && part.drilling.length > 0)
    .map((part) => {
      const groupsMap = new Map<DrillingOp['type'], DrillingPartSummary['groups'][number]>();

      for (const op of part.drilling ?? []) {
        const existing = groupsMap.get(op.type);
        if (existing) {
          existing.count += 1;
          continue;
        }

        groupsMap.set(op.type, {
          label: DRILLING_LABELS[op.type],
          count: 1,
          diameter_mm: op.diameter_mm,
          depth_mm: op.depth_mm,
        });
      }

      const groups = Array.from(groupsMap.values());
      const totalOpsPerUnit = part.drilling?.length ?? 0;
      const totalOps = totalOpsPerUnit * part.qty;

      return {
        partId: part.id,
        partName: part.name,
        qty: part.qty,
        groups,
        totalOpsPerUnit,
        totalOps,
      };
    })
    .sort((a, b) => a.partName.localeCompare(b.partName, 'fr'));
}
