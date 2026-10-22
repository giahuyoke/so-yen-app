import { beforeEach, describe, expect, test } from "vitest";
import { createProduct, updateProduct } from "@/server/services/products";
import { clearFirestore, db, getProduct, owner, P, seedShop, SHOP_ID } from "./helpers";

beforeEach(async () => {
  await clearFirestore();
  await seedShop();
});

const input = {
  id: P.raw, name: "Yến thô nhà", kind: "raw", unit: "g",
  suggestedPrice: 30_000, lowStockThreshold: 200, taxGroup: "self_raw",
};

describe("createProduct", () => {
  test("tồn và giá vốn bắt đầu từ 0", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    expect(await getProduct(P.raw)).toMatchObject({ name: "Yến thô nhà", stockQty: 0, avgCost: 0, archived: false });
  });

  test("gửi trùng ID không ghi đè", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    await createProduct(db(), SHOP_ID, owner, { ...input, name: "Tên khác" });
    expect((await getProduct(P.raw)).name).toBe("Yến thô nhà");
  });
});

describe("gramPerUnit", () => {
  const jar = { id: P.steamed, name: "Yến chưng 70ml", kind: "steamed", unit: "piece", suggestedPrice: 75_000, lowStockThreshold: 0, taxGroup: "processed" };

  test("lưu cho hàng tính theo cái, bỏ qua với hàng tính theo gram", async () => {
    await createProduct(db(), SHOP_ID, owner, { ...jar, gramPerUnit: 3 });
    await createProduct(db(), SHOP_ID, owner, { ...input, gramPerUnit: 5 });
    expect((await getProduct(P.steamed)).gramPerUnit).toBe(3);
    expect((await getProduct(P.raw)).gramPerUnit).toBeNull();
  });

  test("sửa được khi cập nhật sản phẩm", async () => {
    await createProduct(db(), SHOP_ID, owner, jar);
    expect((await getProduct(P.steamed)).gramPerUnit).toBeNull();
    await updateProduct(db(), SHOP_ID, { ...jar, gramPerUnit: 4, archived: false });
    expect((await getProduct(P.steamed)).gramPerUnit).toBe(4);
  });
});

describe("updateProduct", () => {
  test("sửa tên, giá và lưu trữ; không đổi tồn", async () => {
    await createProduct(db(), SHOP_ID, owner, input);
    await updateProduct(db(), SHOP_ID, {
      id: P.raw, name: "Yến thô A", suggestedPrice: 32_000, lowStockThreshold: 100, taxGroup: "self_raw", archived: true,
    });
    expect(await getProduct(P.raw)).toMatchObject({ name: "Yến thô A", suggestedPrice: 32_000, archived: true, stockQty: 0, kind: "raw" });
  });

  test("NOT_FOUND khi không có sản phẩm", async () => {
    await expect(
      updateProduct(db(), SHOP_ID, { id: P.clean, name: "x", suggestedPrice: 0, lowStockThreshold: 0, taxGroup: "processed", archived: false }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
