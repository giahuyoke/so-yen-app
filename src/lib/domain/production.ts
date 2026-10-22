import { allocateCost, cleaningLoss, unitCostOf } from "@/lib/domain/costing";
import type { ProductionKind, Unit } from "@/lib/domain/models";

export interface ProductionInputCalc {
  qty: number;
  totalCost: number;
  unit: Unit;
}

export interface ProductionOutputCalc {
  qty: number;
  unit: Unit;
  /** Số gram yến trong một đơn vị; với đơn vị gram luôn coi là 1. */
  gramPerUnit: number;
}

export interface ProductionResult {
  totalInputCost: number;
  outputCosts: number[];
  unitCosts: number[];
  lossQty: number;
  lossRate: number;
}

/** Dùng chung cho server (ghi chứng từ) và client (xem trước trên form). */
export function computeProduction(
  kind: ProductionKind,
  inputs: ProductionInputCalc[],
  outputs: ProductionOutputCalc[],
): ProductionResult {
  const totalInputCost = inputs.reduce((sum, i) => sum + i.totalCost, 0);
  const weights = outputs.map((o) => o.qty * (o.unit === "g" ? 1 : o.gramPerUnit));
  const outputCosts = allocateCost(totalInputCost, weights);
  const unitCosts = outputCosts.map((cost, i) => unitCostOf(cost, outputs[i].qty));

  let lossQty = 0;
  let lossRate = 0;
  if (kind === "clean") {
    const inGrams = inputs.filter((i) => i.unit === "g").reduce((s, i) => s + i.qty, 0);
    const outGrams = outputs.filter((o) => o.unit === "g").reduce((s, o) => s + o.qty, 0);
    ({ lossQty, lossRate } = cleaningLoss(inGrams, outGrams));
  }

  return { totalInputCost, outputCosts, unitCosts, lossQty, lossRate };
}
