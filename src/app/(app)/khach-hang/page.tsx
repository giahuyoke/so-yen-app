"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, Input, Segmented, Tag } from "antd";
import { ItemList, ListItem, ListItemMeta } from "@/components/common/item-list";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerDrawer } from "@/components/customers/customer-drawer";
import { useCustomers } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { CUSTOMER_TYPE_LABEL, type CustomerType } from "@/lib/domain/models";
import { formatVnd } from "@/lib/domain/money";

type Filter = "all" | CustomerType | "debt";

export default function CustomersPage() {
  const router = useRouter();
  const { data: customers, loading } = useCustomers();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const keyword = search.trim().toLowerCase();
  const shown = customers.filter(
    (c) =>
      (filter === "all" || (filter === "debt" ? (c.debtBalance ?? 0) > 0 : c.type === filter)) &&
      (!keyword || c.name.toLowerCase().includes(keyword) || (c.phone ?? "").includes(keyword)),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Khách hàng</h1>
        <Button icon={<PlusOutlined />} onClick={() => setDrawerOpen(true)}>Thêm</Button>
      </div>
      <Input.Search allowClear placeholder="Tìm theo tên hoặc số điện thoại" value={search} onChange={(e) => setSearch(e.target.value)} />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "retail", label: CUSTOMER_TYPE_LABEL.retail },
          { value: "agent", label: CUSTOMER_TYPE_LABEL.agent },
          { value: "debt", label: "Còn nợ" },
        ]}
      />
      <Card loading={loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có khách hàng" />
        ) : (
          <ItemList
            dataSource={shown}
            renderItem={(c) => (
              <ListItem
                className="cursor-pointer"
                onClick={() => router.push(`/khach-hang/${c.id}`)}
                extra={(c.debtBalance ?? 0) > 0 ? <Tag color="error" className="m-0!">nợ {formatVnd(c.debtBalance ?? 0)}</Tag> : null}
              >
                <ListItemMeta
                  title={c.name}
                  description={[
                    CUSTOMER_TYPE_LABEL[c.type],
                    c.phone,
                    c.totalSpent ? `đã mua ${formatVnd(c.totalSpent)}` : null,
                    c.lastPurchaseAt ? `lần cuối ${formatDate(c.lastPurchaseAt)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              </ListItem>
            )}
          />
        )}
      </Card>
      <CustomerDrawer
        open={drawerOpen}
        customer={null}
        initialName={search.trim() || undefined}
        onClose={() => setDrawerOpen(false)}
        onSaved={(id) => router.push(`/khach-hang/${id}`)}
      />
    </div>
  );
}
