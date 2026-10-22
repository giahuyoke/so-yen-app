# Sổ Yến — Thiết kế MVP

Ngày: 2026-10-22
Trạng thái: chờ duyệt

## 1. Bối cảnh và mục tiêu

Web app quản lý sổ sách cho một hộ kinh doanh yến sào nhỏ:

- **Nguồn hàng:** tự thu hoạch từ nhà yến, và mua yến thô của người khác về làm sạch.
- **Sản phẩm bán ra:** yến thô, yến tinh chế (nhiều loại: tổ đẹp, sợi, vụn...),
  yến chưng (hũ/lọ), hộp quà/combo.
- **Người dùng:** chủ và vài người nhà, cùng nhập liệu, quyền như nhau.
- **Khách hàng:** khách lẻ (lưu danh bạ khách quen) và đại lý/khách sỉ mua nợ.
- **Thuế:** chưa biết doanh thu năm rơi vào bậc nào, nên app cần theo dõi doanh
  thu so với các mốc 500 triệu và 1 tỷ và ước tính thuế.

Mục tiêu: chủ biết chính xác **tồn kho, giá vốn, lãi thật của từng đơn, công nợ,
và doanh thu năm so với ngưỡng thuế**, với thao tác nhập liệu đủ nhanh trên điện
thoại (tạo một đơn bán dưới 15 giây).

## 2. Phạm vi

### Có trong MVP

| Module | Chức năng |
|---|---|
| Cửa hàng & thành viên | Đăng nhập Google. Chủ tạo cửa hàng, mời người nhà bằng email. Mọi thành viên có quyền như nhau |
| Sản phẩm | Loại `raw` (yến thô), `clean` (yến tinh chế), `steamed` (yến chưng), `combo` (hộp quà), `supply` (vật tư: đường phèn, táo đỏ, hũ, hộp, túi). Mỗi sản phẩm có đơn vị (`g`/`piece`), giá bán gợi ý, mức cảnh báo tồn, nhóm thuế, tồn kho và giá vốn bình quân |
| Nhập kho | Thu hoạch từ nhà yến (giá vốn 0) · Mua yến thô hoặc vật tư từ nhà cung cấp |
| Chế biến | Một luồng chung cho làm sạch, chưng và đóng hộp: nhiều đầu vào → nhiều đầu ra, tự tính hao hụt và chuyển giá vốn |
| Điều chỉnh kho | Tăng hoặc giảm tồn theo kiểm kho thực tế, bắt buộc ghi lý do |
| Bán hàng | Đơn có khách (hoặc khách lẻ), kênh bán, nhiều dòng sản phẩm, giảm giá, số tiền đã trả. Phần còn thiếu thành công nợ |
| Khách hàng & công nợ | Danh bạ khách lẻ/đại lý, lịch sử mua, ghi chú, số nợ. Thu nợ nhiều lần |
| Nhà cung cấp | Danh bạ người bán yến thô/vật tư |
| Chi phí | Chi phí theo danh mục (nhà yến, ship, quảng cáo, phí sàn, khác) |
| Báo cáo & thuế | Tổng quan, lãi lỗ, theo kênh, theo sản phẩm, hao hụt, công nợ, đồng hồ thuế, ước tính thuế, xuất Excel |
| Hủy chứng từ | Không xóa. Hủy thì tạo bút toán đảo |

### Ngoài phạm vi MVP

Hóa đơn điện tử, phân quyền chủ/nhân viên, chatbot Zalo, nhắc chăm sóc khách tự
động, nhiều cửa hàng cho một người, nhiều kho, truy xuất theo lô/QR, ghi offline,
phân bổ chi phí nhà yến vào giá vốn từng lần thu hoạch.

Mỗi tài khoản thuộc tối đa **một** cửa hàng trong MVP.

## 3. Kiến trúc

- **Frontend:** Next.js 16 App Router, React 19, TypeScript, Ant Design 6,
  Tailwind CSS 4. Cùng phiên bản với `bo-do-it-app`. Đọc tài liệu trong
  `node_modules/next/dist/docs/` trước khi viết code Next.js, vì phiên bản này
  có thay đổi so với kiến thức cũ.
- **Backend:** Firebase Authentication (Google) và Cloud Firestore.
- **Đọc dữ liệu:** client dùng Firebase JS SDK với `onSnapshot` để có realtime.
- **Ghi dữ liệu nghiệp vụ** (chứng từ, kho, công nợ, thống kê): chỉ qua
  **Next.js Server Actions** dùng `firebase-admin`, mỗi nghiệp vụ là **một
  Firestore transaction**. Security rules cấm client ghi các collection này.
- **Ghi dữ liệu đơn giản** (`customers`, `suppliers`): client ghi trực tiếp,
  rules kiểm tra kiểu và độ dài. Client **không** được ghi các trường do server
  quản lý của khách (`debtBalance`, `totalSpent`, `lastPurchaseAt`).
- **Deploy:** Vercel (gói miễn phí) cùng Firebase gói Spark. Không dùng Cloud
  Functions.
- **Thư viện thêm:** `zod` (validate), `exceljs` (xuất Excel).

### Xác thực

1. Client đăng nhập bằng Firebase Auth (Google) rồi gửi ID token tới
   `POST /api/session`. Server dùng `createSessionCookie` để tạo cookie httpOnly,
   Secure, SameSite=Lax, thời hạn 14 ngày. `DELETE /api/session` để đăng xuất.
2. Mọi Server Action gọi `requireMember(shopId)`: xác minh session cookie, rồi
   kiểm tra `uid` nằm trong `shops/{shopId}.memberUids`. Không đạt thì trả lỗi
   `UNAUTHORIZED` hoặc `FORBIDDEN`.

### Thành viên và lời mời

- Người dùng mới chưa có cửa hàng nào sẽ thấy màn hình "Tạo cửa hàng". Server
  Action `createShop` tạo `shops/{id}` và thêm người đó làm `ownerUid` và thành
  viên đầu tiên.
- Thành viên mời người khác bằng cách tạo `invites/{email}`. Khi người được mời
  đăng nhập, server kiểm tra email đã xác minh có khớp lời mời không. Nếu khớp
  thì thêm vào `memberUids` và `members/{uid}`, rồi xóa lời mời.
- Mọi thành viên đều có thể mời hoặc gỡ thành viên khác, trừ chủ cửa hàng
  (không gỡ được `ownerUid`).

## 4. Mô hình dữ liệu (Firestore)

Quy ước: tiền là **số nguyên VND**, số lượng là **số nguyên** theo đơn vị của
sản phẩm (gram hoặc cái). Thời điểm hệ thống (`createdAt`...) là `Timestamp`.
Mọi chứng từ có `createdBy` (uid), `createdAt` và `date`: ngày nghiệp vụ dạng
chuỗi `YYYY-MM-DD` theo giờ Việt Nam, mặc định là hôm nay, có thể chọn lùi ngày.
Mỗi dòng chứng từ lưu **`totalCost`** (tổng giá vốn của dòng). Đơn giá chỉ để
hiển thị, bằng `round(totalCost / qty)`.

```text
shops/{shopId}
  name, ownerUid, memberUids[], counters { sale }, taxConfig, createdAt

  members/{uid}          email, displayName, joinedAt
  invites/{email}        invitedBy, createdAt

  products/{id}          name, kind: raw|clean|steamed|combo|supply
                         unit: g|piece, suggestedPrice, lowStockThreshold
                         taxGroup: self_raw|resale|processed
                         stockQty, avgCost, archived
  customers/{id}         name, phone, type: retail|agent, note
                         debtBalance, totalSpent, lastPurchaseAt   (server ghi)
  suppliers/{id}         name, phone, note

  receipts/{id}          kind: harvest|purchase, supplierId?, lines[{productId, qty, totalCost}]
                         total, status: active|voided
  productions/{id}       kind: clean|steam|pack
                         inputs[{productId, qty, totalCost}]
                         outputs[{productId, qty, gramPerUnit, totalCost, unitCost}]
                         lossQty, lossRate, status
  adjustments/{id}       lines[{productId, qtyDelta, costDelta}], reason, status
  sales/{id}             code (DH-2026-0001), customerId?, channel: zalo|facebook|shopee|store|other
                         lines[{productId, qty, price, unitCost}]
                         subtotal, discount, total, paid, debt, status
  payments/{id}          customerId, amount, method: cash|transfer, saleId?, status
  expenses/{id}          category: nest|shipping|ads|platform_fee|other, amount, note, status

  movements/{id}         productId, qtyDelta, costDelta, sourceType, sourceId, date
  stats/{yyyy-mm}        revenue, cogs, expenses, saleCount
                         byChannel{channel: {revenue, cogs, count}}
                         byProduct{productId: {qty, revenue, cogs}}
                         byTaxGroup{group: revenue}
                         expensesByCategory{category: amount}
```

### Quy tắc tính toán

- **Giá vốn bình quân gia quyền.** Khi nhập `q` đơn vị với tổng giá vốn `C`:
  `avgCost = round((stockQty × avgCost + C) / (stockQty + q))`. Thu hoạch
  thì `C = 0`. Khi tồn về 0, `avgCost` giữ nguyên giá trị cũ.
- **Xuất kho** (bán, đầu vào chế biến, điều chỉnh giảm) dùng `avgCost` hiện tại
  và không làm đổi `avgCost`.
- **Chế biến.** Tổng giá vốn đầu vào là `Σ(qty × unitCost)` của mọi đầu vào
  (yến và vật tư). Tổng này chia cho các đầu ra **theo khối lượng quy đổi**:
  - Với đầu ra đo bằng gram: trọng số là số gram.
  - Với đầu ra đo bằng cái (hũ chưng, hộp quà): người dùng nhập
    `gramPerUnit` (số gram yến trong một đơn vị), trọng số là `qty × gramPerUnit`.
  - Phần lẻ do làm tròn cộng vào đầu ra cuối cùng, để tổng giá vốn ra bằng đúng
    tổng giá vốn vào.
  - `lossQty = Σ gram yến đầu vào − Σ gram yến đầu ra` (không tính vật tư).
    `lossRate = lossQty / Σ gram yến đầu vào`.
- **Bán hàng.** Mỗi dòng chốt `unitCost` theo `avgCost` lúc bán.
  `subtotal = Σ qty × price`, `total = subtotal − discount`,
  `debt = total − paid`. Ràng buộc: `0 ≤ discount ≤ subtotal`,
  `0 ≤ paid ≤ total`. Đơn có `debt > 0` thì bắt buộc có `customerId`.
- **Doanh thu ghi nhận theo ngày đơn bán** (không phải ngày thu tiền).
  Giá vốn hàng bán `cogs = Σ qty × unitCost`.
- **Thu nợ** giảm `debtBalance` của khách và không ảnh hưởng doanh thu. Số tiền
  thu không được vượt `debtBalance`.
- **Hủy chứng từ:** đặt `status = voided`, tạo movements đảo dấu, hoàn tác
  `stockQty`, cập nhật lại `stats` và `debtBalance`. Hủy phiếu nhập dùng lại
  `unitCost` của phiếu để tính ngược `avgCost`. Nếu kết quả làm tồn âm thì
  từ chối. Không hủy được chứng từ đã hủy.
- **Mỗi nghiệp vụ** cập nhật `stats/{yyyy-mm}` theo `date` của chứng từ, trong
  cùng transaction.

## 5. Luồng ghi và xử lý lỗi

### Cấu trúc code

```text
src/lib/domain/        hàm thuần, không phụ thuộc Firebase, unit test kỹ
  money.ts             định dạng VND, parse "1tr5" / "350k"
  costing.ts           bình quân gia quyền, chia giá vốn chế biến
  stock.ts             kiểm tra đủ tồn, sinh movements
  sale.ts              tổng đơn, giảm giá, công nợ
  stats.ts             cộng/trừ delta vào stats tháng
  tax.ts               bậc doanh thu, ước tính thuế, dự báo cả năm
  schemas.ts           zod schema cho input của mọi action
src/server/
  firebase-admin.ts    khởi tạo admin SDK
  auth.ts              requireMember, session cookie
  actions/             receipts, productions, adjustments, sales, payments,
                       expenses, void, shop, members
src/lib/firebase/      client SDK, các hook realtime
```

Khuôn chung của mỗi action:
`requireMember → schema.parse(input) → db.runTransaction(tx => { đọc → gọi domain → ghi })`.

Kiểu trả về thống nhất:
`{ ok: true, data } | { ok: false, code, message, fieldErrors? }`. `message`
viết bằng tiếng Việt và hiển thị trực tiếp cho người dùng.

### Các trường hợp lỗi

| Tình huống | Xử lý |
|---|---|
| Gửi trùng (bấm hai lần, gửi lại khi mạng lỗi) | Client sinh ID chứng từ trước khi gửi. Nếu ID đã tồn tại thì trả kết quả cũ, không ghi lại |
| Ghi đồng thời | Firestore transaction tự retry và đọc lại tồn mới nhất |
| Vượt tồn kho | Từ chối: "Yến tinh tổ đẹp chỉ còn 120g, không đủ 200g" |
| Input sai | zod trả `fieldErrors`, form hiển thị lỗi ngay tại trường |
| Hủy làm tồn âm | Từ chối và nêu chứng từ cần hủy trước |
| Thu nợ vượt số nợ | Từ chối |
| Sản phẩm đã lưu trữ (`archived`) | Không chọn được khi tạo chứng từ mới. Vẫn hiện trong lịch sử |
| Số đơn bán | `counters.sale` tăng trong transaction, mã đặt lại theo năm |

## 6. Báo cáo và thuế

### Tổng quan

- Doanh thu, lãi gộp và số đơn của hôm nay và tháng này.
- Tổng công nợ và 5 khách nợ nhiều nhất.
- Sản phẩm có `stockQty ≤ lowStockThreshold`.
- **Đồng hồ thuế:** doanh thu từ đầu năm so với các mốc trong `taxConfig`.
  Dự báo cả năm theo cách: lấy doanh thu thực tế các tháng đã qua, cộng với
  doanh thu cùng kỳ năm trước của các tháng còn lại nếu có. Nếu không có dữ liệu
  năm trước thì lấy trung bình tháng × số tháng còn lại.

### Báo cáo theo kỳ (tháng / quý / năm)

- **Lãi lỗ:** doanh thu − giá vốn = lãi gộp; − chi phí theo danh mục = lãi ròng.
- **Theo kênh** và **theo sản phẩm:** doanh thu, giá vốn, lãi, biên lãi.
- **Hao hụt:** liệt kê các lần làm sạch, tỷ lệ hao hụt trung bình theo nguồn
  (thu hoạch hoặc từng nhà cung cấp). Nguồn xác định theo phiếu nhập gần nhất của
  sản phẩm đầu vào.
- **Công nợ:** số dư từng khách, lịch sử bán nợ và thu nợ.

### Thuế

- `taxConfig` lưu trong `shops/{id}` và sửa được ở trang Cài đặt. Gồm các mốc
  doanh thu năm, cùng tỷ lệ thuế GTGT và TNCN cho từng `taxGroup`. Giá trị mặc
  định điền sẵn kèm ghi chú **"Cần xác nhận với cơ quan thuế"**, vì quy định
  cho hộ kinh doanh thay đổi từ năm 2026.
- Ước tính thuế của kỳ được tính theo `stats.byTaxGroup` và `taxConfig`, và luôn
  ghi rõ là **số ước tính**.
- **Xuất Excel** (server tạo bằng `exceljs` qua route handler, có kiểm tra
  thành viên): sổ chi tiết doanh thu theo mẫu sổ của hộ kinh doanh (S1-HKD hoặc
  mẫu thay thế hiện hành), cùng danh sách đơn bán, chi phí và nhập kho trong kỳ.

## 7. Giao diện

- **Ưu tiên điện thoại.** Thanh điều hướng dưới cùng gồm: Tổng quan, Đơn bán,
  nút nổi **+ Bán**, Kho, Thêm. Mục "Thêm" chứa: Khách hàng, Nhà cung cấp, Chi
  phí, Báo cáo, Thuế, Cài đặt, Thành viên. Trên máy tính dùng thanh bên trái.
- **Tạo đơn bán:** tìm khách theo tên hoặc SĐT (bỏ trống là khách lẻ) → chọn
  kênh → thêm sản phẩm (hiện tồn ngay bên cạnh, điền sẵn giá gợi ý) → nhập giảm
  giá và số tiền đã trả → lưu. Sau khi lưu có nút "Sao chép tóm tắt đơn" để gửi
  qua Zalo.
- **Chế biến:** chọn kiểu → đầu vào → đầu ra. Hao hụt và giá vốn mỗi đơn vị
  thành phẩm hiển thị trực tiếp trước khi lưu.
- **Kho:** tồn theo loại, giá vốn bình quân, cảnh báo sắp hết. Có các nút Nhập
  kho, Chế biến, Điều chỉnh.
- **Chi tiết khách:** số nợ, nút Thu nợ, lịch sử mua, ghi chú.
- Tiền hiển thị dạng `1.250.000 ₫`. Ô nhập tiền chấp nhận `1tr5`, `1.5tr`,
  `350k`.
- Danh sách cập nhật realtime bằng `onSnapshot`.

## 8. Kiểm thử

| Lớp | Công cụ | Nội dung |
|---|---|---|
| Domain | Vitest | Bình quân gia quyền, chia giá vốn chế biến và làm tròn, hao hụt, tổng đơn và công nợ, delta stats, bậc thuế và dự báo, parse tiền |
| Server Actions | Vitest + Firestore Emulator | Kho, stats và công nợ đúng sau mỗi nghiệp vụ; chặn vượt tồn; idempotent khi gửi trùng; hủy đảo đúng; chặn người ngoài |
| Security rules | `@firebase/rules-unit-testing` | Người ngoài không đọc được; client không ghi được chứng từ, kho, stats, trường server của khách |
| Trình duyệt | Chạy thủ công ở kích thước điện thoại | Nhập kho → làm sạch → chưng → đóng hộp → bán nợ → thu nợ → xem báo cáo và xuất Excel |

## 9. Thiết lập dự án

- Repo: `/Users/giahuy/Github/so-yen-app`, tên app "Sổ Yến".
- Firebase project mới, tách khỏi `bo-do-it`. Khi phát triển thì chạy hoàn toàn
  trên Emulator (Auth và Firestore).
- Chủ dự án tự làm các việc sau: bật Google Sign-in, tạo service account key và
  đặt vào `.env.local` và biến môi trường trên Vercel.
