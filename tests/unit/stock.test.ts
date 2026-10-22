import { describe, expect, test } from "vitest";
import { InsufficientStockError, reverseStockIn, stockIn, stockOut } from "@/lib/domain/stock";

describe("stockIn", () => {
  test("kho trống: giá vốn bằng giá nhập", () => {
    expect(stockIn({ stockQty: 0, avgCost: 0 }, 1000, 30_000_000)).toEqual({ stockQty: 1000, avgCost: 30_000 });
  });

  test("bình quân gia quyền", () => {
    expect(stockIn({ stockQty: 1000, avgCost: 30_000 }, 500, 18_000_000)).toEqual({ stockQty: 1500, avgCost: 32_000 });
  });

  test("thu hoạch giá vốn 0 kéo bình quân xuống", () => {
    expect(stockIn({ stockQty: 1500, avgCost: 32_000 }, 500, 0)).toEqual({ stockQty: 2000, avgCost: 24_000 });
  });

  test("từ chối số lượng không dương", () => {
    expect(() => stockIn({ stockQty: 0, avgCost: 0 }, 0, 0)).toThrow();
  });
});

describe("stockOut", () => {
  test("xuất theo giá vốn bình quân, không đổi bình quân", () => {
    expect(stockOut({ stockQty: 1000, avgCost: 30_000 }, 200)).toEqual({
      state: { stockQty: 800, avgCost: 30_000 },
      totalCost: 6_000_000,
    });
  });

  test("xuất hết thì giữ giá vốn cũ", () => {
    expect(stockOut({ stockQty: 10, avgCost: 5 }, 10).state).toEqual({ stockQty: 0, avgCost: 5 });
  });

  test("không đủ tồn thì ném InsufficientStockError", () => {
    try {
      stockOut({ stockQty: 120, avgCost: 1 }, 200);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InsufficientStockError);
      expect(error).toMatchObject({ available: 120, requested: 200 });
    }
  });
});

describe("reverseStockIn", () => {
  test("đảo ngược một lần nhập", () => {
    expect(reverseStockIn({ stockQty: 1500, avgCost: 32_000 }, 500, 18_000_000)).toEqual({ stockQty: 1000, avgCost: 30_000 });
  });

  test("đảo hết thì giữ giá vốn cũ", () => {
    expect(reverseStockIn({ stockQty: 500, avgCost: 36_000 }, 500, 18_000_000)).toEqual({ stockQty: 0, avgCost: 36_000 });
  });

  test("giá vốn không âm", () => {
    expect(reverseStockIn({ stockQty: 100, avgCost: 10 }, 50, 5_000).avgCost).toBe(0);
  });

  test("không đủ tồn để đảo thì ném lỗi", () => {
    expect(() => reverseStockIn({ stockQty: 100, avgCost: 1 }, 200, 0)).toThrow(InsufficientStockError);
  });
});
