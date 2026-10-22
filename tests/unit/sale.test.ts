import { describe, expect, test } from "vitest";
import { allocateDiscount, computeSale, nextSaleSeq, saleCode, saleSummaryText } from "@/lib/domain/sale";

describe("computeSale", () => {
  test("tổng, giảm giá, công nợ và doanh thu từng dòng", () => {
    const r = computeSale(
      [
        { qty: 100, price: 45_000 },
        { qty: 2, price: 300_000 },
      ],
      100_000,
      3_000_000,
    );
    expect(r).toEqual({
      subtotal: 5_100_000,
      total: 5_000_000,
      debt: 2_000_000,
      lineRevenue: [4_411_765, 588_235],
    });
  });

  test("không giảm giá thì doanh thu dòng bằng thành tiền", () => {
    expect(computeSale([{ qty: 3, price: 1_000 }], 0, 3_000).lineRevenue).toEqual([3_000]);
  });
});

describe("allocateDiscount", () => {
  test("dòng tặng giá 0 không nhận giảm giá", () => {
    expect(allocateDiscount([0, 1_000], 100)).toEqual([0, 900]);
  });

  test("toàn bộ dòng giá 0 thì giữ nguyên", () => {
    expect(allocateDiscount([0, 0], 0)).toEqual([0, 0]);
  });
});

describe("mã đơn", () => {
  test("nextSaleSeq đánh lại theo năm", () => {
    expect(nextSaleSeq(undefined, 2026)).toBe(1);
    expect(nextSaleSeq({ sale: 0 }, 2026)).toBe(1);
    expect(nextSaleSeq({ sale: 5, saleYear: 2026 }, 2026)).toBe(6);
    expect(nextSaleSeq({ sale: 5, saleYear: 2025 }, 2026)).toBe(1);
  });

  test("saleCode", () => {
    expect(saleCode(2026, 7)).toBe("DH-2026-0007");
    expect(saleCode(2026, 12345)).toBe("DH-2026-12345");
  });
});

describe("saleSummaryText", () => {
  test("có dòng hàng, giảm giá, đã trả và còn nợ", () => {
    const text = saleSummaryText({
      shopName: "Yến sào Nhà Mình",
      code: "DH-2026-0001",
      date: "2026-10-22",
      lines: [
        { name: "Yến tinh tổ đẹp", unit: "g", qty: 100, price: 45_000 },
        { name: "Yến chưng 70ml", unit: "piece", qty: 2, price: 300_000 },
      ],
      subtotal: 5_100_000,
      discount: 100_000,
      total: 5_000_000,
      paid: 3_000_000,
      debt: 2_000_000,
    });
    expect(text).toContain("Yến sào Nhà Mình");
    expect(text).toContain("Đơn DH-2026-0001 · 22/10/2026");
    expect(text).toContain("- Yến tinh tổ đẹp: 100g × 45.000\u00a0₫ = 4.500.000\u00a0₫");
    expect(text).toContain("- Yến chưng 70ml: 2 cái × 300.000\u00a0₫ = 600.000\u00a0₫");
    expect(text).toContain("Giảm giá: 100.000\u00a0₫");
    expect(text).toContain("Tổng cộng: 5.000.000\u00a0₫");
    expect(text).toContain("Còn nợ: 2.000.000\u00a0₫");
  });

  test("bỏ dòng giảm giá và còn nợ khi bằng 0", () => {
    const text = saleSummaryText({
      shopName: "A", code: "DH-2026-0002", date: "2026-10-22",
      lines: [{ name: "X", unit: "piece", qty: 1, price: 10_000 }],
      subtotal: 10_000, discount: 0, total: 10_000, paid: 10_000, debt: 0,
    });
    expect(text).not.toContain("Giảm giá");
    expect(text).not.toContain("Còn nợ");
  });
});
