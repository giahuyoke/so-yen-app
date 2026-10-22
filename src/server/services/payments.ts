import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { AppError } from "@/lib/domain/errors";
import { formatVnd } from "@/lib/domain/money";
import { paymentInput, voidInput } from "@/lib/domain/schemas";
import type { Actor } from "@/server/actor";
import { voidFields } from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";

export async function createPayment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const p = paymentInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("payments").doc(p.id);
  const customerRef = shop.collection("customers").doc(p.customerId);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    const customer = await tx.get(customerRef);
    if (!customer.exists) throw new AppError("NOT_FOUND", "Không tìm thấy khách hàng.");
    const balance = (customer.get("debtBalance") as number | undefined) ?? 0;
    if (p.amount > balance) throw new AppError("VALIDATION", `Khách chỉ còn nợ ${formatVnd(balance)}.`);

    tx.set(ref, {
      customerId: p.customerId,
      date: p.date,
      amount: p.amount,
      method: p.method,
      note: p.note,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(customerRef, { debtBalance: FieldValue.increment(-p.amount) });
  });
  return { id: p.id };
}

export async function voidPayment(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("payments").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy phiếu thu.");
    if (snap.get("status") === "voided") return;
    const customerRef = shop.collection("customers").doc(snap.get("customerId") as string);
    tx.update(ref, voidFields(actor, v.reason));
    tx.update(customerRef, { debtBalance: FieldValue.increment(snap.get("amount") as number) });
  });
  return { id: v.id };
}
