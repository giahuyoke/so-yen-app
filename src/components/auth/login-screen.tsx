"use client";

import { LoadingOutlined } from "@ant-design/icons";
import { Alert, App } from "antd";
import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { Logo } from "@/components/common/logo";

const FEATURES = [
  { title: "Kho", desc: "Nhập, chế biến, tồn kho theo lô" },
  { title: "Bán hàng", desc: "Đơn, công nợ, gửi khách tóm tắt" },
  { title: "Thuế", desc: "Sổ sách đúng mẫu hộ kinh doanh" },
];

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Họa tiết tổ yến: các vòng cung lồng nhau như sợi tổ. */
function NestPattern({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden fill="none">
      {Array.from({ length: 9 }, (_, i) => (
        <ellipse
          key={i}
          cx="200"
          cy="140"
          rx={60 + i * 22}
          ry={30 + i * 15}
          stroke="currentColor"
          strokeWidth="1.2"
          strokeDasharray={i % 2 ? "2 6" : undefined}
          transform={`rotate(${i * 4 - 16} 200 140)`}
        />
      ))}
    </svg>
  );
}

export function LoginScreen({ sessionError, signIn }: { sessionError: boolean; signIn: () => Promise<unknown> }) {
  const { message } = App.useApp();
  const [signingIn, setSigningIn] = useState(false);

  async function handleSignIn() {
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      if (error instanceof FirebaseError && error.code === "auth/popup-closed-by-user") return;
      void message.error(
        error instanceof FirebaseError && error.code === "auth/popup-blocked"
          ? "Trình duyệt đã chặn cửa sổ đăng nhập. Hãy cho phép pop-up rồi thử lại."
          : "Không thể đăng nhập bằng Google.",
      );
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.15fr_1fr]">
      {/* Panel thương hiệu */}
      <section className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-brand via-brand to-brand-dark px-6 pb-10 pt-10 text-white lg:rounded-none lg:px-14 lg:py-16">
        <NestPattern className="pointer-events-none absolute -right-24 -top-10 w-[34rem] text-brand-tint/25" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-brand-tint/20 blur-3xl" />

        <div className="relative flex h-full max-w-lg flex-col">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11 rounded-[0.7rem] shadow-lg shadow-black/20 ring-1 ring-white/25" />
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-brand-tint">Sổ Yến</span>
          </div>

          <h1 className="mt-8 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:mt-auto lg:text-5xl">
            Sổ sách yến sào,
            <br />
            <span className="text-brand-tint">gọn trong một chạm.</span>
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/75 sm:text-base">
            Quản lý kho, bán hàng và thuế cho hộ kinh doanh yến — trên điện thoại hay máy tính đều tiện.
          </p>

          <ul className="mt-8 grid grid-cols-3 gap-2 sm:gap-3 lg:mb-auto">
            {FEATURES.map((f, i) => (
              <li
                key={f.title}
                className="rounded-2xl bg-white/10 p-3 ring-1 sm:p-4 ring-white/15 backdrop-blur-sm"
              >
                <span className="text-xs font-medium text-brand-tint">0{i + 1}</span>
                <p className="mt-1 font-semibold">{f.title}</p>
                <p className="mt-0.5 hidden text-sm text-white/70 sm:block">{f.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Đăng nhập */}
      <section className="flex items-center justify-center px-6 py-10 lg:px-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Chào mừng trở lại 👋</h2>
          <p className="mt-2 text-muted">Đăng nhập bằng tài khoản Google để tiếp tục sổ sách của cửa hàng.</p>

          {sessionError && (
            <Alert className="mt-6" type="error" showIcon title="Không tạo được phiên đăng nhập. Vui lòng thử lại." />
          )}

          <button
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className="group mt-8 flex h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-2xl border border-line bg-white px-5 font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand-tint hover:shadow-lg hover:shadow-brand/10 active:translate-y-0 disabled:cursor-wait disabled:opacity-70"
          >
            {signingIn ? <LoadingOutlined className="text-brand" /> : <GoogleMark />}
            <span>{signingIn ? "Đang mở Google…" : "Tiếp tục với Google"}</span>
          </button>

          <div className="mt-8 flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            Dữ liệu được đồng bộ an toàn trên đám mây
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      </section>
    </div>
  );
}
