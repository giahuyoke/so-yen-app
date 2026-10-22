"use client";

import {
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  InboxOutlined,
  LogoutOutlined,
  ShopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Drawer } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useShop } from "@/components/shop/shop-provider";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const PRIMARY: NavItem[] = [
  { href: "/", label: "Tổng quan", icon: <HomeOutlined /> },
  { href: "/kho", label: "Kho", icon: <InboxOutlined /> },
  { href: "/kho/lich-su", label: "Chứng từ", icon: <FileTextOutlined /> },
];

const MORE: NavItem[] = [
  { href: "/nha-cung-cap", label: "Nhà cung cấp", icon: <ShopOutlined /> },
  { href: "/thanh-vien", label: "Thành viên", icon: <TeamOutlined /> },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/kho") return pathname === "/kho";
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { shop } = useShop();
  const { signOut } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-56 shrink-0 border-r border-[#e9e0ce] bg-white p-4 md:block">
        <div className="mb-6 truncate text-lg font-semibold">{shop.name}</div>
        <nav className="space-y-1">
          {[...PRIMARY, ...MORE].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                isActive(pathname, item.href) ? "bg-amber-100 font-medium text-amber-900" : "hover:bg-amber-50"
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

      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8">
        <div className="mb-3 truncate font-semibold md:hidden">{shop.name}</div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-[#e9e0ce] bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {PRIMARY.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-2 text-xs ${isActive(pathname, item.href) ? "text-amber-800" : "text-stone-500"}`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </Link>
        ))}
        <button type="button" onClick={() => setMoreOpen(true)} className="flex flex-col items-center py-2 text-xs text-stone-500">
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
              className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-amber-50"
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left hover:bg-amber-50"
          >
            <LogoutOutlined />
            Đăng xuất
          </button>
        </div>
      </Drawer>
    </div>
  );
}
