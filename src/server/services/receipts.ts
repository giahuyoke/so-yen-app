import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { RECEIPT_ALLOWED_KINDS, RECEIPT_KIND_LABEL, type CostLine } from "@/lib/domain/models";
import { receiptInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import {
  addStock,
  loadProducts,
  requireActive,
  undoAddStock,
  voidFields,
  writeMovements,
  writeProducts,
  type MovementDraft,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createReceipt(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const r = receiptInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("receipts").doc(r.id);
  const supplierId = r.kind === "harvest" ? null : r.supplierId;
  const lines: CostLine[] = r.lines.map((l) => ({ ...l, totalCost: r.kind === "harvest" ? 0 : l.totalCost }));

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));
    if (supplierId && !(await tx.get(shop.collection("suppliers").doc(supplierId))).exists) {
      throw new AppError("NOT_FOUND", "Không tìm thấy nhà cung cấp.");
    }

    const allowed = RECEIPT_ALLOWED_KINDS[r.kind];
    const movements: MovementDraft[] = [];
    for (const line of lines) {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!allowed.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" không nhập được bằng phiếu ${RECEIPT_KIND_LABEL[r.kind].toLowerCase()}.`);
      }
      addStock(product, line.qty, line.totalCost);
      movements.push({ productId: line.productId, qtyDelta: line.qty, costDelta: line.totalCost });
    }

    tx.set(ref, {
      kind: r.kind,
      date: r.date,
      supplierId,
      note: r.note,
      lines,
      total: lines.reduce((sum, l) => sum + l.totalCost, 0),
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "receipt", id: r.id, date: r.date }, movements);
  });
  return { id: r.id };
}

export async function voidReceipt(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("receipts").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu nhập.");
    if (snap.get("status") === "voided") return;
    const lines = snap.get("lines") as CostLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, lines.map((l) => l.productId));

    const movements: MovementDraft[] = [];
    for (const line of [...lines].reverse()) {
      undoAddStock(products.get(line.productId)!, line.qty, line.totalCost);
      movements.push({ productId: line.productId, qtyDelta: -line.qty, costDelta: -line.totalCost });
    }

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "receipt", id: v.id, date }, movements, "_void");
  });
  return { id: v.id };
}
