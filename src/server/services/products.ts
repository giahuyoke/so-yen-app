import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { productInput, productUpdateInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import { shopRef } from "@/server/services/membership";

export async function createProduct(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const { id, ...fields } = productInput.parse(input);
  const ref = shopRef(db, shopId).collection("products").doc(id);
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      ...fields,
      gramPerUnit: fields.unit === "piece" ? fields.gramPerUnit : null,
      stockQty: 0,
      avgCost: 0,
      archived: false,
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { id };
}

/** Loại và đơn vị không đổi được sau khi tạo, vì tồn kho đã tính theo đơn vị đó. */
export async function updateProduct(db: Firestore, shopId: string, input: unknown) {
  const { id, ...fields } = productUpdateInput.parse(input);
  const ref = shopRef(db, shopId).collection("products").doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm.");
  const gramPerUnit = snap.get("unit") === "piece" ? fields.gramPerUnit : null;
  await ref.update({ ...fields, gramPerUnit, updatedAt: FieldValue.serverTimestamp() });
  return { id };
}
