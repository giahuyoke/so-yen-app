"use client";

import { DownloadOutlined, FileImageOutlined, SendOutlined } from "@ant-design/icons";
import { Alert, App, Button, Modal, Spin } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MoneyInput } from "@/components/common/money-input";
import { renderInvoice } from "@/components/sales/invoice-image";
import { useBankAccount } from "@/hooks/use-shop-data";
import type { SaleSummary } from "@/lib/domain/sale";

interface InvoiceButtonProps {
  sale: SaleSummary;
  /** Số tiền điền sẵn trên mã QR. */
  defaultAmount: number;
}

/** Nút xuất hóa đơn dạng ảnh kèm mã VietQR, gửi khách qua Zalo hoặc lưu về máy. */
export function InvoiceButton(props: InvoiceButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon={<FileImageOutlined />} onClick={() => setOpen(true)}>Xuất hóa đơn</Button>
      {open && <InvoiceModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

function InvoiceModal({ sale, defaultAmount, onClose }: InvoiceButtonProps & { onClose: () => void }) {
  const { message } = App.useApp();
  const bank = useBankAccount();
  const [amount, setAmount] = useState<number | null>(defaultAmount);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const fileName = `hoa-don-${sale.code}.png`;
  // Trang cha dựng lại `sale` mỗi lần render; so theo nội dung để không vẽ lại thừa.
  const saleKey = JSON.stringify(sale);

  useEffect(() => {
    if (bank.loading) return;
    let cancelled = false;
    let url: string | null = null;
    // Chờ gõ xong số tiền rồi mới vẽ lại.
    const timer = setTimeout(async () => {
      const blob = await renderInvoice({ sale, bank: bank.data, transferAmount: amount ?? 0 });
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setImage({ blob, url });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleKey, bank.loading, bank.data, amount]);

  const file = image ? new File([image.blob], fileName, { type: "image/png" }) : null;
  const canShareFile = !!file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] });

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image.url;
    a.download = fileName;
    a.click();
  };

  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title: `Hóa đơn ${sale.code}` });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      void message.info("Không gửi được ảnh, hãy nhấn giữ ảnh để lưu hoặc chia sẻ");
    }
  };

  return (
    <Modal
      open
      title={`Hóa đơn ${sale.code}`}
      onCancel={onClose}
      footer={[
        canShareFile ? (
          <Button key="share" type="primary" icon={<SendOutlined />} disabled={!image} onClick={() => void share()}>Gửi ảnh</Button>
        ) : null,
        <Button key="download" type={canShareFile ? "default" : "primary"} icon={<DownloadOutlined />} disabled={!image} onClick={download}>
          Tải ảnh
        </Button>,
      ]}
    >
      {!bank.loading && !bank.data && (
        <Alert
          className="mb-3!"
          type="info"
          showIcon
          title="Chưa có tài khoản nhận chuyển khoản"
          description={<>Vào <Link href="/cai-dat">Cài đặt</Link> nhập ngân hàng và số tài khoản để in mã QR lên hóa đơn.</>}
        />
      )}
      {bank.data && (
        <div className="mb-3">
          <div className="mb-1 text-sm">Số tiền trên mã QR</div>
          <MoneyInput value={amount} onChange={setAmount} placeholder="Để trống hoặc 0 thì không in mã QR" />
        </div>
      )}
      <div className="flex min-h-40 items-center justify-center rounded-xl bg-canvas p-2">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- ảnh blob vẽ tại chỗ, next/image không tối ưu được
          <img src={image.url} alt={`Hóa đơn ${sale.code}`} className="max-h-[60vh] w-auto rounded-lg shadow-sm" />
        ) : (
          <Spin />
        )}
      </div>
      <div className="mt-2 text-center text-xs text-muted">Trên điện thoại có thể nhấn giữ ảnh để lưu hoặc chia sẻ.</div>
    </Modal>
  );
}
