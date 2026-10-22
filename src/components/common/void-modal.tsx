"use client";

import { Input, Modal } from "antd";
import { useState } from "react";

interface VoidModalProps {
  open: boolean;
  description: string;
  onCancel: () => void;
  /** Trả true khi hủy thành công để đóng modal. */
  onConfirm: (reason: string) => Promise<boolean>;
}

/** Trang cha đổi `key` theo chứng từ đang hủy, nên lý do luôn bắt đầu trống. */
export function VoidModal({ open, description, onCancel, onConfirm }: VoidModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  return (
    <Modal
      open={open}
      title="Hủy chứng từ"
      okText="Hủy chứng từ"
      okButtonProps={{ danger: true, disabled: !reason.trim(), loading: submitting }}
      cancelText="Đóng"
      onCancel={onCancel}
      onOk={async () => {
        setSubmitting(true);
        await onConfirm(reason);
        setSubmitting(false);
      }}
    >
      <p className="mb-2">{description}</p>
      <Input.TextArea rows={3} placeholder="Lý do hủy" value={reason} onChange={(e) => setReason(e.target.value)} />
    </Modal>
  );
}
