"use client";

import { Select } from "antd";
import type { Product, ProductKind } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";

interface ProductSelectProps {
  products: Product[];
  kinds: ProductKind[];
  value?: string;
  onChange?: (id: string) => void;
}

/** Chỉ hiện sản phẩm đang dùng thuộc các loại cho phép, kèm số tồn. */
export function ProductSelect({ products, kinds, value, onChange }: ProductSelectProps) {
  const options = products
    .filter((p) => !p.archived && kinds.includes(p.kind))
    .map((p) => ({ value: p.id, label: `${p.name} · tồn ${formatQty(p.stockQty, p.unit)}` }));
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Chọn sản phẩm"
      showSearch={{ optionFilterProp: "label" }}
      notFoundContent="Không có sản phẩm phù hợp. Tạo sản phẩm ở trang Kho."
    />
  );
}
