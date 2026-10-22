import { describe, expect, test } from "vitest";
import { saleStatsDelta } from "@/lib/domain/stats";

const sale = {
  channel: "zalo" as const,
  lines: [
    { productId: "a", qty: 100, revenue: 4_411_765, totalCost: 2_500_000, taxGroup: "processed" as const },
    { productId: "b", qty: 2, revenue: 588_235, totalCost: 514_000, taxGroup: "processed" as const },
    { productId: "a", qty: 10, revenue: 450_000, totalCost: 250_000, taxGroup: "processed" as const },
  ],
};

describe("saleStatsDelta", () => {
  test("cộng doanh thu, giá vốn, theo kênh, sản phẩm và nhóm thuế", () => {
    expect(saleStatsDelta(sale, 1)).toEqual({
      revenue: 5_450_000,
      cogs: 3_264_000,
      saleCount: 1,
      byChannel: { zalo: { revenue: 5_450_000, cogs: 3_264_000, count: 1 } },
      byProduct: {
        a: { qty: 110, revenue: 4_861_765, cogs: 2_750_000 },
        b: { qty: 2, revenue: 588_235, cogs: 514_000 },
      },
      byTaxGroup: { processed: 5_450_000 },
    });
  });

  test("sign -1 cho ra số âm để hủy đơn", () => {
    const d = saleStatsDelta(sale, -1);
    expect(d.revenue).toBe(-5_450_000);
    expect(d.saleCount).toBe(-1);
    expect(d.byProduct.a.qty).toBe(-110);
    expect(d.byChannel.zalo).toEqual({ revenue: -5_450_000, cogs: -3_264_000, count: -1 });
  });
});
