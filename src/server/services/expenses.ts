import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { monthKey } from "@/lib/domain/dates";
import { AppError } from "@/lib/domain/errors";
import type { ExpenseCategory } from "@/lib/domain/models";
import { expenseInput, voidInput } from "@/lib/domain/schemas";
import { expenseStatsDelta } from "@/lib/domain/stats";
import type { Actor } from "@/server/actor";
import { voidFields } from "@/server/services/inventory";
import { shopRef } from "@/server/services/membership";
import { writeExpenseStats } from "@/server/services/stats";

export async function createExpense(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const e = expenseInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("expenses").doc(e.id);

  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) return;
    tx.set(ref, {
      date: e.date,
      category: e.category,
      amount: e.amount,
      note: e.note,
      status: "active",
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    writeExpenseStats(tx, shop, monthKey(e.date), expenseStatsDelta(e, 1));
  });
  return { id: e.id };
}

export async function voidExpense(db: Firestore, shopId: string, actor: Actor, input: unknown) {
  const v = voidInput.parse(input);
  const shop = shopRef(db, shopId);
  const ref = shop.collection("expenses").doc(v.id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new AppError("NOT_FOUND", "Không tìm thấy khoản chi.");
    if (snap.get("status") === "voided") return;
    const expense = { category: snap.get("category") as ExpenseCategory, amount: snap.get("amount") as number };
    tx.update(ref, voidFields(actor, v.reason));
    writeExpenseStats(tx, shop, monthKey(snap.get("date") as string), expenseStatsDelta(expense, -1));
  });
  return { id: v.id };
}
