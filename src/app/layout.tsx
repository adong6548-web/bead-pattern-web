import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "拼豆图纸工具 MVP",
  description: "浏览器本地生成多尺寸拼豆图纸",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
