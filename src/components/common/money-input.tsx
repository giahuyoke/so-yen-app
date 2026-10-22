"use client";

import { Input } from "antd";
import { useState } from "react";
import { formatNumber, parseMoney } from "@/lib/domain/money";

interface MoneyInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Ô nhập tiền chấp nhận "1tr5", "350k", "1.250.000"; rời ô thì hiện số đã định dạng. */
export function MoneyInput({ value, onChange, placeholder, disabled }: MoneyInputProps) {
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? (value == null ? "" : formatNumber(value));
  return (
    <Input
      inputMode="decimal"
      suffix="₫"
      value={shown}
      disabled={disabled}
      placeholder={placeholder ?? "VD: 1tr5, 350k"}
      onChange={(event) => {
        setText(event.target.value);
        onChange?.(parseMoney(event.target.value));
      }}
      onBlur={() => setText(null)}
    />
  );
}
