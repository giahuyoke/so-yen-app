import { describe, expect, test } from "vitest";
import { computeProduction } from "@/lib/domain/production";

describe("computeProduction", () => {
  test("làm sạch: chia giá vốn theo gram và tính hao hụt", () => {
    const result = computeProduction(
      "clean",
      [{ qty: 1000, totalCost: 30_000_000, unit: "g" }],
      [
        { qty: 700, unit: "g", gramPerUnit: 1 },
        { qty: 100, unit: "g", gramPerUnit: 1 },
      ],
    );
    expect(result).toEqual({
      totalInputCost: 30_000_000,
      outputCosts: [26_250_000, 3_750_000],
      unitCosts: [37_500, 37_500],
      lossQty: 200,
      lossRate: 0.2,
    });
  });

  test("chưng: đầu ra tính bằng cái, trọng số theo gramPerUnit", () => {
    const result = computeProduction(
      "steam",
      [
        { qty: 100, totalCost: 3_750_000, unit: "g" },
        { qty: 10, totalCost: 20_000, unit: "piece" },
        { qty: 10, totalCost: 50_000, unit: "piece" },
      ],
      [{ qty: 10, unit: "piece", gramPerUnit: 10 }],
    );
    expect(result.totalInputCost).toBe(3_820_000);
    expect(result.outputCosts).toEqual([3_820_000]);
    expect(result.unitCosts).toEqual([382_000]);
    expect(result.lossQty).toBe(0);
  });

  test("đóng hộp nhiều loại: gramPerUnit chỉ áp cho đơn vị cái", () => {
    const result = computeProduction(
      "pack",
      [{ qty: 4, totalCost: 1_000, unit: "piece" }],
      [
        { qty: 2, unit: "piece", gramPerUnit: 30 },
        { qty: 1, unit: "piece", gramPerUnit: 60 },
      ],
    );
    expect(result.outputCosts).toEqual([500, 500]);
  });
});
