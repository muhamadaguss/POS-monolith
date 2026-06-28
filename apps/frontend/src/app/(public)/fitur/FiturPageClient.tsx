'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShoppingCart, Package, BarChart3, Store, Users, Smartphone,
  ArrowRight, Check, Menu, X, Zap, Clock, TrendingUp, Layers,
  QrCode, Printer, CreditCard, FileText, Bell, Shield, ChevronDown,
  Mail, Phone, MapPin,
} from 'lucide-react';

const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
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
  { icon: ShoppingCart, title: 'Kasir Cepat & Offline', desc: 'Antarmuka kasir yang intuitif dengan dukungan offline. Tetap bisa transaksi meskipun internet mati.' },
  { icon: Package, title: 'Manajemen Stok Multi-Outlet', desc: 'Kelola stok di berbagai cabang secara real-time. Atur stok minimum dan dapat notifikasi otomatis.' },
  { icon: BarChart3, title: 'Laporan Real-Time', desc: 'Pantau omzet harian, tren penjualan, laba rugi, dan performa produk secara langsung.' },
  { icon: Store, title: 'Multi-Outlet', desc: 'Kelola beberapa cabang dari satu akun. Setiap outlet punya stok & harga sendiri.' },
  { icon: Users, title: 'Manajemen Karyawan & RBAC', desc: 'Buat akun karyawan dengan perbedaan hak akses (Owner, Manager, Kasir).' },
  { icon: Smartphone, title: 'Responsive & PWA', desc: 'Akses dari HP, tablet, atau desktop. Install sebagai aplikasi & akses offline.' },
  { icon: Layers, title: 'Import CSV Massal', desc: 'Import ribuan produk sekaligus dari file CSV. Lengkap dengan preview & validasi.' },
  { icon: QrCode, title: 'Barcode & QR Scan', desc: 'Scan barcode produk untuk transaksi lebih cepat. Generate label barcode otomatis.' },
  { icon: Printer, title: 'Cetak Struk Otomatis', desc: 'Dukungan printer thermal. Cetak struk transaksi langsung dari kasir.' },
  { icon: CreditCard, title: 'Multi Pembayaran', desc: 'Tunai, QRIS, transfer, atau piutang. Fleksibel untuk berbagai model bisnis.' },
  { icon: FileText, title: 'Faktur & Catatan Transaksi', desc: 'Setiap transaksi tercatat rapi. Ekspor laporan ke Excel/PDF.' },
  { icon: Bell, title: 'Notifikasi Stok Habis', desc: 'Dapat pemberitahuan saat stok produk menipis atau habis di setiap outlet.' },
];

const BENEFITS = [
  { icon: Zap, title: '3x Lebih Cepat', desc: 'Proses transaksi 3x lebih cepat dari sistem manual.', color: 'bg-emerald-100 text-emerald-700' },
  { icon: Shield, title: 'Aman & Terpercaya', desc: 'Data tersimpan aman di cloud dengan enkripsi penuh.', color: 'bg-blue-100 text-blue-700' },
  { icon: Clock, title: 'Hemat Waktu', desc: 'Fitur import massal mengurangi pekerjaan manual hingga 80%.', color: 'bg-amber-100 text-amber-700' },
];

function FadeInSection({ children }: { children: React.ReactNode }) {
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
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-white" style={{ color: COLORS.text }}>
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            {/* Logo - KIRI */}
            <div className="flex-1 flex justify-start">
              <Link href="/" className="flex items-center gap-2 group cursor-pointer">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{ backgroundColor: COLORS.primary }}>
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <span className="font-bold text-xl transition-colors" style={{ color: COLORS.text }}>
                  Kasirku
                </span>
              </Link>
            </div>

            {/* Desktop Nav - TENGAH */}
            <div className="hidden md:flex flex-1 justify-center">
              <nav className="flex items-center gap-8">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href}
                    className="text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                    style={{ color: isActive(item.href) ? COLORS.primary : COLORS.textSecondary }}>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* CTA + Hamburger - KANAN */}
            <div className="flex-1 flex justify-end items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: COLORS.text }}>
                  Login
                </Link>
                <Link href="/register" className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: COLORS.primary }}>
                  Mulai Gratis
                </Link>
              </div>
              <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                {menuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="md:hidden pb-4 border-t border-gray-100 pt-4 space-y-3">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className="block text-sm font-medium py-2 px-3 hover:bg-gray-50 rounded-lg" style={{ color: COLORS.textSecondary }}>
                  {item.label}
                </Link>
              ))}
              <hr className="border-gray-100" />
              <Link href="/login" onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium py-2 px-3" style={{ color: COLORS.text }}>
                Login
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}
                className="block text-center text-white text-sm font-semibold px-5 py-3 rounded-xl" style={{ backgroundColor: COLORS.primary }}>
                Mulai Gratis
              </Link>
            </div>
          )}
        </div>
      </nav>

      <section className="relative overflow-hidden py-20 md:py-28" style={{ background: `linear-gradient(160deg, ${COLORS.warmBg} 0%, #FFFAF2 30%, #F0FDF4 60%, #ECFDF5 80%, ${COLORS.warmBg} 100%)` }}>
        {/* Grid Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, ${COLORS.primary} 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        />
        {/* Gradient Blob */}
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full opacity-[0.05] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 transition-all duration-300 hover:scale-105 cursor-default" style={{ backgroundColor: COLORS.lightBg, color: COLORS.primary }}>
              <Zap size={14} />
              Semua fitur yang Anda butuhkan
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ color: COLORS.text }}>
              Fitur Lengkap untuk<br />
              <span style={{ color: COLORS.primary }}>Bisnis Modern</span>
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10" style={{ color: COLORS.textSecondary }}>
              Dari kasir cepat hingga laporan real-time — semua dalam satu platform.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95"
              style={{ backgroundColor: COLORS.primary }}>
              Mulai Gratis <ArrowRight size={20} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Semua Fitur dalam <span style={{ color: COLORS.primary }}>Satu Platform</span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: COLORS.textSecondary }}>
                Tidak perlu berlangganan aplikasi terpisah.
              </p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feat) => (
              <FadeInSection key={feat.title}>
                <div className="group relative p-6 rounded-2xl border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden cursor-pointer">
                  {/* Bottom gradient line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, transparent 50%)` }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative" style={{ backgroundColor: COLORS.lightBg }}>
                    <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: `0 0 20px ${COLORS.primary}40` }} />
                    <feat.icon size={24} style={{ color: COLORS.primary, position: 'relative', zIndex: 1 }} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 transition-colors group-hover:text-emerald-700 relative z-[1]">{feat.title}</h3>
                  <p className="text-sm leading-relaxed relative z-[1]" style={{ color: COLORS.textSecondary }}>{feat.desc}</p>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: COLORS.warmBg }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Kenapa Pilih <span style={{ color: COLORS.primary }}>Kasirku</span>?</h2>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {BENEFITS.map((b) => (
              <FadeInSection key={b.title}>
                <div className="text-center p-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-gray-100 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 hover:scale-110 ${b.color}`}>
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

      <section className="py-20 overflow-hidden relative">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-[0.05] blur-3xl" style={{ backgroundColor: COLORS.primary }} />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.04] blur-3xl" style={{ backgroundColor: COLORS.primary }} />
        </div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <FadeInSection>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6" style={{ backgroundColor: `${COLORS.primary}15` }}>
              <Zap size={32} style={{ color: COLORS.primary }} />
            </div>
            <h2 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: COLORS.text }}>
              Siap <span style={{ color: COLORS.primary }}>Mengubah Bisnis</span> Anda?
            </h2>
            <p className="text-lg mb-10" style={{ color: COLORS.textSecondary }}>Gratis selamanya untuk bisnis kecil.</p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95"
              style={{ backgroundColor: COLORS.primary }}>
              Daftar Gratis Sekarang <ArrowRight size={20} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}>
                  <span className="text-white font-bold text-sm">K</span>
                </div>
                <span className="font-bold text-xl">Kasirku</span>
              </div>
              <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                Sistem POS all-in-one untuk UMKM Indonesia. Kelola bisnis lebih cerdas dengan Kasirku.
              </p>
              <div className="flex items-center gap-3">
                {['Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map((social) => (
                  <a key={social} href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-emerald-600 transition-all duration-300 hover:scale-110" aria-label={social}>
                    <span className="text-xs font-medium">{social[0]}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Produk */}
            <div>
              <h4 className="font-semibold mb-4">Produk</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link href="/" className="hover:text-white transition-colors">Beranda</Link></li>
                <li><Link href="/fitur" className="hover:text-white transition-colors">Fitur</Link></li>
                <li><Link href="/harga" className="hover:text-white transition-colors">Harga</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                <li><Link href="/refund" className="hover:text-white transition-colors">Kebijakan Refund</Link></li>
              </ul>
            </div>

            {/* Perusahaan */}
            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Tentang</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
                <li><Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link></li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail size={14} />
                  <a href="mailto:muhamadagus3197@gmail.com" className="hover:text-white transition-colors">muhamadagus3197@gmail.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>0813-8474-2399</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>Bekasi, Indonesia</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2026 Kasirku. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/terms" className="hover:text-white transition-colors">Syarat & Ketentuan</Link>
              <Link href="/refund" className="hover:text-white transition-colors">Kebijakan Refund</Link>
              <Link href="/kontak" className="hover:text-white transition-colors">Kontak</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
