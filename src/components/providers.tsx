"use client";

import { StyleProvider } from "@ant-design/cssinjs";
import { App, ConfigProvider, type ThemeConfig } from "antd";
import viVN from "antd/locale/vi_VN";
import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-provider";

// Khớp với bảng màu trong globals.css (@theme).
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#0f6e56",
    colorInfo: "#0f6e56",
    colorSuccess: "#1d9e75",
    colorWarning: "#ba7517",
    colorError: "#b42318",
    colorText: "#1f2a26",
    colorTextSecondary: "#5f6b66",
    colorBorder: "#d6e0db",
    colorBorderSecondary: "#e3eae6",
    colorBgLayout: "#f4f7f5",
    borderRadius: 12,
    borderRadiusLG: 18,
    fontFamily: 'var(--font-app), "Segoe UI", sans-serif',
    fontSize: 15,
    controlHeight: 44,
    boxShadow: "none",
    boxShadowSecondary: "0 8px 24px rgba(15, 110, 86, 0.12)",
  },
  components: {
    Button: { primaryShadow: "none", defaultShadow: "none", fontWeight: 500 },
    Card: { headerFontSize: 16, paddingLG: 18 },
    Segmented: { itemSelectedBg: "#ffffff", trackBg: "#e6ede9" },
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
