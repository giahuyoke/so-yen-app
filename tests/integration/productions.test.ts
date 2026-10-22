import { beforeEach, describe, expect, test } from "vitest";
import { createProduction, voidProduction } from "@/server/services/productions";
import { clearFirestore, db, getProduct, listMovements, owner, P, seedProduct, seedShop, SHOP_ID } from "./helpers";

const PR1 = "prod_doc_00001";
const PR2 = "prod_doc_00002";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.raw, { name: "Yến thô", stockQty: 1000, avgCost: 30_000 });
  await seedProduct(P.clean, { name: "Yến tinh tổ", kind: "clean" });
  await seedProduct(P.vun, { name: "Yến vụn", kind: "clean" });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece", stockQty: 100, avgCost: 2_000 });
  await seedProduct(P.jar, { name: "Hũ thủy tinh", kind: "supply", unit: "piece", stockQty: 100, avgCost: 5_000 });
  await seedProduct(P.steamed, { name: "Yến chưng 70ml", kind: "steamed", unit: "piece" });
});

const clean = {
  id: PR1, kind: "clean", date: "2026-10-22",
  inputs: [{ productId: P.raw, qty: 1000 }],
  outputs: [
    { productId: P.clean, qty: 700, gramPerUnit: 1 },
    { productId: P.vun, qty: 100, gramPerUnit: 1 },
  ],
};

describe("createProduction", () => {
  test("làm sạch: trừ thô, cộng tinh chế theo giá vốn chia theo gram, lưu hao hụt", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 0, avgCost: 30_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 700, avgCost: 37_500 });
    expect(await getProduct(P.vun)).toMatchObject({ stockQty: 100, avgCost: 37_500 });

    const doc = await db().collection("shops").doc(SHOP_ID).collection("productions").doc(PR1).get();
    expect(doc.data()).toMatchObject({
      kind: "clean", totalCost: 30_000_000, lossQty: 200, lossRate: 0.2, status: "active",
      inputs: [{ productId: P.raw, qty: 1000, totalCost: 30_000_000 }],
      outputs: [
        { productId: P.clean, qty: 700, gramPerUnit: 1, totalCost: 26_250_000, unitCost: 37_500 },
        { productId: P.vun, qty: 100, gramPerUnit: 1, totalCost: 3_750_000, unitCost: 37_500 },
      ],
    });
    expect((await listMovements(PR1)).map((m) => m.qtyDelta).sort((a, b) => a - b)).toEqual([-1000, 100, 700]);
  });

  test("chưng: gộp giá vốn yến và vật tư vào hũ", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await createProduction(db(), SHOP_ID, owner, {
      id: PR2, kind: "steam", date: "2026-10-22",
      inputs: [
        { productId: P.clean, qty: 100 },
        { productId: P.sugar, qty: 10 },
        { productId: P.jar, qty: 10 },
      ],
      outputs: [{ productId: P.steamed, qty: 10, gramPerUnit: 10 }],
    });
    expect(await getProduct(P.steamed)).toMatchObject({ stockQty: 10, avgCost: 382_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 600 });
  });

  test("gramPerUnit của đầu ra tính bằng gram luôn lưu là 1", async () => {
    await createProduction(db(), SHOP_ID, owner, {
      ...clean,
      outputs: [{ productId: P.clean, qty: 800, gramPerUnit: 50 }],
    });
    const doc = await db().collection("shops").doc(SHOP_ID).collection("productions").doc(PR1).get();
    expect(doc.get("outputs")[0].gramPerUnit).toBe(1);
  });

  test("báo lỗi khi không đủ tồn", async () => {
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 1200 }] }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK", message: expect.stringContaining("Yến thô chỉ còn 1.000g") });
  });

  test("chặn sai loại, đầu ra nặng hơn đầu vào, trùng sản phẩm", async () => {
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, outputs: [{ productId: P.steamed, qty: 1, gramPerUnit: 1 }] }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createProduction(db(), SHOP_ID, owner, { ...clean, outputs: [{ productId: P.clean, qty: 1100, gramPerUnit: 1 }] }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      createProduction(db(), SHOP_ID, owner, {
        ...clean,
        inputs: [{ productId: P.raw, qty: 100 }, { productId: P.raw, qty: 100 }],
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });

  test("gửi trùng ID không chế biến hai lần", async () => {
    await createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 500 }], outputs: [{ productId: P.clean, qty: 400, gramPerUnit: 1 }] });
    await createProduction(db(), SHOP_ID, owner, { ...clean, inputs: [{ productId: P.raw, qty: 500 }], outputs: [{ productId: P.clean, qty: 400, gramPerUnit: 1 }] });
    expect((await getProduct(P.raw)).stockQty).toBe(500);
  });
});

describe("voidProduction", () => {
  test("hủy: trả nguyên liệu, rút thành phẩm", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await voidProduction(db(), SHOP_ID, owner, { id: PR1, reason: "Nhập nhầm" });
    expect(await getProduct(P.raw)).toMatchObject({ stockQty: 1000, avgCost: 30_000 });
    expect(await getProduct(P.clean)).toMatchObject({ stockQty: 0 });
    expect(await getProduct(P.vun)).toMatchObject({ stockQty: 0 });
  });

  test("không hủy được khi thành phẩm đã dùng", async () => {
    await createProduction(db(), SHOP_ID, owner, clean);
    await createProduction(db(), SHOP_ID, owner, {
      id: PR2, kind: "steam", date: "2026-10-22",
      inputs: [{ productId: P.clean, qty: 100 }],
      outputs: [{ productId: P.steamed, qty: 10, gramPerUnit: 10 }],
    });
    await expect(voidProduction(db(), SHOP_ID, owner, { id: PR1, reason: "x" })).rejects.toMatchObject({
      code: "INSUFFICIENT_STOCK",
    });
  });
});
