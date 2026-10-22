import { Tag } from "antd";
import type { SaleDoc } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";

/** Nhãn nợ của đơn: còn nợ bao nhiêu, hoặc đã thu đủ phần ghi nợ lúc bán. */
export function DebtTag({
  sale,
  remaining,
  loading,
  className = "ml-2!",
}: {
  sale: SaleDoc;
  remaining: number;
  loading: boolean;
  /** Mặc định cách chữ phía trước khi đứng cùng dòng; đặt "m-0!" khi nhãn nằm dòng riêng. */
  className?: string;
}) {
  if (sale.status !== "active" || sale.debt <= 0 || loading) return null;
  if (remaining <= 0) return <Tag className={className}>đã thu đủ nợ</Tag>;
  return (
    <Tag color="error" className={className}>
      còn nợ {formatVnd(remaining)}
      {remaining < sale.debt && ` / ${formatVnd(sale.debt)}`}
    </Tag>
  );
}
