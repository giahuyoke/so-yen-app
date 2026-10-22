"use client";

import { CopyOutlined, SendOutlined } from "@ant-design/icons";
import { App, Button, Card, Result } from "antd";
import Link from "next/link";
import { useRef } from "react";

interface SaleDoneProps {
  code: string;
  summary: string;
  onNew: () => void;
}

/** Màn sau khi lưu đơn: gửi hoặc sao chép tóm tắt cho khách. */
export function SaleDone({ code, summary, onNew }: SaleDoneProps) {
  const { message } = App.useApp();
  const summaryRef = useRef<HTMLPreElement>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Trình duyệt nhúng trong Zalo/Facebook hay chặn Clipboard API: khi đó chọn sẵn
  // đoạn tóm tắt, thử cách sao chép cũ, và hướng dẫn nhấn giữ nếu vẫn không được.
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      void message.success("Đã sao chép, dán vào Zalo để gửi khách");
      return;
    } catch {
      const node = summaryRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      const copied = document.execCommand?.("copy") ?? false;
      void (copied
        ? message.success("Đã sao chép, dán vào Zalo để gửi khách")
        : message.info("Đã chọn sẵn đoạn tóm tắt bên dưới, nhấn giữ để sao chép"));
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: `Đơn ${code}`, text: summary });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      await copy();
    }
  };

  return (
    <Card>
      <Result
        status="success"
        title={`Đã lưu đơn ${code}`}
        extra={[
          canShare ? (
            <Button key="share" type="primary" icon={<SendOutlined />} onClick={() => void share()}>Gửi cho khách</Button>
          ) : null,
          <Button key="copy" type={canShare ? "default" : "primary"} icon={<CopyOutlined />} onClick={() => void copy()}>
            Sao chép tóm tắt
          </Button>,
          <Button key="new" onClick={onNew}>Tạo đơn mới</Button>,
          <Link key="list" href="/ban-hang"><Button type="link">Xem đơn bán</Button></Link>,
        ]}
      />
      <pre ref={summaryRef} className="whitespace-pre-wrap rounded-xl bg-brand-soft p-3 font-sans text-sm text-brand-dark">
        {summary}
      </pre>
    </Card>
  );
}
