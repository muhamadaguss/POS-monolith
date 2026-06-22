'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ShoppingCart, Package, BarChart3, Store, Users, Smartphone,
  ArrowRight, Check, Menu, X, ChevronDown, Shield, Zap, Clock,
  TrendingUp, Layers, QrCode, Printer, CreditCard, FileText,
  Bell, RefreshCw, Database, Globe, Lock, Headphones, ChevronRight,
} from 'lucide-react';

const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryAccent: '#065F46',
  lightBg: '#ECFDF5',
  warmBg: '#FFFBF5',
  text: '#1F2937',
  textSecondary: '#6B7280',
};

const NAV_ITEMS = [
  { label: 'Beranda', href: '/' },
  { label: 'Fitur', href: '/fitur' },
  { label: 'Harga', href: '/harga' },
];

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Kasir Cepat & Offline',
    desc: 'Antarmuka kasir yang intuitif dengan dukungan offline. Tetap bisa transaksi meskipun internet mati.',
  },
  {
    icon: Package,
    title: 'Manajemen Stok Multi-Outlet',
    desc: 'Kelola stok di berbagai cabang secara real-time. Atur stok minimum dan dapat notifikasi otomatis.',
  },
  {
    icon: BarChart3,
    title: 'Laporan Real-Time',
    desc: 'Pantau omzet harian, tren penjualan, laba rugi, dan performa produk secara langsung.',
  },
  {
    icon: Store,
    title: 'Multi-Outlet',
    desc: 'Kelola beberapa cabang dari satu akun. Setiap outlet punya stok & harga sendiri.',
  },
  {
    icon: Users,
    title: 'Manajemen Karyawan & RBAC',
    desc: 'Buat akun karyawan dengan perbedaan hak akses (Owner, Manager, Kasir).',
  },
  {
    icon: Smartphone,
    title: 'Responsive & PWA',
    desc: 'Akses dari HP, tablet, atau desktop. Install sebagai aplikasi & akses offline.',
  },
  {
    icon: Layers,
    title: 'Import CSV Massal',
    desc: 'Import ribuan produk sekaligus dari file CSV. Lengkap dengan preview & validasi.',
  },
  {
    icon: QrCode,
    title: 'Barcode & QR Scan',
    desc: 'Scan barcode produk untuk transaksi lebih cepat. Generate label barcode otomatis.',
  },
  {
    icon: Printer,
    title: 'Cetak Struk Otomatis',
    desc: 'Dukungan printer thermal. Cetak struk transaksi langsung dari kasir.',
  },
  {
    icon: CreditCard,
    title: 'Multi Pembayaran',
    desc: 'Tunai, QRIS, transfer, atau piutang. Fleksibel untuk berbagai model bisnis.',
  },
  {
    icon: FileText,
    title: 'Faktur & Catatan Transaksi',
    desc: 'Setiap transaksi tercatat rapi. Ekspor laporan ke Excel/PDF.',
  },
  {
    icon: Bell,
    title: 'Notifikasi Stok Habis',
    desc: 'Dapat pemberitahuan saat stok produk menipis atau habis di setiap outlet.',
  },
];

const BENEFITS = [
  {
    icon: Zap,
    title: '3x Lebih Cepat',
    desc: 'Proses transaksi 3x lebih cepat dari sistem manual atau spreadsheet.',
    color: 'bg-emerald-100 text-emerald-700',
  },
  {
    icon: Shield,
    title: 'Aman & Terpercaya',
    desc: 'Data tersimpan aman di cloud. Akses berbasis peran dan enkripsi penuh.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Clock,
    title: 'Hemat Waktu',
    desc: 'Fitur import massal dan cetak otomatis mengurangi pekerjaan manual hingga 80%.',
    color: 'bg-amber-100 text-amber-700',
  },
];

function FadeInSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      {children}
    </div>
  );
}

export default function FiturPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white" style={{ color: COLORS.text }}>
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-lg">Kasirku</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}
                  className="text-sm font-medium transition-colors hover:text-emerald-600"
                  style={{ color: item.href === '/fitur' ? COLORS.primary : COLORS.textSecondary }}>
                  {item.label}
                </Link>
              ))}
              <Link href="/register"
                className="text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:shadow-lg hover:scale-105"
                style={{ backgroundColor: COLORS.primary }}>
                Coba Gratis
              </Link>
            </div>
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          {menuOpen && (
            <div className="md:hidden pb-4 border-t border-gray-100 pt-4 space-y-3">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                  {item.label}
                </Link>
              ))}
              <Link href="/register" onClick={() => setMenuOpen(false)}
                className="block text-center text-white text-sm font-semibold px-5 py-2 rounded-xl" style={{ backgroundColor: COLORS.primary }}>
                Coba Gratis
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden py-20 md:py-28" style={{ background: `linear-gradient(160deg, ${COLORS.warmBg} 0%, #FFFAF2 30%, #F0FDF4 60%, #ECFDF5 80%, ${COLORS.warmBg} 100%)` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: COLORS.lightBg, color: COLORS.primary }}>
              <Zap size={14} />
              Semua fitur yang Anda butuhkan
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Fitur Lengkap untuk
              <br />
              <span style={{ color: COLORS.primary }}>Bisnis Modern</span>
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10" style={{ color: COLORS.textSecondary }}>
              Dari kasir cepat hingga laporan real-time — semua dalam satu platform yang mudah digunakan.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: COLORS.primary }}>
              Mulai Gratis
              <ArrowRight size={20} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      {/* ── GRID FITUR ── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Semua Fitur dalam{' '}
                <span style={{ color: COLORS.primary }}>Satu Platform</span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: COLORS.textSecondary }}>
                Tidak perlu berlangganan aplikasi terpisah. Kasirku mencakup semua kebutuhan operasional bisnis Anda.
              </p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feat, i) => (
              <FadeInSection key={feat.title}>
                <div className="group p-6 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: COLORS.lightBg }}>
                    <feat.icon size={24} style={{ color: COLORS.primary }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{feat.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>{feat.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="py-20" style={{ backgroundColor: COLORS.warmBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Kenapa Pilih <span style={{ color: COLORS.primary }}>Kasirku</span>?
              </h2>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <FadeInSection key={b.title}>
                <div className="text-center p-8 rounded-2xl bg-white border border-gray-100 hover:shadow-lg transition-all">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${b.color}`}>
                    <b.icon size={28} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{b.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>{b.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Siap <span style={{ color: COLORS.primary }}>Mengubah Bisnis</span> Anda?
            </h2>
            <p className="text-lg mb-8" style={{ color: COLORS.textSecondary }}>
              Gratis selamanya untuk bisnis kecil. Tidak perlu kartu kredit.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: COLORS.primary }}>
              Daftar Gratis Sekarang
              <ArrowRight size={20} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-gray-100" style={{ backgroundColor: COLORS.warmBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold">Kasirku</span>
            </div>
            <div className="flex items-center gap-6 text-sm" style={{ color: COLORS.textSecondary }}>
              <Link href="/" className="hover:text-emerald-600">Beranda</Link>
              <Link href="/fitur" className="hover:text-emerald-600">Fitur</Link>
              <Link href="/harga" className="hover:text-emerald-600">Harga</Link>
            </div>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>© 2026 Kasirku. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
