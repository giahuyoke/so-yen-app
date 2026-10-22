import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import type { Product } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";
import { InsufficientStockError, reverseStockIn, stockIn, stockOut } from "@/lib/domain/stock";
import type { Actor } from "@/server/actor";

export type ProductMap = Map<string, Product>;

export interface MovementDraft {
  productId: string;
  qtyDelta: number;
  costDelta: number;
}

export type SourceType = "receipt" | "production" | "adjustment";

/** Đọc các sản phẩm trong transaction. Phải gọi trước mọi lệnh ghi. */
export async function loadProducts(tx: Transaction, shop: DocumentReference, ids: string[]): Promise<ProductMap> {
  const refs = [...new Set(ids)].map((id) => shop.collection("products").doc(id));
  const snaps = refs.length ? await tx.getAll(...refs) : [];
  const map: ProductMap = new Map();
  for (const snap of snaps) {
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm.");
    map.set(snap.id, { id: snap.id, ...(snap.data() as Omit<Product, "id">) });
  }
  return map;
}

export function requireActive(product: Product) {
  if (product.archived) {
    throw new AppError("VALIDATION", `Sản phẩm "${product.name}" đã ngừng sử dụng.`);
  }
}

function insufficient(product: Product, error: InsufficientStockError, voiding: boolean): AppError {
  const base = `${product.name} chỉ còn ${formatQty(error.available, product.unit)}, không đủ ${formatQty(error.requested, product.unit)}.`;
  return new AppError(
    "INSUFFICIENT_STOCK",
    voiding ? `Không thể hủy: ${base} Hãy hủy các chứng từ đã dùng số hàng này trước.` : base,
  );
}

/** Nhập vào kho; cập nhật sản phẩm trong map. */
export function addStock(product: Product, qty: number, totalCost: number) {
  Object.assign(product, stockIn(product, qty, totalCost));
}

/** Xuất khỏi kho theo giá vốn bình quân; trả về tổng giá vốn đã xuất. */
export function takeStock(product: Product, qty: number): number {
  try {
    const { state, totalCost } = stockOut(product, qty);
    Object.assign(product, state);
    return totalCost;
  } catch (error) {
    if (error instanceof InsufficientStockError) throw insufficient(product, error, false);
    throw error;
  }
}

/** Đảo một lần nhập khi hủy chứng từ. */
export function undoAddStock(product: Product, qty: number, totalCost: number) {
  try {
    Object.assign(product, reverseStockIn(product, qty, totalCost));
  } catch (error) {
    if (error instanceof InsufficientStockError) throw insufficient(product, error, true);
    throw error;
  }
}

export function writeProducts(tx: Transaction, shop: DocumentReference, products: ProductMap) {
  for (const p of products.values()) {
    tx.update(shop.collection("products").doc(p.id), {
      stockQty: p.stockQty,
      avgCost: p.avgCost,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

/** ID movement cố định theo chứng từ, nên ghi lại cũng không bị nhân đôi. */
export function writeMovements(
  tx: Transaction,
  shop: DocumentReference,
  source: { type: SourceType; id: string; date: string },
  drafts: MovementDraft[],
  suffix = "",
) {
  drafts.forEach((m, i) => {
    tx.set(shop.collection("movements").doc(`${source.id}${suffix}_${i}`), {
      ...m,
      sourceType: source.type,
      sourceId: source.id,
      date: source.date,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

export function voidFields(actor: Actor, reason: string) {
  return {
    status: "voided",
    voidReason: reason,
    voidedBy: actor.uid,
    voidedAt: FieldValue.serverTimestamp(),
  };
}
