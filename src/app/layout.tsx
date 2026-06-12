import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Z-Market — Chợ Số Việt Nam",
  description: "Chợ truyền thống số hoá - Mua sắm thực phẩm tươi ngon, giao hàng nhanh chóng",
  keywords: ["Z-Market", "chợ số", "thực phẩm", "giao hàng", "Việt Nam", "mua sắm online"],
  authors: [{ name: "Z-Market Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Z-Market — Chợ Số Việt Nam",
    description: "Chợ truyền thống số hoá - Mua sắm thực phẩm tươi ngon, giao hàng nhanh chóng",
    siteName: "Z-Market",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
