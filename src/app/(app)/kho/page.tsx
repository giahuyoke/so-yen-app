"use client";

import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Segmented, Select, Tag } from "antd";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import Link from "next/link";
import { useState } from "react";
import { ProductDrawer } from "@/components/products/product-drawer";
import { useProducts } from "@/hooks/use-shop-data";
import { PRODUCT_KIND_LABEL, PRODUCT_KINDS, type Product, type ProductKind } from "@/lib/domain/models";
import { formatQty, formatUnitPrice } from "@/lib/domain/money";

type Filter = ProductKind | "all" | "archived";
type Sort = "name" | "low";

const isLow = (p: Product) => p.lowStockThreshold > 0 && p.stockQty <= p.lowStockThreshold;

export default function InventoryPage() {
  const { data: products, loading } = useProducts();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [editing, setEditing] = useState<Product | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);

  const openDrawer = (product: Product | null) => {
    setEditing(product);
    setDrawerKey((k) => k + 1);
    setDrawerOpen(true);
  };

  const term = search.trim().toLowerCase();
  const filtered = products.filter(
    (p) =>
      (filter === "archived" ? p.archived : !p.archived && (filter === "all" || p.kind === filter)) &&
      (!term || p.name.toLowerCase().includes(term)),
  );
  // Danh sách gốc đã sắp theo tên; "Sắp hết trước" chỉ đưa nhóm sắp hết lên đầu và giữ thứ tự tên trong nhóm.
  const shown = sort === "low" ? [...filtered.filter(isLow), ...filtered.filter((p) => !isLow(p))] : filtered;
  const lowCount = filtered.filter(isLow).length;

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

      <div className="flex gap-2">
        <Input
          allowClear
          prefix={<SearchOutlined className="text-muted" />}
          placeholder="Tìm sản phẩm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select<Sort>
          className="w-40 shrink-0"
          value={sort}
          onChange={setSort}
          options={[
            { value: "name", label: "Theo tên" },
            { value: "low", label: `Sắp hết trước${lowCount ? ` (${lowCount})` : ""}` },
          ]}
        />
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
          <Empty description={term ? "Không có sản phẩm nào khớp" : "Chưa có sản phẩm. Bấm “+ Sản phẩm” để tạo."} />
        ) : (
          <ItemList
            dataSource={shown}
            renderItem={(p) => {
              const low = isLow(p);
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
