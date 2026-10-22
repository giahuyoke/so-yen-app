import { FieldValue, type DocumentReference, type Transaction } from "firebase-admin/firestore";
import type { ExpenseStatsDelta, StatsDelta } from "@/lib/domain/stats";

const inc = (n: number) => FieldValue.increment(n);

function mapValues<T, U>(record: Partial<Record<string, T>>, fn: (value: T) => U): Record<string, U> {
  return Object.fromEntries(
    Object.entries(record)
      .filter((entry): entry is [string, T] => entry[1] !== undefined)
      .map(([key, value]) => [key, fn(value)]),
  );
}

/** Cộng delta vào stats/{month} bằng increment, nên các đơn đồng thời không ghi đè nhau. */
export function writeSaleStats(tx: Transaction, shop: DocumentReference, month: string, delta: StatsDelta) {
  tx.set(
    shop.collection("stats").doc(month),
    {
      revenue: inc(delta.revenue),
      cogs: inc(delta.cogs),
      saleCount: inc(delta.saleCount),
      byChannel: mapValues(delta.byChannel, (c) => ({ revenue: inc(c.revenue), cogs: inc(c.cogs), count: inc(c.count) })),
      byProduct: mapValues(delta.byProduct, (p) => ({ qty: inc(p.qty), revenue: inc(p.revenue), cogs: inc(p.cogs) })),
      byTaxGroup: mapValues(delta.byTaxGroup, inc),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

export function writeExpenseStats(tx: Transaction, shop: DocumentReference, month: string, delta: ExpenseStatsDelta) {
  tx.set(
    shop.collection("stats").doc(month),
    {
      expenses: inc(delta.expenses),
      expensesByCategory: mapValues(delta.expensesByCategory, inc),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}
