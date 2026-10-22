"use client";

import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  PlusOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { Drawer } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Logo } from "@/components/common/logo";
import { useShop } from "@/components/shop/shop-provider";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const HOME: NavItem = { href: "/", label: "Tổng quan", icon: <HomeOutlined /> };
const SALES: NavItem = { href: "/ban-hang", label: "Đơn bán", icon: <ShoppingOutlined /> };
const STOCK: NavItem = { href: "/kho", label: "Kho", icon: <InboxOutlined /> };

// Nhóm theo tần suất dùng: việc hằng ngày trước, cài đặt sau cùng.
const GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Hằng ngày",
    items: [
      HOME,
      SALES,
      STOCK,
      { href: "/chi-phi", label: "Chi phí", icon: <WalletOutlined /> },
      { href: "/khach-hang", label: "Khách hàng", icon: <UserOutlined /> },
    ],
  },
  {
    title: "Sổ sách",
    items: [
      { href: "/bao-cao", label: "Báo cáo", icon: <BarChartOutlined /> },
      { href: "/thue", label: "Thuế", icon: <AuditOutlined /> },
      { href: "/kho/lich-su", label: "Chứng từ kho", icon: <FileTextOutlined /> },
      { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: <ShopOutlined /> },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/cai-dat", label: "Cài đặt", icon: <SettingOutlined /> },
      { href: "/thanh-vien", label: "Thành viên", icon: <TeamOutlined /> },
    ],
  },
];

/** Mục không có trên thanh dưới của điện thoại, hiện trong ngăn "Thêm". */
const MORE = GROUPS.flatMap((g) => g.items).filter((i) => ![HOME, SALES, STOCK].includes(i));

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  // Các trang con của kho (nhập, chế biến, điều chỉnh) vẫn thuộc "Kho", trừ chứng từ kho có mục riêng.
  if (href === "/kho") return pathname === "/kho" || (pathname.startsWith("/kho/") && !pathname.startsWith("/kho/lich-su"));
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SideLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
        active ? "bg-brand-gradient font-semibold text-white! shadow-[0_6px_16px_rgba(15,110,86,0.28)]" : "text-ink! hover:bg-canvas"
      }`}
    >
      <span className={`grid h-5 w-5 place-items-center text-base ${active ? "text-white" : "text-muted group-hover:text-brand"}`}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 pb-2 pt-2 text-[11px] ${active ? "font-semibold text-brand!" : "text-muted!"}`}
    >
      <span className={`grid h-8 w-14 place-items-center rounded-full text-lg transition-colors ${active ? "bg-brand-gradient-soft" : ""}`}>
        {item.icon}
      </span>
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  const { user, signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE.some((i) => isActive(pathname, i.href));

  return (
    <div className="min-h-screen md:flex">
      <aside className="nest-watermark sticky top-0 hidden h-screen overflow-hidden w-64 shrink-0 flex-col border-r border-line bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Logo className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">{shop.name}</div>
            <div className="text-xs text-muted">Sổ Yến</div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <Link
            href="/ban-hang/moi"
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-gradient font-semibold text-white! shadow-[0_6px_16px_-6px_rgba(8,80,65,0.55)] transition hover:brightness-110"
          >
            <PlusOutlined />
            Bán hàng
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/70">{group.title}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SideLink key={item.href} item={item} active={isActive(pathname, item.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <div className="min-w-0 flex-1 truncate text-sm text-muted">{user?.displayName ?? user?.email}</div>
          <button
            type="button"
            onClick={() => void signOut()}
            title="Đăng xuất"
            className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-debt-soft hover:text-debt"
          >
            <LogoutOutlined />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/90 px-4 py-3 backdrop-blur md:hidden">
          <Logo className="h-8 w-8 shrink-0" />
          <span className="truncate font-semibold">{shop.name}</span>
        </header>
        <main className="px-4 pb-28 pt-5 md:px-8 md:pb-10 md:pt-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-end border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(31,42,38,0.06)] md:hidden">
        <BottomLink item={HOME} active={isActive(pathname, HOME.href)} />
        <BottomLink item={SALES} active={isActive(pathname, SALES.href)} />
        <Link href="/ban-hang/moi" className="flex flex-col items-center gap-1 pb-2 text-[11px] font-medium text-ink!">
          <span className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-2xl text-white ring-4 ring-white shadow-[0_8px_20px_rgba(15,110,86,0.35)]">
            <PlusOutlined />
          </span>
          Bán
        </Link>
        <BottomLink item={STOCK} active={isActive(pathname, STOCK.href)} />
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-1 pb-2 pt-2 text-[11px] ${moreActive ? "font-semibold text-brand" : "text-muted"}`}
        >
          <span className={`grid h-8 w-14 place-items-center rounded-full text-lg ${moreActive ? "bg-brand-soft" : ""}`}>
            <AppstoreOutlined />
          </span>
          Thêm
        </button>
      </nav>

      <Drawer placement="bottom" open={moreOpen} onClose={() => setMoreOpen(false)} title="Thêm" size="auto">
        <div className="grid grid-cols-3 gap-2">
          {MORE.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 text-center text-sm ${
                  active ? "border-brand bg-brand-soft font-semibold text-brand-dark!" : "border-line text-ink!"
                }`}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-xl text-lg ${active ? "bg-brand-gradient text-white" : "bg-brand-gradient-soft text-brand"}`}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-line py-3 text-debt"
        >
          <LogoutOutlined />
          Đăng xuất
        </button>
      </Drawer>
    </div>
  );
}
