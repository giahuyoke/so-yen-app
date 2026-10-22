import { describe, expect, test } from "vitest";
import { lossBySource, periodRange, sumStats } from "@/lib/domain/reports";
import { expenseStatsDelta } from "@/lib/domain/stats";

describe("periodRange", () => {
  test("tháng, quý, năm", () => {
    expect(periodRange({ kind: "month", year: 2028, index: 2 })).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
      months: ["2028-02"],
      label: "Tháng 2/2028",
    });
    expect(periodRange({ kind: "quarter", year: 2026, index: 4 })).toMatchObject({
      from: "2026-10-01",
      to: "2026-12-31",
      months: ["2026-10", "2026-11", "2026-12"],
      label: "Quý 4/2026",
    });
    expect(periodRange({ kind: "year", year: 2026, index: 1 }).months).toHaveLength(12);
  });
});

describe("sumStats", () => {
  test("cộng dồn và tính lãi gộp, lãi ròng", () => {
    const t = sumStats([
      {
        id: "2026-09",
        revenue: 1_000,
        cogs: 600,
        saleCount: 2,
        expenses: 100,
        byChannel: { zalo: { revenue: 1_000, cogs: 600, count: 2 } },
        byProduct: { a: { qty: 10, revenue: 1_000, cogs: 600 } },
        byTaxGroup: { processed: 1_000 },
        expensesByCategory: { ads: 100 },
      },
      {
        id: "2026-10",
        revenue: 500,
        cogs: 200,
        saleCount: 1,
        byChannel: { zalo: { revenue: 500, cogs: 200, count: 1 } },
        byProduct: { a: { qty: 5, revenue: 500, cogs: 200 } },
        byTaxGroup: { processed: 500 },
        expenses: 50,
        expensesByCategory: { ads: 20, nest: 30 },
      },
    ]);
    expect(t).toMatchObject({ revenue: 1_500, cogs: 800, grossProfit: 700, expenses: 150, netProfit: 550, saleCount: 3 });
    expect(t.byChannel.zalo).toEqual({ revenue: 1_500, cogs: 800, count: 3 });
    expect(t.byProduct.a).toEqual({ qty: 15, revenue: 1_500, cogs: 800 });
    expect(t.expensesByCategory).toEqual({ ads: 120, nest: 30 });
  });
});

describe("expenseStatsDelta", () => {
  test("sign -1 trừ lại khi hủy", () => {
    expect(expenseStatsDelta({ category: "ads", amount: 300 }, -1)).toEqual({ expenses: -300, expensesByCategory: { ads: -300 } });
  });
});

describe("lossBySource", () => {
  const receipt = (date: string, productId: string, kind: "harvest" | "purchase", supplierId: string | null = null) => ({
    date,
    kind,
    supplierId,
    status: "active" as const,
    lines: [{ productId, qty: 1_000, totalCost: 0 }],
  });
  const clean = (date: string, inputs: { productId: string; qty: number }[], lossQty: number) => ({
    kind: "clean" as const,
    status: "active" as const,
    date,
    lossQty,
    inputs: inputs.map((i) => ({ ...i, totalCost: 0 })),
  });

  test("nguồn theo phiếu nhập gần nhất trước ngày làm sạch", () => {
    const groups = lossBySource(
      [clean("2026-10-05", [{ productId: "raw", qty: 1_000 }], 300), clean("2026-10-20", [{ productId: "raw", qty: 500 }], 100)],
      [receipt("2026-10-01", "raw", "harvest"), receipt("2026-10-10", "raw", "purchase", "ba"), receipt("2026-10-25", "raw", "harvest")],
    );
    expect(groups).toEqual([
      { source: "harvest", count: 1, inputQty: 1_000, lossQty: 300, lossRate: 0.3 },
      { source: "supplier:ba", count: 1, inputQty: 500, lossQty: 100, lossRate: 0.2 },
    ]);
  });

  test("bỏ qua chế biến khác làm sạch, đã hủy; không có phiếu nhập là unknown", () => {
    const groups = lossBySource(
      [
        clean("2026-10-05", [{ productId: "x", qty: 100 }], 10),
        { ...clean("2026-10-05", [{ productId: "x", qty: 100 }], 10), status: "voided" as const },
        { ...clean("2026-10-05", [{ productId: "x", qty: 100 }], 10), kind: "steam" as const },
      ],
      [],
    );
    expect(groups).toEqual([{ source: "unknown", count: 1, inputQty: 100, lossQty: 10, lossRate: 0.1 }]);
  });
});
