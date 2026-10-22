import QRCode from "qrcode";
import { formatDate } from "@/lib/domain/dates";
import { formatQty, formatUnitPrice, formatVnd } from "@/lib/domain/money";
import { remainingOf, type SaleSummary } from "@/lib/domain/sale";
import { bankName, transferMemo, vietQrPayload, type BankAccount } from "@/lib/domain/vietqr";

export interface InvoiceInput {
  sale: SaleSummary;
  /** Có tài khoản và số tiền > 0 thì in mã QR chuyển khoản. */
  bank: BankAccount | null;
  transferAmount: number;
}

const WIDTH = 720;
const PAD = 40;
const SCALE = 2;
const COLOR = {
  brand: "#0f6e56",
  brandDark: "#085041",
  brandSoft: "#e1f5ee",
  tint: "#cdeee2",
  ink: "#1f2a26",
  muted: "#5f6b66",
  line: "#e3eae6",
  debt: "#b42318",
};

function fontFamily(): string {
  return getComputedStyle(document.body).fontFamily || "sans-serif";
}

/** Tách chữ thành các dòng vừa `maxWidth`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else current = next;
  }
  if (current) lines.push(current);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

/** Vẽ hóa đơn từ trên xuống, trả về chiều cao đã dùng (để lần vẽ thứ hai đặt đúng kích thước canvas). */
function draw(ctx: CanvasRenderingContext2D, { sale, bank, transferAmount }: InvoiceInput): number {
  const family = fontFamily();
  const font = (size: number, weight = 400) => `${weight} ${size}px ${family}`;
  const right = WIDTH - PAD;
  const contentWidth = WIDTH - PAD * 2;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, ctx.canvas.height / SCALE);

  // Dải đầu màu thương hiệu.
  const header = ctx.createLinearGradient(0, 0, WIDTH, 130);
  header.addColorStop(0, "#1a9a76");
  header.addColorStop(0.48, COLOR.brand);
  header.addColorStop(1, "#06473a");
  ctx.fillStyle = header;
  ctx.fillRect(0, 0, WIDTH, 130);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLOR.tint;
  ctx.font = font(15, 600);
  ctx.fillText("HÓA ĐƠN BÁN HÀNG", PAD, 50);
  ctx.fillStyle = "#ffffff";
  ctx.font = font(30, 700);
  ctx.fillText(wrap(ctx, sale.shopName, contentWidth)[0] ?? "", PAD, 92);

  let y = 172;
  ctx.fillStyle = COLOR.ink;
  ctx.font = font(20, 600);
  ctx.fillText(`Đơn ${sale.code}`, PAD, y);
  ctx.textAlign = "right";
  ctx.fillStyle = COLOR.muted;
  ctx.font = font(18);
  ctx.fillText(formatDate(sale.date), right, y);
  ctx.textAlign = "left";
  y += 32;
  ctx.fillText(`Khách hàng: ${sale.customerName || "Khách lẻ"}`, PAD, y);
  y += 28;

  ctx.fillStyle = COLOR.line;
  ctx.fillRect(PAD, y, contentWidth, 1);
  y += 14;

  for (const l of sale.lines) {
    const amount = formatVnd(l.qty * l.price);
    ctx.font = font(19, 600);
    const amountWidth = ctx.measureText(amount).width;
    ctx.textAlign = "right";
    ctx.fillStyle = COLOR.ink;
    ctx.fillText(amount, right, y + 26);
    ctx.textAlign = "left";
    for (const row of wrap(ctx, l.name, contentWidth - amountWidth - 24)) {
      y += 26;
      ctx.fillText(row, PAD, y);
    }
    y += 26;
    ctx.fillStyle = COLOR.muted;
    ctx.font = font(16);
    ctx.fillText(`${formatQty(l.qty, l.unit)} × ${formatUnitPrice(l.price, l.unit)}`, PAD, y);
    y += 18;
  }

  y += 8;
  ctx.fillStyle = COLOR.line;
  ctx.fillRect(PAD, y, contentWidth, 1);
  y += 8;

  const row = (label: string, value: string, opts: { strong?: boolean; color?: string } = {}) => {
    y += opts.strong ? 40 : 32;
    ctx.font = font(opts.strong ? 22 : 18, opts.strong ? 700 : 400);
    ctx.fillStyle = opts.strong ? COLOR.ink : COLOR.muted;
    ctx.fillText(label, PAD, y);
    ctx.textAlign = "right";
    ctx.fillStyle = opts.color ?? COLOR.ink;
    ctx.fillText(value, right, y);
    ctx.textAlign = "left";
  };
  row("Tạm tính", formatVnd(sale.subtotal));
  if (sale.discount > 0) row("Giảm giá", `− ${formatVnd(sale.discount)}`);
  row("Tổng cộng", formatVnd(sale.total), { strong: true, color: COLOR.brand });
  row("Đã thanh toán", formatVnd(sale.paid));
  const remaining = remainingOf(sale);
  if (sale.debt > remaining) row("Thanh toán thêm", formatVnd(sale.debt - remaining));
  if (remaining > 0) row("Còn lại cần thanh toán", formatVnd(remaining), { color: COLOR.brand });
  y += 28;

  if (bank && transferAmount > 0) {
    const qr = QRCode.create(vietQrPayload(bank, transferAmount, sale.code), { errorCorrectionLevel: "M" });
    const size = qr.modules.size;
    const qrSide = 300;
    const quiet = 16;
    const cell = qrSide / size;
    const boxTop = y;
    const boxHeight = qrSide + quiet * 2 + 210;
    ctx.fillStyle = COLOR.brandSoft;
    roundRect(ctx, PAD, boxTop, contentWidth, boxHeight, 20);

    const qrLeft = (WIDTH - qrSide) / 2;
    const qrTop = boxTop + 24;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrLeft - quiet, qrTop, qrSide + quiet * 2, qrSide + quiet * 2, 12);
    ctx.fillStyle = "#000000";
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Làm tròn biên từng ô để không hở khe trắng giữa các ô liền nhau.
        if (qr.modules.get(r, c)) {
          const x0 = Math.round((qrLeft + c * cell) * SCALE) / SCALE;
          const y0 = Math.round((qrTop + quiet + r * cell) * SCALE) / SCALE;
          const x1 = Math.round((qrLeft + (c + 1) * cell) * SCALE) / SCALE;
          const y1 = Math.round((qrTop + quiet + (r + 1) * cell) * SCALE) / SCALE;
          ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        }
      }
    }

    y = qrTop + qrSide + quiet * 2 + 40;
    ctx.textAlign = "center";
    ctx.fillStyle = COLOR.brandDark;
    ctx.font = font(17, 600);
    ctx.fillText("Quét mã bằng app ngân hàng để chuyển khoản", WIDTH / 2, y);
    y += 44;
    ctx.fillStyle = COLOR.brand;
    ctx.font = font(32, 700);
    ctx.fillText(formatVnd(transferAmount), WIDTH / 2, y);
    y += 36;
    ctx.fillStyle = COLOR.ink;
    ctx.font = font(18, 600);
    ctx.fillText(`${bankName(bank.bankBin)} · ${bank.accountNo}`, WIDTH / 2, y);
    y += 28;
    ctx.font = font(17);
    ctx.fillText(bank.accountName, WIDTH / 2, y);
    y += 28;
    ctx.fillStyle = COLOR.muted;
    ctx.fillText(`Nội dung: ${transferMemo(sale.code)}`, WIDTH / 2, y);
    ctx.textAlign = "left";
    y = boxTop + boxHeight + 16;
  }

  y += 28;
  ctx.textAlign = "center";
  ctx.fillStyle = COLOR.muted;
  ctx.font = font(18);
  ctx.fillText("Cảm ơn quý khách!", WIDTH / 2, y);
  ctx.textAlign = "left";
  return y + PAD;
}

/** Vẽ hóa đơn thành ảnh PNG để gửi khách qua Zalo. */
export async function renderInvoice(input: InvoiceInput): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = 4000 * SCALE;
  let ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  const height = draw(ctx, input);

  canvas.height = Math.ceil(height * SCALE);
  ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);
  draw(ctx, input);

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Không tạo được ảnh hóa đơn"))), "image/png"),
  );
}
