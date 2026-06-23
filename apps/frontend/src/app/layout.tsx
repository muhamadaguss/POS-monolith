import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/features/auth/SessionProvider";
import { OfflineBadge } from "@/features/pwa/OfflineBadge";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: 'optional',
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'optional',
  preload: false,
});

export const metadata: Metadata = {
  title: "Kasirku — Platform POS Digital untuk UMKM Indonesia",
  description:
    "Sistem POS all-in-one: kelola kasir, stok multi-outlet, laporan real-time, dan karyawan dari satu platform. Gratis selamanya untuk bisnis kecil.",
  applicationName: "Kasirku",
  keywords: [
    "POS Indonesia",
    "aplikasi kasir",
    "POS UMKM",
    "sistem kasir online",
    "manajemen stok",
    "aplikasi toko",
    "kasir digital",
    "POS restoran",
  ],
  authors: [{ name: "Kasirku" }],
  creator: "Kasirku",
  publisher: "Kasirku",
  openGraph: {
    title: "Kasirku — Platform POS Digital untuk UMKM Indonesia",
    description:
      "Kelola bisnis lebih cerdas dengan Kasirku. Gratis selamanya!",
    url: "https://kasirku.jobmarket.my.id",
    siteName: "Kasirku",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kasirku — Platform POS Digital",
    description:
      "Kelola bisnis lebih cerdas dengan Kasirku. Gratis selamanya!",
  },
  robots: {
    index: true,
    follow: true,
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Kasirku",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              description:
                "Sistem POS all-in-one untuk UMKM Indonesia. Kelola kasir, stok, laporan, dan staf dari satu platform.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "IDR",
              },
              author: {
                "@type": "Organization",
                name: "Kasirku",
              },
            }),
          }}
        />
        <SessionProvider>
          {children}
          <OfflineBadge />
        </SessionProvider>
      </body>
    </html>
  );
}
