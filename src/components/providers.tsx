"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#956b18",
    colorInfo: "#956b18",
    colorSuccess: "#58a97d",
    colorWarning: "#d5a936",
    colorError: "#dc6e73",
    colorText: "#302b20",
    colorBorder: "#e9e0ce",
    colorBgLayout: "#faf8f1",
    borderRadius: 12,
    fontFamily: 'var(--font-vietnam), "Segoe UI", sans-serif',
    controlHeight: 40,
  },
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StyleProvider layer>
      <ConfigProvider locale={viVN} theme={theme}>
        <App>
          <AuthProvider>{children}</AuthProvider>
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
}
