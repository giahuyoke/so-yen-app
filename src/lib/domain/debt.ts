import type { SaleDoc } from "@/lib/domain/models";

type DebtSale = Pick<SaleDoc, "id" | "date" | "status" | "debt"> & { collected?: number; createdAt?: { toMillis(): number } };

/**
 * Số còn nợ của từng đơn của một khách. Phiếu thu gắn đơn (`collected` của đơn)
 * trừ thẳng vào đơn đó; phiếu thu không gắn đơn coi như trả cho đơn cũ nhất
 * trước, nên phần nợ còn lại (`debtBalance`) thuộc về các đơn ghi nợ mới nhất.
 * Đơn không có trong kết quả là đã thu đủ.
 */
export function remainingDebtBySale(sales: DebtSale[], debtBalance: number): Map<string, number> {
  const owing = sales
    .filter((s) => s.status === "active" && s.debt > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  const result = new Map<string, number>();
  let left = Math.max(0, debtBalance);
  for (const sale of owing) {
    if (left <= 0) break;
    const remaining = Math.min(Math.max(0, sale.debt - (sale.collected ?? 0)), left);
    if (remaining <= 0) continue;
    result.set(sale.id, remaining);
    left -= remaining;
  }
  return result;
}
