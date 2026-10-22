"use client";

import { DatePicker } from "antd";
import dayjs, { type Dayjs } from "dayjs";

interface DateFieldProps {
  value?: string;
  onChange?: (value: string) => void;
}

/** Chọn ngày nghiệp vụ, giá trị là chuỗi YYYY-MM-DD, không cho chọn ngày tương lai. */
export function DateField({ value, onChange }: DateFieldProps) {
  return (
    <DatePicker
      className="w-full"
      format="DD/MM/YYYY"
      allowClear={false}
      value={value ? dayjs(value) : null}
      disabledDate={(d: Dayjs) => d.isAfter(dayjs(), "day")}
      onChange={(d) => d && onChange?.(d.format("YYYY-MM-DD"))}
    />
  );
}
