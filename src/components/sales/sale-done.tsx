"use client";

import { CopyOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Result } from "antd";
import Link from "next/link";
import { InvoiceButton } from "@/components/sales/invoice-button";
import { useShareSummary } from "@/components/sales/use-share-summary";
import { saleSummaryText, type SaleSummary } from "@/lib/domain/sale";

interface SaleDoneProps {
  id: string;
  sale: SaleSummary;
  onNew: () => void;
}

/** Màn sau khi lưu đơn: gửi tóm tắt hoặc hóa đơn kèm mã QR cho khách. */
export function SaleDone({ id, sale, onNew }: SaleDoneProps) {
  const { code } = sale;
  const summary = saleSummaryText(sale);
  const { canShare, copy, share, summaryRef } = useShareSummary(code, summary);

  return (
    <Card>
      <Result
        status="success"
        title={
          <>
            Đã lưu đơn <span className="whitespace-nowrap">{code}</span>
          </>
        }
        extra={[
          canShare ? (
            <Button key="share" type="primary" icon={<SendOutlined />} onClick={() => void share()}>Gửi cho khách</Button>
          ) : null,
          <Button key="copy" type={canShare ? "default" : "primary"} icon={<CopyOutlined />} onClick={() => void copy()}>
            Sao chép tóm tắt
          </Button>,
          <InvoiceButton key="invoice" sale={sale} defaultAmount={sale.debt > 0 ? sale.debt : sale.total} />,
          <Button key="new" onClick={onNew}>Tạo đơn mới</Button>,
          <Link key="detail" href={`/ban-hang/${id}`}><Button type="link">Xem đơn</Button></Link>,
        ]}
      />
      <pre ref={summaryRef} className="whitespace-pre-wrap rounded-xl bg-brand-soft p-3 font-sans text-sm text-brand-dark">
        {summary}
      </pre>
    </Card>
  );
}
