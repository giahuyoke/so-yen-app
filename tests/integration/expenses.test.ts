import { beforeEach, describe, expect, test } from "vitest";
import { createExpense, voidExpense } from "@/server/services/expenses";
import { clearFirestore, db, getDoc, owner, seedShop, SHOP_ID } from "./helpers";

const EXP1 = "exp_000000001";
const expense = { id: EXP1, date: "2026-10-22", category: "ads", amount: 300_000, note: "Chạy quảng cáo Facebook" };

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
});

describe("expenses", () => {
  test("ghi khoản chi và cộng vào stats tháng", async () => {
    await createExpense(db(), SHOP_ID, owner, expense);
    await createExpense(db(), SHOP_ID, owner, { ...expense, id: "exp_000000002", category: "nest", amount: 200_000 });
    expect(await getDoc("expenses", EXP1)).toMatchObject({ amount: 300_000, category: "ads", status: "active", createdBy: owner.uid });
    expect(await getDoc("stats", "2026-10")).toMatchObject({ expenses: 500_000, expensesByCategory: { ads: 300_000, nest: 200_000 } });
  });

  test("gửi trùng không ghi hai lần", async () => {
    await createExpense(db(), SHOP_ID, owner, expense);
    await createExpense(db(), SHOP_ID, owner, expense);
    expect((await getDoc("stats", "2026-10"))?.expenses).toBe(300_000);
  });

  test("số tiền phải lớn hơn 0", async () => {
    await expect(createExpense(db(), SHOP_ID, owner, { ...expense, amount: 0 })).rejects.toThrow();
  });

  test("hủy khoản chi trừ lại stats, hủy lần hai không đổi", async () => {
    await createExpense(db(), SHOP_ID, owner, expense);
    await voidExpense(db(), SHOP_ID, owner, { id: EXP1, reason: "Nhập nhầm" });
    await voidExpense(db(), SHOP_ID, owner, { id: EXP1, reason: "Nhập nhầm" });
    expect(await getDoc("expenses", EXP1)).toMatchObject({ status: "voided", voidReason: "Nhập nhầm" });
    expect(await getDoc("stats", "2026-10")).toMatchObject({ expenses: 0, expensesByCategory: { ads: 0 } });
  });
});
