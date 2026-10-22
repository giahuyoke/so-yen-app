"use client";

import { App, type FormInstance } from "antd";
import { useCallback } from "react";
import type { ActionResult } from "@/lib/domain/errors";

/** "lines.0.qty" → ["lines", 0, "qty"] để gắn lỗi vào đúng ô của Form.List. */
function toNamePath(key: string): (string | number)[] {
  return key.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

export function useRunAction() {
  const { message } = App.useApp();
  return useCallback(
    async <T,>(pending: Promise<ActionResult<T>>, options: { success?: string; form?: FormInstance } = {}) => {
      const result = await pending;
      if (!result.ok) {
        if (options.form && result.fieldErrors) {
          options.form.setFields(
            Object.entries(result.fieldErrors).map(([key, error]) => ({ name: toNamePath(key), errors: [error] })),
          );
        }
        void message.error(result.message);
        return null;
      }
      if (options.success) void message.success(options.success);
      return result.data;
    },
    [message],
  );
}
