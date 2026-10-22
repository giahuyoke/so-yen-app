import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { unitCostOf } from "@/lib/domain/costing";
import { monthKey } from "@/lib/domain/dates";
import { AppError } from "@/lib/domain/errors";
import { SELLABLE_KINDS, type SaleLine } from "@/lib/domain/models";
import { computeSale, nextSaleSeq, saleCode } from "@/lib/domain/sale";
import { saleInput } from "@/lib/domain/schemas";
import { saleStatsDelta } from "@/lib/domain/stats";
import type { Actor } from "@/server/actor";
import { loadProducts, requireActive, takeStock, writeMovements, writeProducts } from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";
import { writeSaleStats } from "@/server/services/stats";

export async function createSale(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const s = saleInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("sales").doc(s.id);
  const customerRef = s.customerId ? shop.collection("customers").doc(s.customerId) : null;

  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return { id: s.id, code: existing.get("code") as string };
    const shopSnap = await tx.get(shop);
    const customerSnap = customerRef ? await tx.get(customerRef) : null;
    if (customerSnap && !customerSnap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng.");
    const products = await loadProducts(tx, shop, s.lines.map((l) => l.productId));

    const totals = computeSale(s.lines, s.discount, s.paid);
    if (s.discount > totals.subtotal) throw new AppError("VALIDATION", "Giảm giá không được lớn hơn tạm tính.");
    if (s.paid > totals.total) throw new AppError("VALIDATION", "Số tiền khách trả không được lớn hơn tổng đơn.");
    if (totals.debt > 0 && !customerRef) throw new AppError("VALIDATION", "Đơn còn nợ phải chọn khách hàng.");

    const lines: SaleLine[] = s.lines.map((line, i) => {
      const product = products.get(line.productId)!;
      requireActive(product);
      if (!SELLABLE_KINDS.includes(product.kind)) {
        throw new AppError("VALIDATION", `"${product.name}" là vật tư, không bán được.`);
      }
      const totalCost = takeStock(product, line.qty);
      return {
        productId: line.productId,
        qty: line.qty,
        price: line.price,
        revenue: totals.lineRevenue[i],
        totalCost,
        unitCost: unitCostOf(totalCost, line.qty),
        taxGroup: product.taxGroup,
      };
    });

    const year = Number(s.date.slice(0, 4));
    const seq = nextSaleSeq(shopSnap.get("counters"), year);
    const code = saleCode(year, seq);

    tx.update(shop, { "counters.sale": seq, "counters.saleYear": year });
    tx.set(ref, {
      code,
      date: s.date,
      customerId: s.customerId,
      channel: s.channel,
      note: s.note,
      lines,
      subtotal: totals.subtotal,
      discount: s.discount,
      total: totals.total,
      paid: s.paid,
      debt: totals.debt,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (customerRef && customerSnap) {
      const last = customerSnap.get("lastPurchaseAt") as string | undefined;
      tx.update(customerRef, {
        debtBalance: FieldValue.increment(totals.debt),
        totalSpent: FieldValue.increment(totals.total),
        lastPurchaseAt: !last || s.date > last ? s.date : last,
      });
    }
    writeProducts(tx, shop, products);
    writeMovements(
      tx,
      shop,
      { type: "sale", id: s.id, date: s.date },
      lines.map((l) => ({ productId: l.productId, qtyDelta: -l.qty, costDelta: -l.totalCost })),
    );
    writeSaleStats(tx, shop, monthKey(s.date), saleStatsDelta({ channel: s.channel, lines }, 1));
    return { id: s.id, code };
  });
}
