"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Select, Space } from "antd";
import { useState } from "react";
import { ProductDrawer } from "@/components/products/product-drawer";
import type { Product, ProductKind } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";

interface ProductSelectProps {
  products: Product[];
  kinds: ProductKind[];
  value?: string;
  onChange?: (id: string) => void;
}

/** Chỉ hiện sản phẩm đang dùng thuộc các loại cho phép, kèm số tồn; nút "+" tạo sản phẩm mới ngay tại chỗ. */
export function ProductSelect({ products, kinds, value, onChange }: ProductSelectProps) {
  const [drawer, setDrawer] = useState({ open: false, key: 0 });
  const options = products
    .filter((p) => !p.archived && kinds.includes(p.kind))
    .map((p) => ({ value: p.id, label: `${p.name} · tồn ${formatQty(p.stockQty, p.unit)}` }));
  return (
    <>
      <Space.Compact className="w-full">
        <Select
          className="min-w-0 flex-1"
          value={value}
          onChange={onChange}
          options={options}
          placeholder="Chọn sản phẩm"
          showSearch={{ optionFilterProp: "label" }}
          notFoundContent="Không có sản phẩm phù hợp. Bấm + để tạo mới."
        />
        <Button
          icon={<PlusOutlined />}
          aria-label="Sản phẩm mới"
          onClick={() => setDrawer((d) => ({ open: true, key: d.key + 1 }))}
        />
      </Space.Compact>
      <ProductDrawer
        key={drawer.key}
        open={drawer.open}
        product={null}
        kinds={kinds}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        onSaved={(id) => onChange?.(id)}
      />
    </>
  );
}
