"use client";

import { MoreOutlined } from "@ant-design/icons";
import { Button, Dropdown } from "antd";

/**
 * Nút "⋯" ở cuối dòng danh sách, chứa thao tác hủy chứng từ. Không để nút Hủy
 * đỏ lộ ra ở từng dòng vì trên điện thoại rất dễ bấm nhầm.
 */
export function VoidMenu({ onVoid, label = "Hủy chứng từ" }: { onVoid: () => void; label?: string }) {
  return (
    <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: [{ key: "void", danger: true, label, onClick: onVoid }] }}>
      <Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" onClick={(e) => e.stopPropagation()} />
    </Dropdown>
  );
}
