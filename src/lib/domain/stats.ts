import type { ExpenseCategory, SaleChannel, SaleLine, TaxGroup } from "@/lib/domain/models";

export interface StatsDelta {
  revenue: number;
  cogs: number;
  saleCount: number;
  byChannel: Partial<Record<SaleChannel, { revenue: number; cogs: number; count: number }>>;
  byProduct: Record<string, { qty: number; revenue: number; cogs: number }>;
  byTaxGroup: Partial<Record<TaxGroup, number>>;
}

type StatsLine = Pick<SaleLine, "productId" | "qty" | "revenue" | "totalCost" | "taxGroup">;

/** Phần cộng vào stats tháng của một đơn; sign = -1 khi hủy đơn. */
export function saleStatsDelta(sale: { channel: SaleChannel; lines: StatsLine[] }, sign: 1 | -1): StatsDelta {
  const delta: StatsDelta = { revenue: 0, cogs: 0, saleCount: sign, byChannel: {}, byProduct: {}, byTaxGroup: {} };
  for (const line of sale.lines) {
    const revenue = sign * line.revenue;
    const cogs = sign * line.totalCost;
    delta.revenue += revenue;
    delta.cogs += cogs;
    const product = (delta.byProduct[line.productId] ??= { qty: 0, revenue: 0, cogs: 0 });
    product.qty += sign * line.qty;
    product.revenue += revenue;
    product.cogs += cogs;
    delta.byTaxGroup[line.taxGroup] = (delta.byTaxGroup[line.taxGroup] ?? 0) + revenue;
  }
  delta.byChannel[sale.channel] = { revenue: delta.revenue, cogs: delta.cogs, count: sign };
  return delta;
}

export interface ExpenseStatsDelta {
  expenses: number;
  expensesByCategory: Partial<Record<ExpenseCategory, number>>;
}

/** Phần cộng vào stats tháng của một khoản chi; sign = -1 khi hủy. */
export function expenseStatsDelta(expense: { category: ExpenseCategory; amount: number }, sign: 1 | -1): ExpenseStatsDelta {
  const amount = sign * expense.amount;
  return { expenses: amount, expensesByCategory: { [expense.category]: amount } };
}
