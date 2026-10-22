"use client";

import { App } from "antd";
import { useRef } from "react";

/** Gửi hoặc sao chép tóm tắt đơn cho khách; `summaryRef` gắn vào khối hiển thị tóm tắt. */
export function useShareSummary(code: string, summary: string) {
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

  return { canShare, copy, share, summaryRef };
}
