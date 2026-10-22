"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Segmented, Tag } from "antd";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import Link from "next/link";
import { useState } from "react";
import { ProductDrawer } from "@/components/products/product-drawer";
import { useProducts } from "@/hooks/use-shop-data";
import { PRODUCT_KIND_LABEL, PRODUCT_KINDS, type Product, type ProductKind } from "@/lib/domain/models";
import { formatQty, formatUnitPrice } from "@/lib/domain/money";

type Filter = ProductKind | "all" | "archived";

export default function InventoryPage() {
  const { data: products, loading } = useProducts();
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);

  const openDrawer = (product: Product | null) => {
    setEditing(product);
    setDrawerKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const shown = products.filter((p) =>
    filter === "archived" ? p.archived : !p.archived && (filter === "all" || p.kind === filter),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Kho</h1>
        <Button
          icon={<PlusOutlined />}
          onClick={() => openDrawer(null)}
        >
          Sản phẩm
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/kho/nhap"><Button block>Nhập kho</Button></Link>
        <Link href="/kho/che-bien"><Button block>Chế biến</Button></Link>
        <Link href="/kho/dieu-chinh"><Button block>Điều chỉnh</Button></Link>
      </div>

      <div className="overflow-x-auto [scrollbar-width:none]">
        <Segmented<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tất cả" },
            ...PRODUCT_KINDS.map((k) => ({ value: k, label: PRODUCT_KIND_LABEL[k] })),
            { value: "archived", label: "Ngừng dùng" },
          ]}
        />
      </div>

      <Card loading={loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có sản phẩm. Bấm “+ Sản phẩm” để tạo." />
        ) : (
          <ItemList
            dataSource={shown}
            renderItem={(p) => {
              const low = p.lowStockThreshold > 0 && p.stockQty <= p.lowStockThreshold;
              return (
                <ListItem
                  className="cursor-pointer"
                  onClick={() => openDrawer(p)}
                  extra={
                    <div className="text-right">
                      <div className="font-semibold">{formatQty(p.stockQty, p.unit)}</div>
                      {low && <Tag color="warning" className="m-0!">Sắp hết</Tag>}
                    </div>
                  }
                >
                  <ListItemMeta
                    title={p.name}
                    description={`${PRODUCT_KIND_LABEL[p.kind]} · giá vốn ${formatUnitPrice(p.avgCost, p.unit)}`}
                  />
                </ListItem>
              );
            }}
          />
        )}
      </Card>

      <ProductDrawer key={drawerKey} open={drawerOpen} product={editing} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
