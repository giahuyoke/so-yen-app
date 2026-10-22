# Hướng dẫn sử dụng Sổ Yến

Sổ Yến là sổ sách điện tử cho hộ kinh doanh yến sào: quản lý **kho** (nhập, làm sạch, chưng, đóng hộp), **bán hàng và công nợ**, **chi phí**, **báo cáo lãi lỗ** và **ước tính thuế**. Web dùng được trên cả điện thoại và máy tính, dữ liệu đồng bộ ngay giữa các thiết bị và giữa các thành viên trong cửa hàng.

---

## Mục lục

1. [Bắt đầu](#1-bắt-đầu)
2. [Làm quen giao diện](#2-làm-quen-giao-diện)
3. [Những khái niệm cần biết](#3-những-khái-niệm-cần-biết)
4. [Thiết lập ban đầu](#4-thiết-lập-ban-đầu)
5. [Kho](#5-kho)
6. [Bán hàng](#6-bán-hàng)
7. [Khách hàng và công nợ](#7-khách-hàng-và-công-nợ)
8. [Chi phí](#8-chi-phí)
9. [Tổng quan](#9-tổng-quan)
10. [Báo cáo và xuất Excel](#10-báo-cáo-và-xuất-excel)
11. [Thuế](#11-thuế)
12. [Thành viên](#12-thành-viên)
13. [Quy trình mẫu](#13-quy-trình-mẫu)
14. [Câu hỏi thường gặp và xử lý lỗi](#14-câu-hỏi-thường-gặp-và-xử-lý-lỗi)

---

## 1. Bắt đầu

### 1.1. Đăng nhập

1. Mở trang web Sổ Yến.
2. Bấm **Tiếp tục với Google** và chọn tài khoản Google của bạn.
3. Nếu trình duyệt báo *"Trình duyệt đã chặn cửa sổ đăng nhập"*, hãy cho phép pop-up cho trang này rồi bấm lại.

> Sổ Yến chỉ đăng nhập bằng Google, không có mật khẩu riêng.

### 1.2. Tạo cửa hàng (lần đầu)

Lần đầu đăng nhập, nếu bạn chưa thuộc cửa hàng nào, màn hình **Tạo cửa hàng** hiện ra:

1. Nhập **Tên cửa hàng**, VD: *Yến sào Nhà Mình*.
2. Bấm **Tạo cửa hàng**. Bạn trở thành **chủ** cửa hàng.

> **Được người nhà mời?** Đừng tạo cửa hàng mới. Hãy nhờ chủ cửa hàng mời **đúng email Google bạn vừa đăng nhập** (xem [mục 12](#12-thành-viên)), sau đó tải lại trang, bạn sẽ tự vào cửa hàng. Mỗi tài khoản chỉ thuộc một cửa hàng.

### 1.3. Đăng xuất

- **Máy tính:** bấm biểu tượng đăng xuất cạnh tên bạn ở góc dưới thanh bên trái.
- **Điện thoại:** bấm **Thêm** ở thanh dưới, rồi bấm **Đăng xuất**.

---

## 2. Làm quen giao diện

### 2.1. Trên máy tính

Thanh bên trái gồm:

- Nút **+ Bán hàng** nổi bật ở trên cùng, để tạo đơn nhanh.
- **Hằng ngày:** Tổng quan, Đơn bán, Kho, Chi phí, Khách hàng.
- **Sổ sách:** Báo cáo, Thuế, Chứng từ kho, Nhà cung cấp.
- **Hệ thống:** Cài đặt, Thành viên, Hướng dẫn (trang hướng dẫn này).

### 2.2. Trên điện thoại

Thanh dưới cùng có 5 nút: **Tổng quan**, **Đơn bán**, nút tròn **+ Bán** ở giữa, **Kho** và **Thêm**. Bấm **Thêm** để mở các mục còn lại (Chi phí, Khách hàng, Báo cáo, Thuế, Chứng từ kho, Nhà cung cấp, Cài đặt, Thành viên, Hướng dẫn) và nút Đăng xuất.

### 2.3. Thao tác chung

- **Thanh lưu dính ở đáy form:** các form dài (bán hàng, nhập kho, chế biến, điều chỉnh) có thanh dưới cùng hiện tổng tiền / thông tin xem trước và nút **Lưu**, nên không cần cuộn xuống cuối mới lưu được.
- **Ô nhập tiền** tự thêm dấu chấm ngăn cách hàng nghìn (VD: `4.500.000`).
- **Bộ lọc ngày** có các mốc nhanh: *Hôm nay, 7 ngày qua, Tháng này, Tháng trước, Năm nay*, hoặc chọn **Từ ngày / Đến ngày**. Mặc định là từ đầu tháng tới hôm nay.
- **Tải thêm:** danh sách dài chỉ tải các chứng từ mới nhất trước. Khi có nút **Tải thêm** ở cuối, các con số tổng phía trên chỉ tính trên phần đã tải.
- Dữ liệu cập nhật **ngay lập tức**: người nhà vừa lưu đơn trên điện thoại thì máy tính của bạn cũng thấy luôn, không cần tải lại trang.

---

## 3. Những khái niệm cần biết

### 3.1. Loại sản phẩm

| Loại | Ý nghĩa | Đơn vị mặc định | Nhóm thuế mặc định |
|---|---|---|---|
| **Yến thô** | Tổ yến chưa làm sạch, thu hoạch hoặc mua về | gram | Tự nuôi, bán thô |
| **Yến tinh chế** | Yến đã làm sạch | gram | Chế biến |
| **Yến chưng** | Hũ yến chưng | cái | Chế biến |
| **Hộp quà / combo** | Hộp quà, set nhiều sản phẩm | cái | Chế biến |
| **Vật tư** | Hũ, hộp, đường phèn, táo đỏ… chỉ dùng để chế biến, **không bán được** | cái | Chế biến |

> **Loại** và **đơn vị** của sản phẩm **không đổi được** sau khi tạo. Hãy chọn kỹ.

### 3.2. Giá theo 100g

Với hàng tính theo **gram**, mọi giá bán và giá vốn hiển thị theo **₫/100g** (VD: `4.500.000 ₫/100g`). Với hàng tính theo **cái**, giá là **₫/cái**. Khi nhập giá cho 100g, số tiền phải **tròn tới 100 ₫** (VD: `4.500.000` hợp lệ, `4.500.050` không hợp lệ).

### 3.3. Giá vốn bình quân

Mỗi sản phẩm có **giá vốn bình quân** được tính tự động:

- Khi **nhập kho**, giá vốn được tính lại theo bình quân gia quyền giữa hàng cũ và hàng mới nhập.
- Khi **bán** hoặc **dùng để chế biến**, hàng xuất theo giá vốn bình quân hiện tại.
- Khi **chế biến**, tổng giá vốn nguyên liệu đầu vào được chia cho thành phẩm theo **số gram yến** (với hũ/hộp tính theo cái thì dùng *gram yến mỗi cái*). Phần hao hụt khi làm sạch được dồn vào giá vốn của yến tinh chế.

Nhờ vậy, mỗi đơn bán đều biết chính xác **lãi gộp** = doanh thu − giá vốn.

### 3.4. Nhóm thuế

Mỗi sản phẩm thuộc một nhóm thuế, dùng để chia doanh thu khi ước tính thuế và lập sổ S1-HKD:

- **Tự nuôi, bán thô** — yến thô tự khai thác từ nhà yến.
- **Mua về bán lại** — hàng mua về bán nguyên trạng.
- **Chế biến** — yến tinh chế, chưng, hộp quà.

Nếu bạn **mua yến thô về để bán lại** (không phải tự nuôi), hãy đổi nhóm thuế của sản phẩm đó thành *Mua về bán lại*.

### 3.5. Chứng từ và việc "hủy"

Mọi nghiệp vụ (phiếu nhập, phiếu chế biến, phiếu điều chỉnh, đơn bán, phiếu thu nợ, khoản chi) đều là **chứng từ**. Sổ Yến **không xóa** chứng từ; khi nhập sai, bạn **hủy** chứng từ đó:

- Bắt buộc ghi **lý do hủy**.
- Kho, công nợ, doanh thu… được **trả lại như trước** khi có chứng từ.
- Chứng từ vẫn nằm trong lịch sử, bị gạch ngang và gắn nhãn **Đã hủy**, kèm lý do.
- Sau đó lập lại chứng từ đúng.

---

## 4. Thiết lập ban đầu

Làm lần lượt các bước sau trước khi ghi sổ hằng ngày:

1. **Cài đặt → Cấu hình thuế:** kiểm tra mốc doanh thu và tỷ lệ thuế ([mục 11.3](#113-cấu-hình-thuế)).
   Ở cùng trang, điền **Tài khoản nhận chuyển khoản** (ngân hàng, số tài khoản, tên chủ tài khoản) để hóa đơn có mã QR ([mục 6.2](#62-gửi-tóm-tắt-cho-khách)).
2. **Kho → + Sản phẩm:** tạo đủ các sản phẩm, cả vật tư ([mục 5.2](#52-tạo-và-sửa-sản-phẩm)).
3. **Nhà cung cấp → Thêm:** nếu bạn có mua hàng từ bên ngoài.
4. **Khách hàng → Thêm:** khách quen, đại lý (có thể thêm dần khi bán).
5. **Nhập tồn đầu kỳ:** dùng **Nhập kho** để đưa số hàng đang có vào sổ ([mục 5.3](#53-nhập-kho)).
6. **Thành viên:** mời người nhà cùng ghi sổ ([mục 12](#12-thành-viên)).

---

## 5. Kho

Trang **Kho** liệt kê sản phẩm với **tồn kho hiện tại** và **giá vốn**. Phía trên có 3 nút nhanh: **Nhập kho**, **Chế biến**, **Điều chỉnh**.

### 5.1. Xem và tìm sản phẩm

- **Ô tìm kiếm:** gõ tên sản phẩm.
- **Lọc theo loại:** Tất cả, Yến thô, Yến tinh chế, Yến chưng, Hộp quà / combo, Vật tư, **Ngừng dùng**.
- **Sắp xếp:** *Theo tên* hoặc *Sắp hết trước* (con số trong ngoặc là số sản phẩm sắp hết).
- Sản phẩm có tồn kho bằng hoặc dưới mức cảnh báo được gắn nhãn vàng **Sắp hết**.

### 5.2. Tạo và sửa sản phẩm

Bấm **+ Sản phẩm** để tạo mới, hoặc bấm vào một sản phẩm trong danh sách để sửa.

| Trường | Ghi chú |
|---|---|
| **Tên** | VD: *Yến tinh chế tổ đẹp* |
| **Loại** | Chọn theo [bảng 3.1](#31-loại-sản-phẩm). Không đổi được sau khi tạo. |
| **Đơn vị** | gram hoặc cái. Tự chọn theo loại; không đổi được sau khi tạo. |
| **Giá bán gợi ý** | ₫/100g hoặc ₫/cái. Tự điền vào đơn bán khi chọn sản phẩm (vẫn sửa được trong đơn). |
| **Gram yến mỗi cái** | Chỉ hiện với yến chưng và hộp quà tính theo cái. VD: hũ 70ml = 3g, hộp 6 hũ = 18g. Được điền sẵn khi chế biến. |
| **Cảnh báo khi tồn còn** | Để 0 nếu không cần cảnh báo. |
| **Nhóm thuế** | Xem [mục 3.4](#34-nhóm-thuế). |
| **Ngừng sử dụng** | Chỉ có khi sửa. Bật lên để ẩn sản phẩm khỏi danh sách chọn khi nhập, bán, chế biến. Sản phẩm không bị xóa, xem lại ở bộ lọc **Ngừng dùng**. |

> Không thể nhập tồn kho trực tiếp trên form sản phẩm. Tồn kho chỉ thay đổi qua **Nhập kho**, **Chế biến**, **Điều chỉnh** và **Bán hàng**.

### 5.3. Nhập kho

**Kho → Nhập kho** (hoặc lối tắt *Nhập kho* ở Tổng quan).

1. Chọn kiểu phiếu:
   - **Thu hoạch nhà yến:** chỉ nhập được **yến thô**. Không cần nhập tiền (giá vốn = 0 vì là hàng tự khai thác; chi phí vận hành nhà yến ghi ở [Chi phí](#8-chi-phí) danh mục *Nhà yến*).
   - **Mua hàng:** nhập được **yến thô** và **vật tư**. Có thể chọn **Nhà cung cấp** (không bắt buộc) và phải nhập **Thành tiền** cho từng dòng.
2. Chọn **Ngày**.
3. Với mỗi dòng: chọn **Sản phẩm**, nhập **Số lượng** (gram hoặc cái), và **Thành tiền** nếu là phiếu mua. Dưới ô thành tiền hiện giá quy đổi, VD *≈ 3.200.000 ₫/100g*.
4. Bấm **Thêm dòng** để nhập nhiều sản phẩm trong cùng phiếu; bấm biểu tượng thùng rác để bỏ dòng.
5. Thêm **Ghi chú** nếu cần, rồi bấm **Lưu phiếu nhập**.

Sau khi lưu, bạn có thể bấm **Chế biến ngay**, **Nhập phiếu khác** hoặc **Về kho**.

> **Mẹo — nhập tồn đầu kỳ:** khi mới bắt đầu dùng, tạo một phiếu **Mua hàng** cho số hàng đang có, nhập thành tiền theo giá vốn thực tế để báo cáo lãi đúng ngay từ đầu. Yến tinh chế, yến chưng, hộp quà không nhập được bằng phiếu nhập: hãy nhập lượng yến thô tương ứng (phiếu *Mua hàng*, theo giá vốn thực tế) rồi ghi phiếu **Chế biến** để ra đúng thành phẩm và giá vốn. Dùng **Điều chỉnh** thì hàng vào kho với giá vốn 0 (xem [mục 5.5](#55-điều-chỉnh-kho)).

### 5.4. Chế biến

**Kho → Chế biến**. Có 3 kiểu phiếu:

| Kiểu | Nguyên liệu đầu vào | Thành phẩm đầu ra |
|---|---|---|
| **Làm sạch** | Yến thô | Yến tinh chế |
| **Chưng** | Yến tinh chế, vật tư | Yến chưng |
| **Đóng hộp / combo** | Yến thô, yến tinh chế, yến chưng, vật tư | Hộp quà / combo |

Các bước:

1. Chọn kiểu chế biến và **Ngày**. (Đổi kiểu sẽ làm trống các dòng đã nhập.)
2. **Nguyên liệu đầu vào:** chọn sản phẩm và số lượng dùng. Có thể thêm nhiều dòng (VD: yến tinh chế + hũ thủy tinh + đường phèn).
3. **Thành phẩm đầu ra:** chọn sản phẩm và số lượng thu được. Với hàng tính theo cái, nhập **Gram yến mỗi cái** (tự điền nếu đã khai ở sản phẩm).
4. Xem khối **Xem trước**:
   - Tổng giá vốn đầu vào.
   - **Hao hụt** (chỉ với *Làm sạch*): số gram và tỷ lệ % mất đi.
   - Giá vốn của từng thành phẩm (₫/100g hoặc ₫/cái và tổng).
   - Cảnh báo đỏ nếu nguyên liệu **không đủ tồn kho** — khi đó nút lưu bị khóa.
5. Bấm **Lưu phiếu**.

Sau khi lưu, Sổ Yến gợi ý bước tiếp theo: làm sạch xong → **Chưng tiếp**; chưng xong → **Đóng hộp / combo tiếp**.

Lưu ý:

- Mỗi sản phẩm chỉ xuất hiện một lần trong phiếu, và không thể vừa là nguyên liệu vừa là thành phẩm.
- Khi làm sạch, khối lượng sau làm sạch không được lớn hơn trước khi làm sạch.

### 5.5. Điều chỉnh kho

Dùng khi kiểm kho thấy lệch, hàng hỏng, hàng mẫu, hàng tặng ngoài đơn…

1. **Kho → Điều chỉnh**.
2. Chọn **Ngày** và nhập **Lý do** (bắt buộc), VD: *Kiểm kho cuối tháng thiếu*.
3. Mỗi dòng: chọn sản phẩm và nhập số lượng thay đổi — **số dương là tăng kho, số âm là giảm kho** (VD: `-20`). Không nhập 0.
4. Bấm **Lưu điều chỉnh**.

Điều chỉnh tăng được tính theo giá vốn bình quân hiện tại của sản phẩm; điều chỉnh giảm xuất theo giá vốn bình quân.

> Sản phẩm **chưa từng nhập** có giá vốn bằng 0, nên điều chỉnh tăng cho sản phẩm đó cũng có giá vốn 0 — khi bán, lãi gộp sẽ bị tính cao hơn thực tế. Nên đưa hàng vào kho bằng **Nhập kho** và **Chế biến** khi có thể.

### 5.6. Chứng từ kho (lịch sử)

Menu **Chứng từ kho** liệt kê mọi phiếu theo 3 tab: **Nhập kho**, **Chế biến**, **Điều chỉnh** (con số trong ngoặc là số phiếu).

- **Bộ lọc:** khoảng ngày, sản phẩm; tab Nhập kho lọc thêm theo **nguồn hàng** (thu hoạch nhà yến hoặc từng nhà cung cấp); tab Chế biến lọc theo **kiểu chế biến**.
- Mỗi phiếu hiện ngày, số tiền, các dòng hàng (`−` là xuất ra, `+` là nhập vào), và tỷ lệ hao hụt với phiếu làm sạch.
- **Hủy phiếu:** bấm nút **⋯** ở cuối dòng → **Hủy chứng từ**, nhập lý do. Kho được trả lại như trước khi có phiếu.

> Nếu số hàng của phiếu **đã được dùng** (đã bán hoặc đã đem chế biến), Sổ Yến sẽ báo *"Không thể hủy: … Hãy hủy các chứng từ đã dùng số hàng này trước."* Hãy hủy các đơn bán / phiếu chế biến sau đó trước, rồi mới hủy phiếu này.

---

## 6. Bán hàng

### 6.1. Tạo đơn bán

Bấm **+ Bán hàng** (máy tính) hoặc nút tròn **+ Bán** (điện thoại).

1. **Khách hàng:** gõ để tìm theo tên hoặc số điện thoại. Để trống nghĩa là **khách lẻ**. Bấm biểu tượng người có dấu **+** cạnh ô để thêm nhanh khách mới — khách vừa tạo được chọn luôn.
2. **Kênh bán:** Zalo (mặc định), Facebook, Shopee, Tại cửa hàng, Khác.
3. **Ngày:** mặc định hôm nay.
4. **Sản phẩm:** chọn sản phẩm (không có vật tư), nhập **Số lượng**. **Đơn giá** tự điền theo giá bán gợi ý, sửa được. Dưới ô đơn giá hiện thành tiền của dòng. Nếu số lượng vượt tồn kho sẽ có dòng nhắc *"Chỉ còn …"*.
5. Bấm **Thêm sản phẩm** để thêm dòng. Hàng tặng: nhập đơn giá **0**.
6. **Giảm giá:** số tiền giảm trên cả đơn (không vượt quá tạm tính). Phần giảm được chia cho các dòng theo thành tiền; dòng giá 0 không bị chia.
7. **Khách trả:** tự bằng tổng đơn. Nếu khách trả thiếu, sửa lại số tiền — phần còn lại thành **công nợ**. Bấm **Trả đủ** để đặt lại bằng tổng đơn.
   - Đơn còn nợ **bắt buộc phải chọn khách hàng** (không ghi nợ cho khách lẻ).
8. Thêm **Ghi chú** nếu cần, rồi bấm **Lưu đơn**.

Mỗi đơn có mã dạng **DH-2026-0001**, đánh số lại từ 1 mỗi năm.

### 6.2. Gửi tóm tắt cho khách

Sau khi lưu, màn hình hiện đoạn tóm tắt đơn (tên cửa hàng, mã đơn, ngày, khách, từng dòng hàng, tổng, đã thanh toán, còn lại cần thanh toán). Những gì gửi khách đều không dùng chữ "nợ" cho nhẹ nhàng:

- **Gửi cho khách:** mở bảng chia sẻ của điện thoại để gửi thẳng qua Zalo, Messenger…
- **Sao chép tóm tắt:** chép vào bộ nhớ tạm để dán vào Zalo. Nếu đang mở web trong trình duyệt của Zalo/Facebook mà không chép được, Sổ Yến sẽ bôi đen sẵn đoạn tóm tắt — bạn **nhấn giữ** để sao chép.
- **Xuất hóa đơn:** tạo ảnh hóa đơn kèm **mã QR VietQR** để khách quét bằng app ngân hàng. Mã QR điền sẵn số tiền và nội dung là mã đơn (bỏ dấu gạch, ví dụ `DH20260001`), nên khách không phải gõ tay và bạn dễ đối soát.
  - Số tiền trên mã QR mặc định là **số còn nợ** của đơn; đơn đã trả đủ thì mặc định là **tổng đơn** (cho trường hợp khách sẽ chuyển khoản sau). Bạn sửa được số này; để **0** thì ảnh không in mã QR.
  - Bấm **Gửi ảnh** để gửi thẳng qua Zalo, hoặc **Tải ảnh** để lưu về máy. Trong trình duyệt của Zalo/Facebook, **nhấn giữ** ảnh để lưu hoặc chia sẻ.
  - Chưa có tài khoản ngân hàng thì ảnh vẫn xuất được nhưng không có mã QR. Vào **Cài đặt → Tài khoản nhận chuyển khoản** để thêm.
- **Tạo đơn mới** hoặc **Xem đơn**.

Trang **chi tiết đơn** cũng có khối **Gửi khách** và nút **Xuất hóa đơn**. Với đơn đã thu nợ một phần, cả đoạn tóm tắt lẫn hóa đơn đều ghi thêm dòng **Thanh toán thêm** và **Còn lại cần thanh toán** là phần còn lại; số tiền trên mã QR mặc định cũng là phần còn lại này.

### 6.3. Danh sách đơn bán

Menu **Đơn bán**:

- **Ô tìm kiếm:** theo mã đơn hoặc tên khách.
- **Bộ lọc:** khoảng ngày, kênh bán, khách (có lựa chọn *Khách lẻ*). Con số trên nút **Bộ lọc** là số bộ lọc đang bật; bấm **Xóa bộ lọc** để về mặc định.
- **Trạng thái:** Tất cả, **Còn nợ**, **Đã hủy**.
- Dòng tóm tắt phía trên cho biết số đơn, **doanh thu** và **còn nợ** của các đơn đang hiển thị.
- Mỗi đơn hiện nhãn **còn nợ X / Y** (còn X trên tổng nợ ban đầu Y) hoặc **đã thu đủ nợ**.

### 6.4. Chi tiết đơn

Bấm vào một đơn để xem:

- Sản phẩm, số lượng, đơn giá; tạm tính, giảm giá, tổng cộng, khách trả lúc bán, **giá vốn** và **lãi gộp** của đơn.
- Nếu đơn có nợ: số **còn nợ**, nút **Thu nợ đơn này**, và danh sách **Phiếu thu của đơn**.
- Khối **Gửi khách** để gửi lại / sao chép tóm tắt.
- Bấm tên khách để sang trang khách hàng.

### 6.5. Hủy đơn

Trong chi tiết đơn, bấm **Hủy đơn này** ở cuối trang, nhập lý do. Hàng được trả lại kho, doanh thu và công nợ của đơn bị trừ đi.

> Đơn **đã có phiếu thu nợ** thì không hủy được. Hãy hủy các phiếu thu của đơn trước ([mục 7.4](#74-hủy-phiếu-thu)), rồi mới hủy đơn.

---

## 7. Khách hàng và công nợ

### 7.1. Danh sách khách hàng

Menu **Khách hàng**:

- Tìm theo tên hoặc số điện thoại.
- Lọc: Tất cả, **Khách lẻ**, **Đại lý / sỉ**, **Còn nợ**.
- Mỗi khách hiện loại, số điện thoại, tổng đã mua, lần mua cuối, và nhãn đỏ số tiền đang nợ.

### 7.2. Thêm / sửa khách

Bấm **Thêm** (hoặc **Sửa** trong trang khách): nhập **Tên** (bắt buộc), **Số điện thoại**, **Loại khách** (Khách lẻ / Đại lý / sỉ), **Ghi chú** (VD: *thích yến tổ đẹp, mua dịp Tết*).

### 7.3. Thu nợ

Trang chi tiết khách cho biết **Đang nợ** và **Đã mua**, cùng 2 tab **Đơn hàng** và **Thu nợ**.

Có 3 cách mở form thu nợ:

- Nút **Thu nợ** trong trang khách → mặc định **Thu chung**.
- Nút **Thu** cạnh một đơn còn nợ trong tab Đơn hàng → thu cho đơn đó.
- Nút **Thu nợ đơn này** trong chi tiết đơn.

Trong form:

1. **Trả cho đơn:**
   - **Thu chung:** số tiền được trừ vào **đơn nợ cũ nhất trước**.
   - Chọn một đơn cụ thể: trừ thẳng vào đơn đó.
2. **Số tiền:** tự điền số còn nợ (của khách hoặc của đơn), sửa được. Không được vượt quá số còn nợ.
3. **Hình thức:** Tiền mặt / **Chuyển khoản** (mặc định).
4. **Ngày**, **Ghi chú**, rồi bấm **Lưu phiếu thu**.

### 7.4. Hủy phiếu thu

Tab **Thu nợ** trong trang khách → nút **⋯** ở cuối dòng phiếu → **Hủy phiếu thu**, nhập lý do. Số tiền được cộng lại vào công nợ của khách.

---

## 8. Chi phí

Menu **Chi phí** dùng để ghi các khoản chi ngoài giá vốn hàng hóa, giúp tính **lãi ròng**.

- **Thêm khoản chi:** chọn **Danh mục** (Nhà yến, Vận chuyển, Quảng cáo, Phí sàn, Khác), nhập **Số tiền**, **Ngày**, **Ghi chú** (VD: *Ship đơn đi Hà Nội*), rồi **Lưu**.
- **Lọc** theo khoảng ngày và danh mục. Khối tổng phía trên cho biết tổng chi trong kỳ và chia theo từng danh mục.
- **Hủy khoản chi:** bấm nút **⋯** ở cuối dòng → **Hủy khoản chi**, nhập lý do. Khoản chi bị trừ khỏi báo cáo lãi lỗ.

> Tiền mua yến, mua vật tư **không** ghi ở đây — chúng đã nằm trong phiếu **Nhập kho** và đi vào giá vốn.

---

## 9. Tổng quan

Trang đầu tiên sau khi đăng nhập, cho cái nhìn nhanh trong ngày:

- **Doanh thu tháng này**, kèm **lãi gộp** (và % biên lãi), **lãi ròng**, số đơn.
- **Hôm nay:** doanh thu, số đơn và lãi của ngày.
- **Công nợ:** tổng tiền khách đang nợ và số khách đang nợ.
- **Lối tắt:** Nhập kho, Chế biến, Chi phí, Báo cáo.
- **Đồng hồ thuế** của năm (bấm *Chi tiết* để sang trang Thuế).
- **Khách đang nợ:** những khách nợ nhiều nhất; bấm để vào trang khách.
- **Sắp hết hàng:** sản phẩm đã chạm mức cảnh báo tồn kho.

---

## 10. Báo cáo và xuất Excel

### 10.1. Chọn kỳ báo cáo

Chọn kiểu kỳ **Tháng / Quý / Năm**, rồi chọn kỳ cụ thể (không chọn được kỳ tương lai). Khối nổi bật phía trên hiện **lãi ròng** của kỳ, cùng doanh thu, lãi gộp và chi phí.

### 10.2. Các mục báo cáo

| Mục | Nội dung |
|---|---|
| **Lãi lỗ** | Doanh thu → trừ giá vốn hàng bán → **lãi gộp** → trừ từng loại chi phí → **lãi ròng**, kèm % trên doanh thu. Lãi ròng âm hiện màu đỏ. |
| **Theo kênh** | Doanh thu, số đơn, giá vốn và lãi của từng kênh bán (Zalo, Facebook, Shopee…). |
| **Theo sản phẩm** | Số lượng bán, doanh thu và lãi của từng sản phẩm, xếp theo doanh thu giảm dần. |
| **Hao hụt** | Tỷ lệ hao hụt khi làm sạch **theo nguồn hàng** (thu hoạch nhà yến hoặc từng nhà cung cấp) và danh sách từng lần làm sạch. Dùng để so sánh chất lượng yến thô giữa các nguồn. |
| **Công nợ** | Tổng nợ và danh sách khách đang nợ (số dư hiện tại, không phụ thuộc kỳ). Bấm vào khách để xem lịch sử. |

> Nguồn hàng trong báo cáo hao hụt được xác định theo **phiếu nhập gần nhất** của yến thô đem làm sạch.

### 10.3. Xuất Excel

Bấm **Xuất Excel** ở góc trên trang Báo cáo. File tải về chứa dữ liệu **của kỳ đang chọn**, gồm các sheet:

1. **Sổ doanh thu S1-HKD** — sổ chi tiết doanh thu bán hàng theo mẫu S1-HKD: mỗi đơn một dòng, doanh thu chia theo nhóm ngành thuế, có dòng tổng cộng.
2. **Đơn bán** — mã đơn, ngày, khách, kênh, sản phẩm, tạm tính, giảm giá, tổng, đã trả, còn nợ, giá vốn, lãi gộp, trạng thái.
3. **Thu nợ** — các phiếu thu, cho đơn nào hoặc thu chung.
4. **Chi phí** — các khoản chi theo danh mục.
5. **Nhập kho** — từng dòng hàng nhập, loại phiếu, nhà cung cấp, thành tiền.
6. **Chế biến** — nguyên liệu vào / thành phẩm ra, giá vốn, hao hụt.

Chứng từ đã hủy vẫn có trong các sheet chi tiết (cột *Trạng thái* ghi "Đã hủy"), nhưng **không** được tính vào sổ S1-HKD.

> Mẫu S1-HKD là mẫu tham khảo theo Thông tư 88/2021/TT-BTC. Hãy kiểm tra mẫu sổ hiện hành với cơ quan thuế.

---

## 11. Thuế

> **Lưu ý quan trọng:** mọi con số trong trang Thuế là **ước tính** theo cấu hình của cửa hàng. Quy định cho hộ kinh doanh thay đổi từ năm 2026, hãy xác nhận với cơ quan thuế trước khi kê khai.

### 11.1. Đồng hồ thuế

Chọn **năm** ở góc trên. Thanh tiến độ cho biết:

- **Doanh thu từ đầu năm** (phần đậm) và **dự báo cả năm** (phần nhạt).
- Hai vạch mốc: **mốc miễn thuế** (mặc định 500 triệu) và **mốc bắt buộc hóa đơn điện tử** (mặc định 1 tỷ).
- Trạng thái: *Chưa tới mốc chịu thuế*, *Đã vượt mốc chịu thuế*, *Phải dùng hóa đơn điện tử*, hoặc *Dự báo sẽ…* nếu chỉ dự báo mới chạm mốc.

**Cách dự báo:** doanh thu thực tế các tháng đã qua + các tháng còn lại lấy theo **cùng kỳ năm trước** (nếu có dữ liệu), nếu không thì theo **trung bình tháng** của năm nay. Năm đã kết thúc thì dự báo bằng thực tế.

### 11.2. Thuế ước tính

- Nếu doanh thu dự báo cả năm **chưa vượt mốc miễn thuế**: chưa phải nộp GTGT, TNCN.
- Nếu vượt: hiện thuế theo từng nhóm ngành, tổng **thuế GTGT**, **thuế TNCN**, **tổng thuế ước tính**, và bảng **theo quý**.

### 11.3. Cấu hình thuế

**Cài đặt** (hoặc nút **Cấu hình** trên trang Thuế), dưới thẻ *Tài khoản nhận chuyển khoản*:

- **Mốc miễn thuế (doanh thu năm)** — mặc định 500.000.000 ₫.
- **Mốc bắt buộc hóa đơn điện tử** — mặc định 1.000.000.000 ₫.
- **Chỉ tính thuế TNCN trên phần doanh thu vượt mốc miễn thuế** — bật/tắt.
- **Tỷ lệ thuế trên doanh thu** (GTGT % và TNCN %) cho từng nhóm:

  | Nhóm | GTGT mặc định | TNCN mặc định |
  |---|---|---|
  | Tự nuôi, bán thô | 0% | 0% |
  | Mua về bán lại | 1% | 0,5% |
  | Chế biến | 3% | 1,5% |

Bấm **Lưu** để áp dụng, hoặc **Điền giá trị mặc định** để khôi phục các giá trị trên.

---

## 12. Thành viên

Một cửa hàng có thể có nhiều người cùng ghi sổ (vợ chồng, con cái, nhân viên). Mọi thành viên dùng chung toàn bộ dữ liệu và có cùng quyền thao tác.

### Mời người nhà

1. Vào **Thành viên**.
2. Nhập **Email Google** của người được mời, bấm **Mời**.
3. Nhắn người đó mở Sổ Yến và đăng nhập bằng **đúng email này** — họ sẽ tự vào cửa hàng của bạn.

Lời mời chưa được dùng hiện ở mục **Lời mời đang chờ**; bấm **Hủy** để thu hồi.

### Gỡ thành viên

Bấm **Gỡ** cạnh tên thành viên và xác nhận. Không thể gỡ **chủ cửa hàng** (nhãn *Chủ*) và không tự gỡ chính mình (nhãn *Bạn*).

---

## 13. Quy trình mẫu

### 13.1. Từ thu hoạch đến bán hũ yến chưng

1. **Nhập kho → Thu hoạch nhà yến:** *Yến thô* 1.000 g.
2. **Chế biến → Làm sạch:** đầu vào *Yến thô* 1.000 g → đầu ra *Yến tinh chế* 850 g. Xem trước báo hao hụt 150 g (15%).
3. Bấm **Chưng tiếp → Chưng:** đầu vào *Yến tinh chế* 300 g + *Hũ 70ml* 100 cái + *Đường phèn* … → đầu ra *Yến chưng hũ 70ml* 100 cái, 3 g/cái.
4. Bấm **Đóng hộp / combo tiếp:** đầu vào *Yến chưng* 60 cái + *Hộp quà* 10 cái → đầu ra *Hộp quà 6 hũ* 10 cái, 18 g/cái.
5. **+ Bán:** chọn khách, thêm *Hộp quà 6 hũ* × 2, lưu đơn, bấm **Gửi cho khách**.

### 13.2. Mua yến thô từ nhà cung cấp

1. **Nhà cung cấp → Thêm:** *Anh Tâm Khánh Hòa*.
2. **Nhập kho → Mua hàng:** chọn nhà cung cấp, *Yến thô* 500 g, thành tiền 15.000.000 ₫ (≈ 3.000.000 ₫/100g).
3. Làm sạch như trên. Sau vài lần, vào **Báo cáo → Hao hụt** để so sánh hao hụt giữa yến nhà và yến mua.

### 13.3. Bán nợ cho đại lý và thu dần

1. **+ Bán:** chọn đại lý, tổng đơn 20.000.000 ₫, **Khách trả** sửa thành 5.000.000 ₫ → còn nợ 15.000.000 ₫.
2. Tuần sau đại lý chuyển 10.000.000 ₫: vào trang khách → **Thu** cạnh đơn đó → nhập 10.000.000 ₫ → **Lưu phiếu thu**. Đơn hiện *còn nợ 5.000.000 ₫ / 15.000.000 ₫*.
3. Nếu khách trả gộp cho nhiều đơn, dùng **Thu chung** — tiền tự trừ vào đơn cũ nhất trước.

### 13.4. Cuối tháng

1. Ghi đủ các khoản **Chi phí** trong tháng (điện nhà yến, ship, quảng cáo, phí sàn).
2. Kiểm kho thực tế, nếu lệch thì lập **Điều chỉnh** kèm lý do.
3. Xem **Báo cáo** tháng: lãi lỗ, theo kênh, theo sản phẩm.
4. Xem **Thuế** để biết doanh thu năm đã gần mốc chưa.
5. **Xuất Excel** để lưu trữ hoặc gửi kế toán.

---

## 14. Câu hỏi thường gặp và xử lý lỗi

**Nhập sai phiếu / đơn, sửa thế nào?**
Sổ Yến không cho sửa chứng từ đã lưu. Hãy **hủy** chứng từ sai (kèm lý do) rồi lập lại chứng từ đúng. Xem [mục 3.5](#35-chứng-từ-và-việc-hủy).

**Không hủy được phiếu nhập / phiếu chế biến, báo "chỉ còn …, không đủ …"?**
Số hàng của phiếu đó đã được bán hoặc đem chế biến. Hủy các chứng từ dùng số hàng đó trước (đơn bán, phiếu chế biến sau đó), rồi hủy phiếu này.

**Không hủy được đơn bán, báo "đơn này đã có phiếu thu nợ"?**
Vào trang khách → tab **Thu nợ**, hủy các phiếu thu của đơn, rồi hủy đơn.

**Báo "Không đủ tồn kho" khi bán hoặc chế biến?**
Tồn kho trên sổ ít hơn số bạn nhập. Kiểm tra xem đã ghi đủ phiếu nhập / chế biến chưa; nếu kho thực tế có nhiều hơn sổ, lập **Điều chỉnh** tăng kho.

**Báo "Đơn còn nợ phải chọn khách hàng"?**
Khách lẻ không ghi nợ được. Chọn hoặc tạo nhanh khách hàng, hoặc bấm **Trả đủ**.

**Báo "Giá cho 100g phải tròn tới 100 ₫"?**
Giá ₫/100g phải là bội số của 100, VD 4.500.000 hoặc 4.500.100.

**Không thấy sản phẩm trong ô chọn?**
- Sản phẩm có thể đang **Ngừng sử dụng** — mở lại ở Kho → bộ lọc *Ngừng dùng* → tắt *Ngừng sử dụng*.
- Mỗi màn hình chỉ cho chọn các loại phù hợp: vật tư không bán được; phiếu thu hoạch chỉ nhập yến thô; chế biến chỉ hiện nguyên liệu / thành phẩm đúng kiểu (xem [mục 5.4](#54-chế-biến)).

**Muốn đổi loại hoặc đơn vị của sản phẩm?**
Không đổi được sau khi tạo. Tạo sản phẩm mới đúng loại/đơn vị, chuyển tồn kho bằng **Điều chỉnh** (giảm sản phẩm cũ, tăng sản phẩm mới — lưu ý sản phẩm mới sẽ có giá vốn 0, xem [mục 5.5](#55-điều-chỉnh-kho)), rồi bật **Ngừng sử dụng** cho sản phẩm cũ.

**Người nhà đăng nhập nhưng lại thấy màn hình "Tạo cửa hàng"?**
Email họ đăng nhập không khớp email được mời. Kiểm tra lại ở **Thành viên → Lời mời đang chờ**, mời đúng email, rồi nhờ họ tải lại trang. Đừng bấm *Tạo cửa hàng*.

**Bấm "Lưu" hai lần có bị ghi trùng không?**
Không. Mỗi form có mã chứng từ riêng; bấm lưu lại (VD khi mạng chập chờn) chỉ ghi một lần.

**Số tổng ở danh sách khác số trong Báo cáo?**
Danh sách chỉ tính trên các chứng từ **đã tải** và theo **bộ lọc** đang chọn. Nếu còn nút **Tải thêm**, hãy bấm để tải hết. Báo cáo luôn tính trên toàn bộ kỳ.
