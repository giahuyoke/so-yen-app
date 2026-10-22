# Sổ Yến

Sổ sách kho, chế biến, bán hàng và thuế cho hộ kinh doanh yến sào.
Next.js 16 App Router, Ant Design, Tailwind CSS, Firebase Auth và Cloud Firestore.

## Chạy khi phát triển (Emulator, không cần Firebase thật)

Yêu cầu Node.js ≥ 20.9 và Java ≥ 11. Nếu cài Java bằng `brew install openjdk@21`,
bản này không tự vào PATH; thêm `export PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH`
vào `~/.zshrc`.

```bash
npm ci
cp .env.example .env.local
npm run emulators   # terminal 1: Auth + Firestore emulator, UI ở http://localhost:4000
npm run dev         # terminal 2: http://localhost:3000
```

## Kiểm thử

```bash
npm test               # unit test cho domain (không cần emulator)
npm run test:emulator  # test service + security rules trên emulator
npm run typecheck
npm run lint
```

## Kiến trúc

- `src/lib/domain/`: hàm thuần (giá vốn bình quân, chế biến, tiền, schema).
- `src/server/services/`: nghiệp vụ, mỗi nghiệp vụ là một Firestore transaction.
- `src/server/actions/`: Server Actions; xác thực bằng session cookie rồi gọi service.
- Client chỉ **đọc** Firestore realtime. Ghi kho và chứng từ chỉ đi qua server.
  Riêng nhà cung cấp do client ghi trực tiếp, có `firestore.rules` kiểm tra.

## Đưa lên production

1. Tạo Firebase project, bật Authentication → Google, tạo Firestore (Native mode).
2. Điền cấu hình Web App vào biến môi trường. Bỏ các biến `*_EMULATOR_HOST`
   và `NEXT_PUBLIC_USE_EMULATORS`.
3. Tạo service account key (Project settings → Service accounts) và đặt nội dung JSON
   một dòng vào `FIREBASE_SERVICE_ACCOUNT` trên Vercel.
4. Triển khai rules và indexes sau khi đã chạy `npm run test:emulator`:
   `npx -y firebase-tools@latest deploy --only firestore --project <project-id>`
