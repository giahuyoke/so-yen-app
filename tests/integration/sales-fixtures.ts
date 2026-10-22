import { C, clearFirestore, P, seedCustomer, seedProduct, seedShop } from "./helpers";

export const S1 = "sale_00000001";
export const S2 = "sale_00000002";
export const S3 = "sale_00000003";

export const baseSale = {
  id: S1,
  date: "2026-10-22",
  customerId: C.lan,
  channel: "zalo",
  lines: [
    { productId: P.clean, qty: 100, price: 45_000 },
    { productId: P.steamed, qty: 2, price: 300_000 },
  ],
  discount: 100_000,
  paid: 3_000_000,
};

export async function seedSalesData() {
  await clearFirestore();
  await seedShop();
  await seedProduct(P.clean, { name: "Yến tinh tổ đẹp", kind: "clean", taxGroup: "processed", stockQty: 1000, avgCost: 25_000 });
  await seedProduct(P.steamed, { name: "Yến chưng 70ml", kind: "steamed", unit: "piece", taxGroup: "processed", stockQty: 10, avgCost: 257_000 });
  await seedProduct(P.sugar, { name: "Đường phèn", kind: "supply", unit: "piece", stockQty: 100, avgCost: 2_000 });
  await seedCustomer(C.lan, { name: "Chị Lan", type: "agent" });
}
