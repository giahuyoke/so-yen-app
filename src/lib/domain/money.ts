import type { Unit } from "@/lib/domain/models";

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** Dấu cách không ngắt dòng để "₫" không rớt xuống dòng dưới con số. */
export function formatVnd(value: number): string {
  return `${formatNumber(value)}\u00a0₫`;
}

const percentFormat = new Intl.NumberFormat("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Tỉ lệ 0..1 → "39,7%". */
export function formatPercent(ratio: number): string {
  return `${percentFormat.format(ratio * 100)}%`;
}

export function formatQty(qty: number, unit: Unit): string {
  return unit === "g" ? `${formatNumber(qty)}g` : `${formatNumber(qty)} cái`;
}

/**
 * Đọc số tiền gõ tắt kiểu Việt Nam: "1tr5", "1.5tr", "350k", "1.250.000".
 * Trả null khi không đọc được, để form tự báo lỗi.
 */
export function parseMoney(raw: string): number | null {
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(₫|đ|vnd|vnđ)$/, "");
  if (!s) return null;

  const million = s.match(/^(\d+)(?:[.,](\d+))?(?:tr|triệu|m)(\d*)$/);
  if (million) {
    const [, whole, decimal, tail] = million;
    if (decimal && tail) return null;
    const fraction = decimal || tail || "0";
    return Math.round(Number(`${whole}.${fraction}`) * 1_000_000);
  }

  const thousand = s.match(/^(\d+)(?:[.,](\d+))?(?:k|nghìn|ngàn)$/);
  if (thousand) {
    const [, whole, decimal] = thousand;
    return Math.round(Number(`${whole}.${decimal ?? "0"}`) * 1_000);
  }

  if (/^\d+$/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s) || /^\d{1,3}(,\d{3})+$/.test(s)) {
    return Number(s.replace(/[.,]/g, ""));
  }

  return null;
}
