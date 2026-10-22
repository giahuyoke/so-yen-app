import { beforeEach, describe, expect, test } from "vitest";
import { createSale } from "@/server/services/sales";
import { C, db, getDoc, getProduct, listMovements, owner, P, SHOP_ID } from "./helpers";
import { baseSale, S1, S2, S3, seedSalesData } from "./sales-fixtures";

beforeEach(seedSalesData);

describe("createSale", () => {
  test("trừ kho, chốt giá vốn, ghi công nợ khách và stats tháng", async () => {
    expect(await createSale(db(), SHOP_ID, owner, baseSale)).toEqual({ id: S1, code: "DH-2026-0001" });

    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 900, avgCost: 25_000 });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 8 });

    expect(await getDoc("sales", S1)).toMatchObject({
      code: "DH-2026-0001",
      customerId: C.lan,
      channel: "zalo",
      subtotal: 5_100_000,
      discount: 100_000,
      total: 5_000_000,
      paid: 3_000_000,
      debt: 2_000_000,
      status: "active",
      lines: [
        { productId: P.clean, qty: 100, price: 45_000, revenue: 4_411_765, totalCost: 2_500_000, unitCost: 25_000, taxGroup: "processed" },
        { productId: P.steamed, qty: 2, price: 300_000, revenue: 588_235, totalCost: 514_000, unitCost: 257_000, taxGroup: "processed" },
      ],
    });

    expect(await getDoc("customers", C.lan)).toMatchObject({
      debtBalance: 2_000_000,
      totalSpent: 5_000_000,
      lastPurchaseAt: "2026-10-22",
    });

    expect(await getDoc("stats", "2026-10")).toMatchObject({
      revenue: 5_000_000,
      cogs: 3_014_000,
      saleCount: 1,
      byChannel: { zalo: { revenue: 5_000_000, cogs: 3_014_000, count: 1 } },
      byProduct: { [P.clean]: { qty: 100, revenue: 4_411_765, cogs: 2_500_000 } },
      byTaxGroup: { processed: 5_000_000 },
    });

    expect((await listMovements(S1)).map((m) => m.qtyDelta).sort((a, b) => a - b)).toEqual([-100, -2]);
  });

  test("mã đơn tăng dần và đánh lại theo năm", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    expect((await createSale(db(), SHOP_ID, owner, { ...baseSale, id: S2 })).code).toBe("DH-2026-0002");
    expect((await createSale(db(), SHOP_ID, owner, { ...baseSale, id: S3, date: "2027-01-02" })).code).toBe("DH-2027-0001");
  });

  test("gửi trùng ID không bán hai lần", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    expect(await createSale(db(), SHOP_ID, owner, baseSale)).toEqual({ id: S1, code: "DH-2026-0001" });
    expect((await getProduct(P.clean)).stockQty).toBe(900);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
  });

  test("khách lẻ trả đủ: không cần chọn khách", async () => {
    await createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: null, paid: 5_000_000 });
    expect(await getDoc("sales", S1)).toMatchObject({ customerId: null, debt: 0 });
  });

  test("các ràng buộc", async () => {
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: null })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Đơn còn nợ phải chọn khách hàng.",
    });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, paid: 5_000_001 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, discount: 5_100_001 })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createSale(db(), SHOP_ID, owner, { ...baseSale, lines: [{ productId: P.sugar, qty: 1, price: 1 }], discount: 0, paid: 1 }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createSale(db(), SHOP_ID, owner, { ...baseSale, lines: [{ productId: P.steamed, qty: 11, price: 1 }], discount: 0, paid: 0 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
    await expect(createSale(db(), SHOP_ID, owner, { ...baseSale, customerId: C.ba })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
