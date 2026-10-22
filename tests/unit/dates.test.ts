import { describe, expect, test } from "vitest";
import { monthKey, todayVN } from "@/lib/domain/dates";

describe("todayVN", () => {
  test("dùng giờ Việt Nam (UTC+7)", () => {
    // 2026-10-21 18:30 UTC là 2026-10-22 01:30 ở Việt Nam
    expect(todayVN(new Date("2026-10-21T18:30:00Z"))).toBe("2026-10-22");
    expect(todayVN(new Date("2026-10-21T16:59:00Z"))).toBe("2026-10-21");
  });

  test("monthKey lấy YYYY-MM", () => {
    expect(monthKey("2026-10-22")).toBe("2026-10");
  });
});
