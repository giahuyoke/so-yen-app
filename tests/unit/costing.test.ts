import { describe, expect, test } from "vitest";
import { allocateCost, cleaningLoss, unitCostOf } from "@/lib/domain/costing";

describe("allocateCost", () => {
  test("chia theo trọng số", () => {
    expect(allocateCost(30_000_000, [700, 100])).toEqual([26_250_000, 3_750_000]);
  });

  test("phần lẻ cộng vào phần tử cuối, tổng luôn bằng đầu vào", () => {
    expect(allocateCost(100, [1, 1, 1])).toEqual([33, 33, 34]);
    const shares = allocateCost(1_000_001, [3, 7, 11]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1_000_001);
  });

  test("số lớn không mất chính xác", () => {
    const shares = allocateCost(90_000_000_000, [999_999, 1]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(90_000_000_000);
    expect(shares[1]).toBe(90_000);
  });

  test("giá vốn 0 thì mọi phần đều 0", () => {
    expect(allocateCost(0, [5, 5])).toEqual([0, 0]);
  });

  test("từ chối trọng số không hợp lệ", () => {
    expect(() => allocateCost(100, [])).toThrow();
    expect(() => allocateCost(100, [0, 1])).toThrow();
    expect(() => allocateCost(100, [1.5])).toThrow();
  });
});

describe("unitCostOf", () => {
  test("làm tròn", () => {
    expect(unitCostOf(1000, 3)).toBe(333);
    expect(unitCostOf(1000, 0)).toBe(0);
  });
});

describe("cleaningLoss", () => {
  test("tính hao hụt", () => {
    expect(cleaningLoss(1000, 800)).toEqual({ lossQty: 200, lossRate: 0.2 });
    expect(cleaningLoss(0, 0)).toEqual({ lossQty: 0, lossRate: 0 });
  });
});
