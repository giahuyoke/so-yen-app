import type { Firestore } from "firebase-admin/firestore";
import type { Product } from "@/lib/domain/models";
import type { Actor } from "@/server/actor";
import { getAdminDb } from "@/server/firebase-admin";

export const PROJECT_ID = "demo-so-yen";
export const SHOP_ID = "shop_test_01";

export const owner: Actor = { uid: "u_owner", email: "chu@example.com", emailVerified: true, name: "Chủ" };
export const sister: Actor = { uid: "u_sister", email: "em@example.com", emailVerified: true, name: "Em" };
export const stranger: Actor = { uid: "u_stranger", email: "la@example.com", emailVerified: true, name: "Lạ" };

/** ID sản phẩm dùng trong test, đủ 10–40 ký tự theo schema. */
export const P = {
  raw: "prod_raw_0001",
  raw2: "prod_raw_0002",
  clean: "prod_clean_001",
  vun: "prod_vun_00001",
  sugar: "prod_sugar_001",
  jar: "prod_jar_00001",
  steamed: "prod_steam_001",
  box: "prod_box_00001",
  combo: "prod_combo_001",
} as const;

export function db(): Firestore {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error("Chạy test tích hợp bằng `npm run test:emulator`");
  }
  return getAdminDb();
}

export async function clearFirestore() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(`http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, {
    method: "DELETE",
  });
}

export async function seedShop(memberUids: string[] = [owner.uid]) {
  await db().collection("shops").doc(SHOP_ID).set({
    name: "Yến Test",
    ownerUid: owner.uid,
    memberUids,
    counters: { sale: 0 },
  });
}

const productDefaults: Omit<Product, "id"> = {
  name: "SP",
  kind: "raw",
  unit: "g",
  suggestedPrice: 0,
  lowStockThreshold: 0,
  taxGroup: "self_raw",
  stockQty: 0,
  avgCost: 0,
  archived: false,
};

export async function seedProduct(id: string, overrides: Partial<Omit<Product, "id">> = {}) {
  await db().collection("shops").doc(SHOP_ID).collection("products").doc(id).set({ ...productDefaults, ...overrides });
}

export async function getProduct(id: string): Promise<Product> {
  const snap = await db().collection("shops").doc(SHOP_ID).collection("products").doc(id).get();
  return { id: snap.id, ...(snap.data() as Omit<Product, "id">) };
}

export async function listMovements(sourceId: string) {
  const snap = await db()
    .collection("shops")
    .doc(SHOP_ID)
    .collection("movements")
    .where("sourceId", "==", sourceId)
    .get();
  return snap.docs.map((d) => d.data()).sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
}
