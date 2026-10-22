import { beforeEach, describe, expect, test } from "vitest";
import { createReceipt, voidReceipt } from "@/server/services/receipts";
import { clearFirestore, db, getProduct, listMovements, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const R1 = "rcpt_00000001";
const R2 = "rcpt_00000002";
const R3 = "rcpt_00000003";
const SUPPLIER = "supp_00000001";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.raw, { name: "Yến thô" });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece" });
  await seedProduct(P.clean, { name: "Yến tinh", kind: "clean" });
  await db().collection("shops").doc(SHOP_ID).collection("suppliers").doc(SUPPLIER).set({ name: "Anh Ba" });
});

const purchase = (id: string, qty: number, totalCost: number) => ({
  id, kind: "purchase", date: "2026-10-22", supplierId: SUPPLIER,
  lines: [{ productId: P.raw, qty, totalCost }],
});

describe("createReceipt", () => {
  test("mua hàng: tính bình quân gia quyền, ghi chứng từ và movements", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1500, avgCost: 32_000 });

    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.data()).toMatchObject({ kind: "purchase", total: 18_000_000, status: "active", createdBy: owner.uid });
    expect(await listMovements(R2)).toEqual([
      expect.objectContaining({ productId: P.raw, qtyDelta: 500, costDelta: 18_000_000, sourceType: "receipt" }),
    ]);
  });

  test("thu hoạch: giá vốn luôn 0 dù client gửi số khác", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, {
      id: R2, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.raw, qty: 500, totalCost: 999 }],
    });
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1500, avgCost: 20_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.get("supplierId")).toBeNull();
  });

  test("gửi trùng ID không nhập hai lần", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    expect((await getProduct(P.raw)).stockQty).toBe(1000);
  });

  test("chặn loại sản phẩm không hợp lệ", async () => {
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.sugar, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "purchase", date: "2026-10-22", lines: [{ productId: P.clean, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("chặn sản phẩm đã lưu trữ, nhà cung cấp không tồn tại", async () => {
    await seedProduct(P.raw2, { name: "Cũ", archived: true });
    await expect(
      createReceipt(db(), SHOP_ID, owner, {
        id: R1, kind: "harvest", date: "2026-10-22", lines: [{ productId: P.raw2, qty: 1, totalCost: 0 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createReceipt(db(), SHOP_ID, owner, { ...purchase(R1, 1, 1), supplierId: "supp_missing01" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("voidReceipt", () => {
  test("hủy: trả lại kho và bình quân trước đó, ghi movements đảo", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "Nhập nhầm" });

    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1000, avgCost: 30_000 });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("receipts").doc(R2).get();
    expect(doc.data()).toMatchObject({ status: "voided", voidReason: "Nhập nhầm" });
    expect((await listMovements(R2)).map((m) => m.qtyDelta).sort()).toEqual([-500, 500]);
  });

  test("hủy hai lần không đảo hai lần", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R1, 1000, 30_000_000));
    await createReceipt(db(), SHOP_ID, owner, purchase(R2, 500, 18_000_000));
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "x" });
    await voidReceipt(db(), SHOP_ID, owner, { id: R2, reason: "x" });
    expect((await getProduct(P.raw)).stockQty).toBe(1000);
  });

  test("không hủy được khi hàng đã dùng hết", async () => {
    await createReceipt(db(), SHOP_ID, owner, purchase(R3, 100, 3_000_000));
    await db().collection("shops").doc(SHOP_ID).collection("products").doc(P.raw).update({ stockQty: 40 });
    await expect(voidReceipt(db(), SHOP_ID, owner, { id: R3, reason: "x" })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });

  test("NOT_FOUND khi không có phiếu", async () => {
    await expect(voidReceipt(db(), SHOP_ID, owner, { id: R1, reason: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
