import { beforeEach, describe, expect, test } from "vitest";
import { createSale, voidSale } from "@/server/services/sales";
import { C, db, getDoc, getProduct, listMovements, owner, P, SHOP_ID } from "./helpers";
import { baseSale, S1, seedSalesData } from "./sales-fixtures";

beforeEach(seedSalesData);

describe("voidSale", () => {
  test("trả lại kho, công nợ, doanh số khách và stats", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "Khách đổi ý" });

    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 1000, avgCost: 25_000 });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 10, avgCost: 257_000 });
    expect(await getDoc("sales", S1)).toMatchObject({ status: "voided", voidReason: "Khách đổi ý" });
    expect(await getDoc("customers", C.lan)).toMatchObject({ debtBalance: 0, totalSpent: 0 });
    expect(await getDoc("stats", "2026-10")).toMatchObject({
      revenue: 0,
      cogs: 0,
      saleCount: 0,
      byChannel: { zalo: { revenue: 0, cogs: 0, count: 0 } },
    });
    expect(await listMovements(S1)).toHaveLength(4);
  });

  test("hủy hai lần không trả hai lần", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" });
    await voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" });
    expect((await getProduct(P.clean)).stockQty).toBe(1000);
  });

  test("chặn khi khách đã trả bớt nợ của đơn", async () => {
    await createSale(db(), SHOP_ID, owner, baseSale);
    await db().collection("shops").doc(SHOP_ID).collection("customers").doc(C.lan).update({ debtBalance: 500_000 });
    await expect(voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("NOT_FOUND khi không có đơn", async () => {
    await expect(voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
