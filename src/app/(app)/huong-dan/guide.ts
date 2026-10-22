import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";

/** Nội dung lấy từ docs/HUONG-DAN-SU-DUNG.md, đọc lúc build nên trang là trang tĩnh. */
const SOURCE = path.join(process.cwd(), "docs/HUONG-DAN-SU-DUNG.md");

/** Kích thước ảnh trong public/huong-dan, để trình duyệt giữ chỗ trước khi ảnh tải xong. */
const SIZES: Record<string, [number, number]> = {
  login: [1600, 1075],
  "d-overview": [1600, 1075],
  "d-report": [1600, 1075],
  "m-overview": [554, 1200],
  "m-overview-2": [554, 1200],
  "m-more": [554, 1200],
  "m-ncc": [554, 1200],
  "m-caidat": [468, 1200],
  "m-caidat-bank": [554, 1200],
  "hoa-don": [720, 1224],
  "m-kho": [554, 1200],
  "m-product": [554, 1200],
  "m-nhap": [468, 1200],
  "m-chebien": [468, 1200],
  "m-chebien-2": [468, 1200],
  "m-dieuchinh": [554, 1200],
  "m-lichsu": [554, 1200],
  "m-banmoi": [468, 1200],
  "m-banmoi-2": [468, 1200],
  "m-donban": [554, 1200],
  "m-chitietdon": [425, 1200],
  "m-chitietdon-2": [425, 1200],
  "m-khach": [554, 1200],
  "m-khach-chitiet": [554, 1200],
  "m-thuno": [554, 1200],
  "m-chiphi": [554, 1200],
  "m-chiphi-them": [554, 1200],
  "m-baocao-kenh": [468, 1200],
  "m-baocao-haohut": [468, 1200],
  "m-thue": [468, 1200],
  "m-thanhvien": [554, 1200],
};

function figure(name: string, caption: string, kind: "phone" | "wide" | "image") {
  const [w, h] = SIZES[name];
  const src = `/huong-dan/${name}.jpg`;
  return (
    `<figure class="guide-${kind}"><a href="${src}" target="_blank" rel="noreferrer">` +
    `<img src="${src}" width="${w}" height="${h}" loading="lazy" alt="${caption}"></a>` +
    `<figcaption>${caption}</figcaption></figure>`
  );
}
const phone = (name: string, caption: string) => figure(name, caption, "phone");
/** Ảnh do app tạo ra (không phải ảnh chụp màn hình), không có khung điện thoại. */
const image = (name: string, caption: string) => figure(name, caption, "image");
const wide = (name: string, caption: string) => `<div class="guide-figs">${figure(name, caption, "wide")}</div>`;
const row = (...figs: string[]) => `<div class="guide-figs">${figs.join("")}</div>`;

/** Ảnh chèn ngay sau tiêu đề tương ứng trong file markdown. */
const FIGURES: Record<string, string> = {
  "### 1.1. Đăng nhập": wide("login", "Màn hình đăng nhập"),
  "### 2.1. Trên máy tính": wide("d-overview", "Giao diện trên máy tính: thanh bên trái và trang Tổng quan"),
  "### 2.2. Trên điện thoại": row(phone("m-overview", "Thanh dưới cùng trên điện thoại"), phone("m-more", "Ngăn “Thêm” chứa các mục còn lại")),
  "## 4. Thiết lập ban đầu": row(phone("m-ncc", "Danh sách nhà cung cấp"), phone("m-caidat-bank", "Cài đặt → Tài khoản nhận chuyển khoản")),
  "### 5.1. Xem và tìm sản phẩm": row(phone("m-kho", "Trang Kho: tồn kho và giá vốn từng sản phẩm"), phone("m-product", "Bấm vào sản phẩm để sửa")),
  "### 5.3. Nhập kho": row(phone("m-nhap", "Phiếu “Mua hàng”: dưới thành tiền hiện giá quy đổi ₫/100g")),
  "### 5.4. Chế biến": row(phone("m-chebien", "Phiếu làm sạch: chọn nguyên liệu đầu vào"), phone("m-chebien-2", "Thành phẩm đầu ra và khối Xem trước")),
  "### 5.5. Điều chỉnh kho": row(phone("m-dieuchinh", "Phiếu điều chỉnh: số âm là giảm kho")),
  "### 5.6. Chứng từ kho (lịch sử)": row(phone("m-lichsu", "Chứng từ kho theo tab, nút ⋯ để hủy")),
  "### 6.1. Tạo đơn bán": row(phone("m-banmoi", "Chọn khách, kênh bán và sản phẩm"), phone("m-banmoi-2", "Khách trả thiếu: phần còn lại thành công nợ")),
  "### 6.2. Gửi tóm tắt cho khách": row(image("hoa-don", "Ảnh hóa đơn gửi khách: mã QR điền sẵn số tiền và mã đơn")),
  "### 6.3. Danh sách đơn bán": row(phone("m-donban", "Danh sách đơn bán với tìm kiếm và bộ lọc")),
  "### 6.4. Chi tiết đơn": row(phone("m-chitietdon", "Đơn còn nợ: nút “Thu nợ đơn này”, giá vốn, lãi gộp"), phone("m-chitietdon-2", "Phiếu thu của đơn và khối “Gửi khách”")),
  "### 7.1. Danh sách khách hàng": row(phone("m-khach", "Nhãn đỏ là số tiền khách đang nợ")),
  "### 7.3. Thu nợ": row(phone("m-khach-chitiet", "Trang khách: số đang nợ và nút Thu nợ"), phone("m-thuno", "Form thu nợ: thu chung hoặc chọn từng đơn")),
  "## 8. Chi phí": row(phone("m-chiphi", "Chi phí trong kỳ, chia theo danh mục"), phone("m-chiphi-them", "Thêm khoản chi")),
  "## 9. Tổng quan": row(phone("m-overview", "Doanh thu tháng, hôm nay, công nợ, lối tắt"), phone("m-overview-2", "Đồng hồ thuế, khách đang nợ, sắp hết hàng")),
  "### 10.1. Chọn kỳ báo cáo": wide("d-report", "Trang Báo cáo trên máy tính: chọn kỳ, nút Xuất Excel"),
  "### 10.2. Các mục báo cáo": row(phone("m-baocao-kenh", "Báo cáo theo kênh bán"), phone("m-baocao-haohut", "Hao hụt theo nguồn hàng")),
  "### 11.1. Đồng hồ thuế": row(phone("m-thue", "Đồng hồ thuế và thuế ước tính")),
  "### 11.3. Cấu hình thuế": row(phone("m-caidat", "Cài đặt → Cấu hình thuế")),
  "## 12. Thành viên": row(phone("m-thanhvien", "Mời người nhà bằng email Google")),
};

/** Neo giống GitHub, để các liên kết "xem mục …" trong file markdown vẫn đúng. */
const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");

export interface Guide {
  intro: string;
  toc: { id: string; label: string }[];
  html: string;
}

export function loadGuide(): Guide {
  const source = fs.readFileSync(SOURCE, "utf8");
  // Bỏ tiêu đề, đoạn mở đầu và mục lục viết tay: trang tự hiện mở đầu và mục lục riêng.
  const intro = source.split("\n").slice(2).join("\n").split("\n---")[0].trim();
  let body = source.slice(source.indexOf("## 1. "));
  for (const [heading, html] of Object.entries(FIGURES)) {
    const start = body.indexOf(`${heading}\n`);
    if (start < 0) throw new Error(`Không thấy tiêu đề "${heading}" trong hướng dẫn`);
    const end = body.indexOf("\n", start);
    body = `${body.slice(0, end + 1)}\n${html}\n${body.slice(end + 1)}`;
  }

  const toc: Guide["toc"] = [];
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth, text }) {
        const id = slug(text);
        if (depth === 2) toc.push({ id, label: text });
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });
  const html = marked
    .parse(body.replace(/^---$/gm, ""), { async: false })
    // Bảng rộng cuộn ngang trên điện thoại thay vì làm tràn trang.
    .replaceAll("<table>", '<div class="guide-table"><table>')
    .replaceAll("</table>", "</table></div>");
  return { intro: marked.parseInline(intro, { async: false }), toc, html };
}
