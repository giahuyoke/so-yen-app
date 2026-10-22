import type { ReactNode } from "react";

/**
 * Thanh lưu dính đáy màn hình cho form dài: luôn thấy tổng và nút Lưu mà không
 * phải cuộn xuống cuối. Trên điện thoại nằm trên thanh điều hướng dưới (kể cả
 * nút tròn "+ Bán" nhô lên); hết form thì về đúng chỗ ở cuối form.
 */
export function SubmitBar({ summary, children }: { summary?: ReactNode; children: ReactNode }) {
  return (
    <div className="sticky bottom-[calc(96px+env(safe-area-inset-bottom))] z-[5] mt-4 flex items-center gap-3 rounded-2xl border border-line bg-white/95 p-3 shadow-[0_8px_28px_-6px_rgba(31,42,38,0.18)] backdrop-blur md:bottom-4">
      {summary && <div className="min-w-0 flex-1 text-sm">{summary}</div>}
      <div className={summary ? "shrink-0" : "flex-1"}>{children}</div>
    </div>
  );
}

/** Bỏ focus ô đang nhập, để danh sách chọn đang mở không còn nổi lại khi form được ẩn sau khi lưu. */
export function blurActiveField() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
}
