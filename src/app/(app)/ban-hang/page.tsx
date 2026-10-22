"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Segmented, Tag } from "antd";
import Link from "next/link";
import { useState } from "react";
import { VoidModal } from "@/components/common/void-modal";
import { useRunAction } from "@/components/common/use-run-action";
import { useShop } from "@/components/shop/shop-provider";
import { useCustomers, useProducts, useRecentSales } from "@/hooks/use-shop-data";
import { formatDate } from "@/lib/domain/dates";
import { SALE_CHANNEL_LABEL, type SaleDoc } from "@/lib/domain/models";
import { formatQty, formatVnd } from "@/lib/domain/money";
import { voidSaleAction } from "@/server/actions/sales";

type Filter = "all" | "debt" | "voided";

export default function SalesPage() {
  const { shop } = useShop();
  const run = useRunAction();
  const sales = useRecentSales();
  const products = useProducts();
  const customers = useCustomers();
  const [filter, setFilter] = useState<Filter>("all");
  const [voiding, setVoiding] = useState<SaleDoc | null>(null);

  const shown = sales.data.filter((s) =>
    filter === "voided" ? s.status === "voided" : filter === "debt" ? s.status === "active" && s.debt > 0 : true,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Đơn bán</h1>
        <Link href="/ban-hang/moi"><Button type="primary" icon={<PlusOutlined />}>Bán hàng</Button></Link>
      </div>
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Tất cả" },
          { value: "debt", label: "Còn nợ" },
          { value: "voided", label: "Đã hủy" },
        ]}
      />
      <Card loading={sales.loading}>
        {shown.length === 0 ? (
          <Empty description="Chưa có đơn bán" />
        ) : (
          <List
            dataSource={shown}
            renderItem={(s) => {
              const customer = s.customerId ? customers.byId.get(s.customerId) : undefined;
              return (
                <List.Item
                  actions={
                    s.status === "active"
                      ? [<Button key="void" danger size="small" onClick={() => setVoiding(s)}>Hủy</Button>]
                      : [<Tag key="voided">Đã hủy</Tag>]
                  }
                >
                  <List.Item.Meta
                    title={
                      <span className={s.status === "voided" ? "line-through opacity-60" : ""}>
                        {s.code} · {customer ? <Link href={`/khach-hang/${customer.id}`}>{customer.name}</Link> : "Khách lẻ"}
                      </span>
                    }
                    description={
                      <div className="space-y-0.5">
                        <div>
                          {formatDate(s.date)} · {SALE_CHANNEL_LABEL[s.channel]} · <b>{formatVnd(s.total)}</b>
                          {s.status === "active" && s.debt > 0 && <Tag color="error" className="ml-2!">nợ {formatVnd(s.debt)}</Tag>}
                        </div>
                        {s.lines.map((l, i) => {
                          const p = products.byId.get(l.productId);
                          return <div key={i}>{p ? `${p.name} ${formatQty(l.qty, p.unit)}` : l.productId}</div>;
                        })}
                        {s.voidReason && <div className="text-debt">Lý do hủy: {s.voidReason}</div>}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>
      <VoidModal
        key={voiding?.id ?? "none"}
        open={!!voiding}
        description="Hàng sẽ được trả lại kho, doanh thu và công nợ của đơn này bị trừ đi. Đơn vẫn được giữ trong lịch sử."
        onCancel={() => setVoiding(null)}
        onConfirm={async (reason) => {
          if (!voiding) return false;
          const ok = await run(voidSaleAction(shop.id, { id: voiding.id, reason }), { success: "Đã hủy đơn" });
          if (ok) setVoiding(null);
          return !!ok;
        }}
      />
    </div>
  );
}
