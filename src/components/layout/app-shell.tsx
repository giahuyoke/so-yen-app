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
import { Button, Drawer } from "antd";
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

// Xếp theo tần suất dùng: việc hằng ngày trước, cài đặt sau cùng.
const MORE: NavItem[] = [
  { href: "/chi-phi", label: "Chi phí", icon: <WalletOutlined /> },
  { href: "/bao-cao", label: "Báo cáo", icon: <BarChartOutlined /> },
  { href: "/khach-hang", label: "Khách hàng", icon: <UserOutlined /> },
  { href: "/thue", label: "Thuế", icon: <AuditOutlined /> },
  { href: "/kho/lich-su", label: "Chứng từ kho", icon: <FileTextOutlined /> },
  { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: <ShopOutlined /> },
  { href: "/cai-dat", label: "Cài đặt", icon: <SettingOutlined /> },
  { href: "/thanh-vien", label: "Thành viên", icon: <TeamOutlined /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/kho") return pathname === "/kho";
  if (href === "/ban-hang") return pathname === "/ban-hang";
  return pathname.startsWith(href);
}

function BottomLink({ item, pathname }: { item: NavItem; pathname: string }) {
  return (
    <Link
      href={item.href}
      className={`flex flex-col items-center py-2 text-xs ${isActive(pathname, item.href) ? "font-medium text-brand" : "text-muted"}`}
    >
      <span className="text-lg">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-line bg-white p-4 md:block">
        <div className="mb-4 flex items-center gap-2">
          <Logo className="h-9 w-9 shrink-0" />
          <span className="truncate text-lg font-semibold">{shop.name}</span>
        </div>
        <Link href="/ban-hang/moi">
          <Button type="primary" block size="large" icon={<PlusOutlined />} className="mb-4">Bán hàng</Button>
        </Link>
        <nav className="space-y-1">
          {[HOME, SALES, STOCK, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isActive(pathname, item.href) ? "bg-brand-soft font-medium text-brand-dark" : "text-muted hover:bg-canvas"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <Button className="mt-6" block icon={<LogoutOutlined />} onClick={() => void signOut()}>
          Đăng xuất
        </Button>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-8">
        <div className="mb-3 truncate font-semibold md:hidden">{shop.name}</div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-5 items-end border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <BottomLink item={HOME} pathname={pathname} />
        <BottomLink item={SALES} pathname={pathname} />
        <Link href="/ban-hang/moi" className="flex flex-col items-center pb-2 text-xs font-medium text-brand">
          <span className="-mt-6 mb-1 grid h-14 w-14 place-items-center rounded-full bg-brand text-2xl text-white shadow-[0_8px_20px_rgba(15,110,86,0.35)]">
            <PlusOutlined />
          </span>
          Bán
        </Link>
        <BottomLink item={STOCK} pathname={pathname} />
        <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center py-2 text-xs text-muted">
          <span className="text-lg"><AppstoreOutlined /></span>
          Thêm
        </button>
      </nav>

      <Drawer placement="bottom" open={moreOpen} onClose={() => setMoreOpen(false)} title="Thêm" size="auto">
        <div className="space-y-1">
          {MORE.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-canvas"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-canvas"
          >
            <LogoutOutlined />
            Đăng xuất
          </button>
        </div>
      </Drawer>
    </div>
  );
}
