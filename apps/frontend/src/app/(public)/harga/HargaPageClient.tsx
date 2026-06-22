'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Check, Menu, X, ArrowRight, Zap, Shield, Clock,
  HelpCircle, ChevronDown, Mail, Phone, MapPin,
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

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Gratis',
    period: '',
    description: 'Cocok untuk bisnis kecil',
    features: ['1 Outlet', '3 Karyawan', 'Fitur Dasar', 'Laporan Sederhana'],
    cta: 'Mulai Gratis',
    popular: false,
  },
  {
    name: 'Growth',
    price: 'Rp 299rb',
    period: '/bulan',
    description: 'Untuk bisnis yang berkembang',
    features: [
      '5 Outlet',
      '20 Karyawan',
      'Semua Fitur',
      'Laporan Lengkap',
      'Priority Support',
    ],
    cta: 'Pilih Paket',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Hubungi Kami',
    description: 'Untuk bisnis skala besar',
    features: [
      'Unlimited Outlet',
      'Unlimited Karyawan',
      'Custom Fitur',
      'Dedicated Support',
      'API Access',
    ],
    cta: 'Hubungi Kami',
    popular: false,
  },
];

const FAQS = [
  { q: 'Apakah benar-benar gratis selamanya?', a: 'Ya. Paket Gratis dan Pro tidak akan pernah berbayar untuk fitur yang sudah ada. Kami berkomitmen mendukung UMKM Indonesia.' },
  { q: 'Apakah bisa digunakan offline?', a: 'Bisa. Kasirku mendukung mode offline — transaksi tetap berjalan meskipun internet mati. Data akan sinkron otomatis saat online kembali.' },
  { q: 'Berapa banyak outlet yang bisa dikelola?', a: 'Paket Gratis mendukung hingga 3 outlet. Paket Pro tidak terbatas.' },
  { q: 'Apakah data saya aman?', a: 'Data Anda dienkripsi dan disimpan di server cloud yang aman. Akses berbasis peran memastikan hanya orang yang berwenang yang bisa mengakses data tertentu.' },
  { q: 'Bagaimana cara install sebagai aplikasi?', a: 'Cukup buka Kasirku di Chrome/HP, lalu pilih "Install App" atau "Add to Home Screen". Tidak perlu download dari Play Store.' },
  { q: 'Apakah bisa cetak struk dari browser?', a: 'Ya. Kasirku mendukung printer thermal ESC/POS via WebUSB atau cetak via browser biasa.' },
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

export default function HargaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
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
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${COLORS.primary} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
        {/* Gradient Blob */}
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
        <div className="absolute -bottom-32 -left-32 w-[350px] h-[350px] rounded-full opacity-[0.05] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6 transition-all duration-300 hover:scale-105 cursor-default" style={{ backgroundColor: COLORS.lightBg, color: COLORS.primary }}>
              <Zap size={14} />
              Paket Harga Transparan
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ color: COLORS.text }}>
              Pilih Paket yang <span style={{ color: COLORS.primary }}>Sesuai</span>
              <br />untuk Bisnis Anda
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10" style={{ color: COLORS.textSecondary }}>
              Mulai gratis, upgrade kapan saja sesuai kebutuhan bisnis Anda.
            </p>
          </FadeInSection>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <FadeInSection key={plan.name}>
                <div
                  className={`relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
                    plan.popular
                      ? 'bg-white shadow-xl border-2 border-emerald-500 scale-105 md:scale-110'
                      : 'bg-white border border-gray-200 hover:shadow-xl hover:border-emerald-200'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                      ⭐ PALING POPULER
                    </div>
                  )}
                  <h3 className="text-lg font-semibold" style={{ color: COLORS.text }}>
                    {plan.name}
                  </h3>
                  <div className="mt-2 mb-1">
                    <span
                      className="text-3xl font-bold"
                      style={{ color: plan.popular ? COLORS.primary : COLORS.text }}
                    >
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-sm" style={{ color: COLORS.textSecondary }}>
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
                    {plan.description}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: COLORS.text }}
                      >
                        <Check size={16} style={{ color: COLORS.primary }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.cta === 'Hubungi Kami' ? '/contact' : '/register'}
                    className={`block w-full py-3 text-center font-medium rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:opacity-90'
                        : 'text-white hover:opacity-90 hover:shadow-lg'
                    }`}
                    style={plan.popular ? {} : { backgroundColor: COLORS.primary }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" style={{ backgroundColor: COLORS.warmBg }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: COLORS.text }}>Pertanyaan <span style={{ color: COLORS.primary }}>Umum</span></h2>
            <p className="text-center text-sm mb-12" style={{ color: COLORS.textSecondary }}>Temukan jawaban cepat untuk pertanyaan Anda</p>
          </FadeInSection>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <FadeInSection key={i}>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-200">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-medium transition-colors hover:bg-gray-50/70"
                    style={{ color: COLORS.text }}>
                    <span className="pr-4">{faq.q}</span>
                    <HelpCircle size={18} className={`transition-all duration-300 flex-shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: COLORS.primary }} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-96 pb-5' : 'max-h-0'}`}>
                    <p className="px-5 text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>{faq.a}</p>
                  </div>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 overflow-hidden relative">
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
              Mulai Sekarang, <span style={{ color: COLORS.primary }}>Gratis</span>
            </h2>
            <p className="text-lg mb-10" style={{ color: COLORS.textSecondary }}>Tidak perlu kartu kredit. Tidak ada batas waktu.</p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-1 active:scale-95"
              style={{ backgroundColor: COLORS.primary }}>
              Daftar Gratis <ArrowRight size={20} />
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
                <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
              </ul>
            </div>

            {/* Perusahaan */}
            <div>
              <h4 className="font-semibold mb-4">Perusahaan</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Tentang</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Kontak</a></li>
              </ul>
            </div>

            {/* Kontak */}
            <div>
              <h4 className="font-semibold mb-4">Kontak</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center gap-2">
                  <Mail size={14} />
                  <a href="mailto:support@kasirku.id" className="hover:text-white transition-colors">support@kasirku.id</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>021-1234-5678</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span>Jakarta, Indonesia</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">© 2026 Kasirku. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
