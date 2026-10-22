"use client";

import { Button, DatePicker, Select } from "antd";
import dayjs, { type Dayjs } from "dayjs";

export type DateRange = [from: string, to: string];

const FORMAT = "YYYY-MM-DD";

/** Từ đầu tháng tới hôm nay, theo ngày truyền vào (YYYY-MM-DD). */
export function thisMonthRange(today: string): DateRange {
  return [`${today.slice(0, 8)}01`, today];
}

function presetRanges(): { key: string; label: string; range: DateRange }[] {
  const t = dayjs();
  const r = (from: Dayjs, to: Dayjs): DateRange => [from.format(FORMAT), to.format(FORMAT)];
  const lastMonth = t.subtract(1, "month");
  return [
    { key: "today", label: "Hôm nay", range: r(t, t) },
    { key: "7d", label: "7 ngày qua", range: r(t.subtract(6, "day"), t) },
    { key: "month", label: "Tháng này", range: r(t.startOf("month"), t) },
    { key: "lastMonth", label: "Tháng trước", range: r(lastMonth.startOf("month"), lastMonth.endOf("month")) },
    { key: "year", label: "Năm nay", range: r(t.startOf("year"), t) },
  ];
}

/**
 * Chọn khoảng ngày nghiệp vụ: mốc nhanh và hai ô từ/đến. Không dùng
 * RangePicker vì bảng hai tháng của nó tràn màn hình điện thoại.
 */
export function DateRangeFilter({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  const presets = presetRanges();
  const current = presets.find((p) => p.range[0] === value[0] && p.range[1] === value[1])?.key ?? "custom";
  const [from, to] = value;
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
      <Select
        className="col-span-2 sm:w-36"
        value={current}
        onChange={(key) => {
          const preset = presets.find((p) => p.key === key);
          if (preset) onChange(preset.range);
        }}
        options={[
          ...presets.map((p) => ({ value: p.key, label: p.label })),
          { value: "custom", label: "Tùy chọn", disabled: true },
        ]}
      />
      <DatePicker
        className="sm:w-36"
        format="DD/MM/YYYY"
        placeholder="Từ ngày"
        allowClear={false}
        inputReadOnly
        value={dayjs(from)}
        disabledDate={(d) => d.isAfter(dayjs(to), "day")}
        onChange={(d) => d && onChange([d.format(FORMAT), to])}
      />
      <DatePicker
        className="sm:w-36"
        format="DD/MM/YYYY"
        placeholder="Đến ngày"
        allowClear={false}
        inputReadOnly
        value={dayjs(to)}
        disabledDate={(d) => d.isBefore(dayjs(from), "day")}
        onChange={(d) => d && onChange([from, d.format(FORMAT)])}
      />
    </div>
  );
}

/** Cuối danh sách: số đã tải và nút tải thêm khi còn chứng từ cũ hơn trong khoảng ngày. */
export function LoadMore({ loaded, hasMore, onLoadMore, noun }: { loaded: number; hasMore: boolean; onLoadMore: () => void; noun: string }) {
  if (!hasMore) return null;
  return (
    <div className="mt-3 flex flex-col items-center gap-1">
      <Button onClick={onLoadMore}>Tải thêm</Button>
      <span className="text-xs text-muted">
        Đã tải {loaded} {noun} mới nhất; tổng ở trên chỉ tính trên số đã tải.
      </span>
    </div>
  );
}
