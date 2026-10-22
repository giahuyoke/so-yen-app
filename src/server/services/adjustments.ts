import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import type { AdjustmentLine } from "@/lib/domain/models";
import { adjustmentInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  takeStock,
  undoAddStock,
  voidFields,
  writeMovements,
  writeProducts,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createAdjustment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const a = adjustmentInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("adjustments").doc(a.id);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, a.lines.map((l) => l.productId));

    const lines: AdjustmentLine[] = a.lines.map((line) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (line.qtyDelta < 0) {
        return { productId: line.productId, qtyDelta: line.qtyDelta, costDelta: -takeStock(product, -line.qtyDelta) };
      }
      const costDelta = line.qtyDelta * product.avgCost;
      addStock(product, line.qtyDelta, costDelta);
      return { productId: line.productId, qtyDelta: line.qtyDelta, costDelta };
    });

    tx.set(ref, {
      date: a.date,
      reason: a.reason,
      lines,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "adjustment", id: a.id, date: a.date }, lines);
  });
  return { id: a.id };
}

export async function voidAdjustment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("adjustments").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu điều chỉnh.");
    if (snap.get("status") === "voided") return;
    const lines = snap.get("lines") as AdjustmentLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));

    const reversed = lines.map((line) => {
      const product = products.get(line.productId)!;
      if (line.qtyDelta > 0) undoAddStock(product, line.qtyDelta, line.costDelta);
      else addStock(product, -line.qtyDelta, -line.costDelta);
      return { productId: line.productId, qtyDelta: -line.qtyDelta, costDelta: -line.costDelta };
    });

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "adjustment", id: v.id, date }, reversed, "_void");
  });
  return { id: v.id };
}
