/** Ngân hàng phổ biến cùng mã BIN theo danh sách NAPAS, dùng để tạo mã VietQR. */
export const BANKS = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970437", name: "HDBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970443", name: "SHB" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970440", name: "SeABank" },
  { bin: "970449", name: "LPBank" },
  { bin: "970428", name: "Nam A Bank" },
  { bin: "970409", name: "Bac A Bank" },
  { bin: "970425", name: "ABBANK" },
  { bin: "970454", name: "BVBank" },
  { bin: "970412", name: "PVcomBank" },
  { bin: "970433", name: "Vietbank" },
  { bin: "970452", name: "KienlongBank" },
  { bin: "970419", name: "NCB" },
  { bin: "970438", name: "BaoViet Bank" },
  { bin: "970400", name: "Saigonbank" },
  { bin: "970408", name: "GPBank" },
  { bin: "970430", name: "PGBank" },
  { bin: "970427", name: "VietABank" },
] as const;

export const BANK_BINS = BANKS.map((b) => b.bin) as [string, ...string[]];

export function bankName(bin: string): string {
  return BANKS.find((b) => b.bin === bin)?.name ?? bin;
}

export interface BankAccount {
  bankBin: string;
  accountNo: string;
  /** Tên chủ tài khoản, in hoa không dấu như trên thẻ. */
  accountName: string;
}

/** CRC-16/CCITT-FALSE theo chuẩn EMVCo. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function field(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

/** Nội dung chuyển khoản an toàn cho mọi ngân hàng: bỏ dấu và ký tự đặc biệt, tối đa 25 ký tự. */
export function transferMemo(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
    .replace(/[^A-Za-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 25);
}

/** Chuỗi VietQR (NAPAS 247) chuyển tới tài khoản, điền sẵn số tiền và nội dung. */
export function vietQrPayload(account: Pick<BankAccount, "bankBin" | "accountNo">, amount: number, memo: string): string {
  const beneficiary = field("00", account.bankBin) + field("01", account.accountNo);
  const merchant = field("00", "A000000727") + field("01", beneficiary) + field("02", "QRIBFTTA");
  const content = transferMemo(memo);
  const body =
    field("00", "01") +
    field("01", amount > 0 ? "12" : "11") +
    field("38", merchant) +
    field("53", "704") +
    (amount > 0 ? field("54", String(Math.round(amount))) : "") +
    field("58", "VN") +
    (content ? field("62", field("08", content)) : "") +
    "6304";
  return body + crc16(body);
}
