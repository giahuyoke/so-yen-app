"use client";

import type { ReactNode } from "react";

import { DatePicker, Segmented } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { Period, PeriodKind } from "@/lib/domain/reports";

const FIRST_YEAR = 2025;

const FORMAT: Record<PeriodKind, string> = { month: "[Tháng] M/YYYY", quarter: "[Quý] Q/YYYY", year: "[Năm] YYYY" };

/** Ngày đầu kỳ, để hiển thị trong ô chọn. */
function periodStart(p: Period): Dayjs {
  const month = p.kind === "month" ? p.index : p.kind === "quarter" ? p.index * 3 - 2 : 1;
  return dayjs(`${p.year}-${String(month).padStart(2, "0")}-01`);
}

/**
 * Chọn kỳ báo cáo: kiểu kỳ và một ô chọn tháng/quý/năm, gọn trên một hàng ở điện thoại.
 * `today` dạng YYYY-MM-DD, dùng để chặn kỳ tương lai và chọn tháng mặc định khi đổi kiểu kỳ.
 */
export function PeriodPicker({ value, onChange, today }: { value: Period; onChange: (p: Period) => void; today: string }) {
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const now = dayjs(today);

  return (
    <div className="flex items-center gap-2">
      <Segmented<PeriodKind>
        value={value.kind}
        onChange={(kind) => {
          const month =
            value.kind === "month"
              ? value.index
              : value.kind === "quarter"
                ? value.index * 3 - 2
                : value.year === currentYear
                  ? currentMonth
                  : 1;
          onChange({ kind, year: value.year, index: kind === "quarter" ? Math.ceil(month / 3) : month });
        }}
        options={[
          { value: "month", label: "Tháng" },
          { value: "quarter", label: "Quý" },
          { value: "year", label: "Năm" },
        ]}
      />
      <DatePicker
        className="min-w-0 flex-1 sm:w-44! sm:flex-none"
        picker={value.kind}
        format={FORMAT[value.kind]}
        allowClear={false}
        inputReadOnly
        value={periodStart(value)}
        disabledDate={(d) => d.year() < FIRST_YEAR || d.isAfter(now, value.kind === "quarter" ? "month" : value.kind)}
        onChange={(d) => {
          if (!d) return;
          const index = value.kind === "month" ? d.month() + 1 : value.kind === "quarter" ? Math.floor(d.month() / 3) + 1 : value.index;
          onChange({ ...value, year: d.year(), index });
        }}
      />
    </div>
  );
}

/** Một dòng số liệu: nhãn bên trái, giá trị bên phải. */
export function MetricRow({
  label,
  value,
  hint,
  strong,
  tone,
}: {
  label: ReactNode;
  value: string;
  hint?: string;
  strong?: boolean;
  tone?: "debt" | "brand";
}) {
  const color = tone === "debt" ? "text-debt" : tone === "brand" ? "text-brand" : "text-ink";
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? "font-semibold" : ""}`}>
      <span className={strong ? "text-ink" : "text-muted"}>{label}</span>
      <span className={`text-right ${color}`}>
        {value}
        {hint && <span className="ml-2 text-xs font-normal text-muted">{hint}</span>}
      </span>
    </div>
  );
}
