import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import {
  PRODUCT_KIND_LABEL,
  PRODUCTION_INPUT_KINDS,
  PRODUCTION_KIND_LABEL,
  PRODUCTION_OUTPUT_KIND,
  type CostLine,
  type ProductionOutputLine,
} from "@/lib/domain/models";
import { computeProduction } from "@/lib/domain/production";
import { productionInput, voidInput } from "@/lib/domain/schemas";
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
  type MovementDraft,
} from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createProduction(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const p = productionInput.parse(input);
  const ids = [...p.inputs, ...p.outputs].map((l) => l.productId);
  if (new Set(ids).size !== ids.length) {
    throw new AppError("VALIDATION", "Mỗi sản phẩm chỉ xuất hiện một lần, và không thể vừa là nguyên liệu vừa là thành phẩm.");
  }
  const shop = shopRef(db, shopId);
  const ref = shop.collection("productions").doc(p.id);
  const label = PRODUCTION_KIND_LABEL[p.kind].toLowerCase();

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const products = await loadProducts(tx, shop, ids);

    const inputKinds = PRODUCTION_INPUT_KINDS[p.kind];
    const outputKind = PRODUCTION_OUTPUT_KIND[p.kind];
    const inputs: (CostLine & { unit: "g" | "piece" })[] = [];
    for (const line of p.inputs) {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!inputKinds.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" không dùng làm nguyên liệu khi ${label}.`);
      }
      inputs.push({ productId: line.productId, qty: line.qty, totalCost: takeStock(product, line.qty), unit: product.unit });
    }

    const outputs = p.outputs.map((line) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (product.kind !== outputKind) {
        throw new AppError("VALIDATION", `Thành phẩm khi ${label} phải là ${PRODUCT_KIND_LABEL[outputKind].toLowerCase()}.`);
      }
      return { ...line, unit: product.unit, gramPerUnit: product.unit === "g" ? 1 : line.gramPerUnit };
    });

    const result = computeProduction(p.kind, inputs, outputs);
    if (result.lossQty < 0) {
      throw new AppError("VALIDATION", "Khối lượng yến sau làm sạch không thể lớn hơn trước khi làm sạch.");
    }

    const outputLines: ProductionOutputLine[] = outputs.map((o, i) => {
      addStock(products.get(o.productId)!, o.qty, result.outputCosts[i]);
      return {
        productId: o.productId,
        qty: o.qty,
        gramPerUnit: o.gramPerUnit,
        totalCost: result.outputCosts[i],
        unitCost: result.unitCosts[i],
      };
    });
    const inputLines: CostLine[] = inputs.map(({ productId, qty, totalCost }) => ({ productId, qty, totalCost }));

    tx.set(ref, {
      kind: p.kind,
      date: p.date,
      note: p.note,
      inputs: inputLines,
      outputs: outputLines,
      totalCost: result.totalInputCost,
      lossQty: result.lossQty,
      lossRate: result.lossRate,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeProducts(tx, shop, products);
    const movements: MovementDraft[] = [
      ...inputLines.map((l) => ({ productId: l.productId, qtyDelta: -l.qty, costDelta: -l.totalCost })),
      ...outputLines.map((l) => ({ productId: l.productId, qtyDelta: l.qty, costDelta: l.totalCost })),
    ];
    writeMovements(tx, shop, { type: "production", id: p.id, date: p.date }, movements);
  });
  return { id: p.id };
}

export async function voidProduction(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("productions").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu chế biến.");
    if (snap.get("status") === "voided") return;
    const inputs = snap.get("inputs") as CostLine[];
    const outputs = snap.get("outputs") as ProductionOutputLine[];
    const date = snap.get("date") as string;
    const products = await loadProducts(tx, shop, [...inputs, ...outputs].map((l) => l.productId));

    const movements: MovementDraft[] = [];
    for (const o of outputs) {
      undoAddStock(products.get(o.productId)!, o.qty, o.totalCost);
      movements.push({ productId: o.productId, qtyDelta: -o.qty, costDelta: -o.totalCost });
    }
    for (const i of inputs) {
      addStock(products.get(i.productId)!, i.qty, i.totalCost);
      movements.push({ productId: i.productId, qtyDelta: i.qty, costDelta: i.totalCost });
    }

    tx.update(ref, voidFields(actor, v.reason));
    writeProducts(tx, shop, products);
    writeMovements(tx, shop, { type: "production", id: v.id, date }, movements, "_void");
  });
  return { id: v.id };
}
