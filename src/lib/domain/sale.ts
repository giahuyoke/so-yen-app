import { allocateCost } from "@/lib/domain/costing";
import { formatDate } from "@/lib/domain/dates";
import type { Unit } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";

export interface SaleLineInput {
  qty: number;
  price: number;
}

export interface SaleTotals {
  subtotal: number;
  total: number;
  debt: number;
  /** Thành tiền từng dòng sau khi chia giảm giá; tổng bằng `total`. */
  lineRevenue: number[];
}

/** Chia giảm giá theo thành tiền; dòng giá 0 (hàng tặng) không nhận phần nào. */
export function allocateDiscount(gross: number[], discount: number): number[] {
  const paidLines = gross.map((g, i) => (g > 0 ? i : -1)).filter((i) => i >= 0);
  if (discount === 0 || paidLines.length === 0) return [...gross];
  const shares = allocateCost(discount, paidLines.map((i) => gross[i]));
  const revenue = [...gross];
  paidLines.forEach((lineIndex, k) => {
    revenue[lineIndex] -= shares[k];
  });
  return revenue;
}

/** Không kiểm tra ràng buộc; service kiểm tra và báo lỗi tiếng Việt. */
export function computeSale(lines: SaleLineInput[], discount: number, paid: number): SaleTotals {
  const gross = lines.map((l) => l.qty * l.price);
  const subtotal = gross.reduce((sum, g) => sum + g, 0);
  const total = subtotal - discount;
  return { subtotal, total, debt: total - paid, lineRevenue: allocateDiscount(gross, discount) };
}

/** Số thứ tự đơn tiếp theo; đánh lại từ 1 khi sang năm mới. */
export function nextSaleSeq(counters: { sale?: number; saleYear?: number } | undefined, year: number): number {
  return counters?.saleYear === year ? (counters.sale ?? 0) + 1 : 1;
}

export function saleCode(year: number, seq: number): string {
  return `DH-${year}-${String(seq).padStart(4, "0")}`;
}

export interface SaleSummary {
  shopName: string;
  code: string;
  date: string;
  lines: { name: string; unit: Unit; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  debt: number;
}

/** Văn bản để dán gửi khách qua Zalo/Messenger. */
export function saleSummaryText(s: SaleSummary): string {
  const rows = [
    s.shopName,
    `Đơn ${s.code} · ${formatDate(s.date)}`,
    ...s.lines.map(
      (l) => `- ${l.name}: ${formatQty(l.qty, l.unit)} × ${formatVnd(l.price)} = ${formatVnd(l.qty * l.price)}`,
    ),
    `Tạm tính: ${formatVnd(s.subtotal)}`,
  ];
  if (s.discount > 0) rows.push(`Giảm giá: ${formatVnd(s.discount)}`);
  rows.push(`Tổng cộng: ${formatVnd(s.total)}`, `Đã trả: ${formatVnd(s.paid)}`);
  if (s.debt > 0) rows.push(`Còn nợ: ${formatVnd(s.debt)}`);
  rows.push("Cảm ơn quý khách!");
  return rows.join("\n");
}
