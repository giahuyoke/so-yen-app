"use client";

import type { ReactNode } from "react";

import { Segmented, Select } from "antd";
import type { Period, PeriodKind } from "@/lib/domain/reports";

const FIRST_YEAR = 2025;

/** `today` dạng YYYY-MM-DD, dùng để giới hạn năm và chọn tháng mặc định khi đổi từ năm sang tháng/quý. */
export function PeriodPicker({ value, onChange, today }: { value: Period; onChange: (p: Period) => void; today: string }) {
  const currentYear = Number(today.slice(0, 4));
  const currentMonth = Number(today.slice(5, 7));
  const years = Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => currentYear - i);
  const indexOptions =
    value.kind === "month"
      ? Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))
      : Array.from({ length: 4 }, (_, i) => ({ value: i + 1, label: `Quý ${i + 1}` }));

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {value.kind !== "year" && (
        <Select className="w-28" value={value.index} options={indexOptions} onChange={(index) => onChange({ ...value, index })} />
      )}
      <Select
        className="w-24"
        value={value.year}
        options={years.map((y) => ({ value: y, label: y }))}
        onChange={(year) => onChange({ ...value, year })}
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
