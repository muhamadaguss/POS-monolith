'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Check, Menu, X, ArrowRight, Zap, Shield, Clock, Star, Users,
  Infinity, CreditCard, HelpCircle, ChevronDown, Mail, Phone,
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

const PLANS = [
  {
    name: 'Gratis',
    price: '0',
    period: 'selamanya',
    desc: 'Untuk UMKM yang baru mulai. Fitur lengkap tanpa batas.',
    popular: false,
    features: [
      'Kasir cepat & offline',
      'Manajemen stok multi-outlet',
      'Laporan penjualan real-time',
      'Manajemen karyawan (max 3)',
      'Import CSV produk',
      'Barcode & QR scan',
      'Cetak struk thermal',
      'Multi pembayaran',
    ],
    cta: 'Mulai Gratis',
    href: '/register',
  },
  {
    name: 'Pro',
    price: 'Gratis',
    period: 'juga selamanya',
    desc: 'Semua fitur tanpa batasan. Untuk bisnis berkembang.',
    popular: true,
    features: [
      'Semua fitur Gratis +',
      'Manajemen karyawan tak terbatas',
      'Pencatatan stok masuk/keluar',
      'Faktur & ekspor laporan PDF/Excel',
      'Manajemen piutang',
      'Multi-outlet tak terbatas',
      'Import/ekspor data massal',
      'Notifikasi stok habis',
      'Prioritas support',
    ],
    cta: 'Mulai Sekarang',
    href: '/register',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'hubungi kami',
    desc: 'Solusi khusus untuk bisnis besar dengan kebutuhan spesifik.',
    popular: false,
    features: [
      'Semua fitur Pro +',
      'Dedicated server',
      'API akses untuk integrasi',
      'Kustomisasi fitur',
      'SLI 99.9% uptime',
      'Dedicated support 24/7',
      'Pelatihan tim',
      'Audit log & keamanan ekstra',
    ],
    cta: 'Hubungi Kami',
    href: 'mailto:hello@kasirku.app',
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

export default function HargaPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
                  style={{ color: item.href === '/harga' ? COLORS.primary : COLORS.textSecondary }}>
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
              Harga transparan, tanpa biaya tersembunyi
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Harga yang{' '}
              <span style={{ color: COLORS.primary }}>Sederhana</span>
              <br />
              untuk Semua Bisnis
            </h1>
            <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10" style={{ color: COLORS.textSecondary }}>
              Mulai gratis selamanya. Upgrade kapan pun Anda butuh fitur lebih.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PLANS.map((plan, i) => (
              <FadeInSection key={plan.name}>
                <div className={`relative rounded-2xl border p-8 transition-all hover:shadow-xl ${
                  plan.popular ? 'border-emerald-500 shadow-lg scale-105 md:scale-110' : 'border-gray-100'
                }`} style={{ backgroundColor: plan.popular ? '#F0FDF4' : 'white' }}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ backgroundColor: COLORS.primary }}>
                      PALING POPULER
                    </div>
                  )}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>{plan.desc}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="ml-1 text-sm" style={{ color: COLORS.textSecondary }}>/{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check size={16} className="mt-0.5 shrink-0" style={{ color: COLORS.primary }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}
                    className={`block text-center font-semibold py-3 px-6 rounded-xl transition-all ${
                      plan.popular
                        ? 'text-white hover:shadow-lg hover:scale-105'
                        : 'border-2 hover:bg-emerald-50'
                    }`}
                    style={{
                      backgroundColor: plan.popular ? COLORS.primary : 'transparent',
                      borderColor: plan.popular ? 'transparent' : COLORS.primary,
                      color: plan.popular ? 'white' : COLORS.primary,
                    }}>
                    {plan.cta}
                  </Link>
                </div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20" style={{ backgroundColor: COLORS.warmBg }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeInSection>
            <h2 className="text-3xl font-bold text-center mb-12">
              Pertanyaan <span style={{ color: COLORS.primary }}>Umum</span>
            </h2>
          </FadeInSection>
          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <FadeInSection key={i}>
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between p-5 text-left font-medium transition-colors hover:bg-gray-50">
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} style={{ color: COLORS.primary }} />
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

      {/* ── CTA ── */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <FadeInSection>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Mulai Sekarang,{' '}
              <span style={{ color: COLORS.primary }}>Gratis</span>
            </h2>
            <p className="text-lg mb-8" style={{ color: COLORS.textSecondary }}>
              Tidak perlu kartu kredit. Tidak ada batas waktu. 
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 text-white text-lg font-semibold px-8 py-4 rounded-2xl transition-all hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: COLORS.primary }}>
              Daftar Gratis
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
