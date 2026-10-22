import { beforeEach, describe, expect, test } from "vitest";
import { createPayment, voidPayment } from "@/server/services/payments";
import { C, clearFirestore, db, getDoc, owner, seedCustomer, seedShop, SHOP_ID } from "./helpers";

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
      message: "Khách chỉ còn nợ 2.000.000 ₫.",
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
