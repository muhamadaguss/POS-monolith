import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { OfflineBadge } from "@/features/pwa/OfflineBadge";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kasirku — Platform POS untuk UMKM",
  description: "Kelola kasir, stok, laporan, dan staf dari satu platform.",
  // PWA: manifest.ts terdeteksi otomatis; tambahkan dukungan ikon & iOS standalone.
  applicationName: "Kasirku",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kasirku",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

// theme-color status bar (Next 16 — export viewport terpisah dari metadata).
export const viewport: Viewport = {
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          {children}
          <OfflineBadge />
        </SessionProvider>
      </body>
    </html>
  );
}
