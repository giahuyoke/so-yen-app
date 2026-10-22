import { beforeEach, describe, expect, test } from "vitest";
import { createPayment, voidPayment } from "@/server/services/payments";
import { createSale, voidSale } from "@/server/services/sales";
import { C, clearFirestore, db, getDoc, owner, seedCustomer, seedShop, SHOP_ID } from "./helpers";
import { baseSale, S1, seedSalesData } from "./sales-fixtures";

const PAY1 = "pay_000000001";
const pay = { id: PAY1, customerId: C.lan, date: "2026-10-22", amount: 500_000, method: "transfer" };

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedCustomer(C.lan, { name: "Chị Lan", type: "agent", debtBalance: 2_000_000 });
});

describe("payments", () => {
  test("thu nợ giảm debtBalance và lưu phiếu", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(1_500_000);
    expect(await getDoc("payments", PAY1)).toMatchObject({ amount: 500_000, method: "transfer", status: "active", createdBy: owner.uid });
  });

  test("gửi trùng không thu hai lần", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    await createPayment(db(), SHOP_ID, owner, pay);
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(1_500_000);
  });

  test("không thu quá số nợ", async () => {
    await expect(createPayment(db(), SHOP_ID, owner, { ...pay, amount: 2_000_001 })).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Khách chỉ còn nợ 2.000.000\u00a0₫.",
    });
  });

  test("khách không tồn tại", async () => {
    await expect(createPayment(db(), SHOP_ID, owner, { ...pay, customerId: C.ba })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("hủy phiếu thu trả lại số nợ", async () => {
    await createPayment(db(), SHOP_ID, owner, pay);
    await voidPayment(db(), SHOP_ID, owner, { id: PAY1, reason: "Ghi nhầm" });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
    expect(await getDoc("payments", PAY1)).toMatchObject({ status: "voided", voidReason: "Ghi nhầm" });
    await voidPayment(db(), SHOP_ID, owner, { id: PAY1, reason: "Ghi nhầm" });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
  });
});

describe("payments gắn đơn", () => {
  // baseSale: tổng 5tr, khách trả 3tr, còn nợ 2tr.
  const P2 = "pay_000000002";
  const onSale = { id: P2, customerId: C.lan, saleId: S1, date: "2026-10-22", amount: 1_500_000, method: "cash" };

  beforeEach(async () => {
    await seedSalesData();
    await createSale(db(), SHOP_ID, owner, baseSale);
  });

  test("cộng vào collected của đơn và giảm nợ khách", async () => {
    await createPayment(db(), SHOP_ID, owner, onSale);
    expect(await getDoc("sales", S1)).toMatchObject({ collected: 1_500_000 });
    expect(await getDoc("payments", P2)).toMatchObject({ saleId: S1 });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(500_000);
  });

  test("không thu quá số còn nợ của đơn", async () => {
    await createPayment(db(), SHOP_ID, owner, onSale);
    await expect(createPayment(db(), SHOP_ID, owner, { ...onSale, id: PAY1, amount: 600_000 })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("đơn của khách khác hoặc không tồn tại", async () => {
    await expect(createPayment(db(), SHOP_ID, owner, { ...onSale, saleId: "sale_99999999" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("hủy phiếu trả lại collected của đơn", async () => {
    await createPayment(db(), SHOP_ID, owner, onSale);
    await voidPayment(db(), SHOP_ID, owner, { id: P2, reason: "Ghi nhầm" });
    expect(await getDoc("sales", S1)).toMatchObject({ collected: 0 });
    expect((await getDoc("customers", C.lan))?.debtBalance).toBe(2_000_000);
  });

  test("phiếu thu không gắn đơn lưu saleId null", async () => {
    await createPayment(db(), SHOP_ID, owner, { ...onSale, saleId: undefined });
    expect(await getDoc("payments", P2)).toMatchObject({ saleId: null });
    expect((await getDoc("sales", S1))?.collected).toBeUndefined();
  });

  test("không hủy được đơn đã có phiếu thu gắn đơn", async () => {
    await createPayment(db(), SHOP_ID, owner, { ...onSale, amount: 100_000 });
    await expect(voidSale(db(), SHOP_ID, owner, { id: S1, reason: "x" })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
