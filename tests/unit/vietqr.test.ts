import { describe, expect, test } from "vitest";
import { crc16, transferMemo, vietQrPayload } from "@/lib/domain/vietqr";

describe("crc16", () => {
  test("khớp giá trị kiểm tra chuẩn CCITT-FALSE", () => {
    expect(crc16("123456789")).toBe("29B1");
  });
});

describe("transferMemo", () => {
  test("bỏ dấu, ký tự đặc biệt và cắt 25 ký tự", () => {
    expect(transferMemo("DH-2026-0001")).toBe("DH20260001");
    expect(transferMemo("Đơn yến  chị Lan")).toBe("Don yen chi Lan");
    expect(transferMemo("a".repeat(30))).toHaveLength(25);
  });
});

describe("vietQrPayload", () => {
  test("ghép đủ trường NAPAS và CRC đúng", () => {
    const payload = vietQrPayload({ bankBin: "970436", accountNo: "0123456789" }, 1_500_000, "DH-2026-0001");
    expect(payload).toBe(
      "000201010212" +
        "38540010A00000072701240006970436011001234567890208QRIBFTTA" +
        "5303704" +
        "54071500000" +
        "5802VN" +
        "62140810DH20260001" +
        "6304" +
        crc16(payload.slice(0, -4)),
    );
  });

  test("không có số tiền thì là mã tĩnh, bỏ trường 54", () => {
    const payload = vietQrPayload({ bankBin: "970436", accountNo: "0123456789" }, 0, "");
    expect(payload.startsWith("000201010211")).toBe(true);
    expect(payload).not.toContain("5407");
    expect(payload).not.toContain("6214");
  });
});
