import { beforeEach, describe, expect, test } from "vitest";
import { createAdjustment, voidAdjustment } from "@/server/services/adjustments";
import { clearFirestore, db, getProduct, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const A1 = "adj_000000001";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.clean, { name: "Yến tinh", kind: "clean", stockQty: 500, avgCost: 40_000 });
});

describe("adjustments", () => {
  test("giảm kho theo giá vốn bình quân", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "Kiểm kho thiếu", lines: [{ productId: P.clean, qtyDelta: -20 }],
    });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 480, avgCost: 40_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("adjustments").doc(A1).get();
    expect(doc.get("lines")).toEqual([{ productId: P.clean, qtyDelta: -20, costDelta: -800_000 }]);
  });

  test("tăng kho giữ nguyên giá vốn bình quân", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "Kiểm kho dư", lines: [{ productId: P.clean, qtyDelta: 30 }],
    });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 530, avgCost: 40_000 });
  });

  test("không giảm quá tồn", async () => {
    await expect(
      createAdjustment(db(), SHOP_ID, owner, {
        id: A1, date: "2026-10-22", reason: "x", lines: [{ productId: P.clean, qtyDelta: -600 }],
      }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });
  });

  test("hủy điều chỉnh trả lại như cũ", async () => {
    await createAdjustment(db(), SHOP_ID, owner, {
      id: A1, date: "2026-10-22", reason: "x", lines: [{ productId: P.clean, qtyDelta: -20 }],
    });
    await voidAdjustment(db(), SHOP_ID, owner, { id: A1, reason: "Đếm lại đủ" });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 500, avgCost: 40_000 });
  });
});
