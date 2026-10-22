"use client";

import { Button, Card, Empty, List, Tag } from "antd";
import Link from "next/link";
import { useProducts } from "@/hooks/use-shop-data";
import { PRODUCT_KIND_LABEL } from "@/lib/domain/models";
import { formatQty } from "@/lib/domain/money";

export default function DashboardPage() {
  const { data: products, loading } = useProducts();
  const lowStock = products.filter((p) => !p.archived && p.stockQty <= p.lowStockThreshold && p.lowStockThreshold > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Tổng quan</h1>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/kho/nhap"><Button block size="large">Nhập kho</Button></Link>
        <Link href="/kho/che-bien"><Button block size="large">Chế biến</Button></Link>
      </div>
      <Card title="Sắp hết hàng" loading={loading}>
        {lowStock.length === 0 ? (
          <Empty description="Chưa có sản phẩm nào dưới mức cảnh báo" />
        ) : (
          <List
            dataSource={lowStock}
            renderItem={(p) => (
              <List.Item extra={<Tag color="warning">còn {formatQty(p.stockQty, p.unit)}</Tag>}>
                <List.Item.Meta title={p.name} description={PRODUCT_KIND_LABEL[p.kind]} />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
