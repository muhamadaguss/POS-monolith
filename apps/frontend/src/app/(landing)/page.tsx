'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Store,
  Users,
  Smartphone,
  ArrowRight,
  Check,
  Star,
  Menu,
  X,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Color Palette (from design reference)
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#059669', // emerald-600
  primaryDark: '#047857', // emerald-700
  primaryAccent: '#065F46', // emerald-800
  lightBg: '#ECFDF5', // emerald-50
  warmBg: '#FFFBF5', // cream
  text: '#1F2937', // gray-800
  textSecondary: '#6B7280', // gray-500
};

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────

function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: COLORS.primary }}
            >
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-xl" style={{ color: COLORS.text }}>
              Kasirku
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#fitur"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: COLORS.textSecondary }}
            >
              Fitur
            </a>
            <a
              href="#harga"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: COLORS.textSecondary }}
            >
              Harga
            </a>
            <a
              href="#testimoni"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: COLORS.textSecondary }}
            >
              Testimoni
            </a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: COLORS.text }}
            >
              Login
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: COLORS.primary }}
            >
              Mulai Gratis
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <a
            href="#fitur"
            className="block text-sm font-medium"
            style={{ color: COLORS.textSecondary }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Fitur
          </a>
          <a
            href="#harga"
            className="block text-sm font-medium"
            style={{ color: COLORS.textSecondary }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Harga
          </a>
          <a
            href="#testimoni"
            className="block text-sm font-medium"
            style={{ color: COLORS.textSecondary }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Testimoni
          </a>
          <Link
            href="/login"
            className="block text-sm font-medium"
            style={{ color: COLORS.text }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/login"
            className="block w-full text-center px-4 py-2 text-sm font-medium text-white rounded-xl"
            style={{ backgroundColor: COLORS.primary }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Mulai Gratis
          </Link>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              style={{ color: COLORS.text }}
            >
              Kelola Bisnis Lebih Cerdas dengan{' '}
              <span style={{ color: COLORS.primary }}>Kasirku</span>
            </h1>
            <p
              className="mt-6 text-lg md:text-xl"
              style={{ color: COLORS.textSecondary }}
            >
              Sistem POS all-in-one untuk mengelola kasir, inventaris, dan
              laporan dengan mudah. Cocok untuk bisnis retail dan kuliner.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white rounded-xl transition-all hover:opacity-90 shadow-lg"
                style={{ backgroundColor: COLORS.primary }}
              >
                Mulai Gratis
                <ArrowRight size={20} />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-xl transition-all border-2 hover:bg-gray-50"
                style={{
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                }}
              >
                Lihat Demo
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
              {['Gratis', 'Mudah', 'Aman'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: COLORS.lightBg }}
                  >
                    <Check size={12} style={{ color: COLORS.primary }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Dashboard Preview */}
          <div className="relative">
            <div className="relative mx-auto max-w-lg">
              {/* Laptop Frame */}
              <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl">
                <div className="bg-white rounded-xl overflow-hidden">
                  {/* Fake Dashboard Header */}
                  <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  {/* Dashboard Content Mockup */}
                  <div className="p-4 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-1/3 h-20 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <ShoppingCart size={32} style={{ color: COLORS.primary }} />
                      </div>
                      <div className="w-1/3 h-20 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Package size={32} color="#3B82F6" />
                      </div>
                      <div className="w-1/3 h-20 rounded-xl bg-purple-100 flex items-center justify-center">
                        <BarChart3 size={32} color="#8B5CF6" />
                      </div>
                    </div>
                    <div className="h-32 rounded-xl bg-gray-50 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">Dashboard Preview</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div
                className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg p-3 flex items-center gap-2"
                style={{ backgroundColor: COLORS.lightBg }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  <Check size={16} className="text-white" />
                </div>
                <span className="text-sm font-medium" style={{ color: COLORS.text }}>
                  Transaksi Berhasil
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: ShoppingCart,
    title: 'Kasir (POS)',
    description: 'Transaksi cepat & akurat dengan berbagai metode pembayaran.',
    color: '#059669',
  },
  {
    icon: Package,
    title: 'Inventaris',
    description: 'Stok real-time, auto restock, dan tracking mutasi barang.',
    color: '#3B82F6',
  },
  {
    icon: BarChart3,
    title: 'Laporan',
    description: 'Omzet, keuntungan, dan laporan lengkap secara real-time.',
    color: '#8B5CF6',
  },
  {
    icon: Store,
    title: 'Multi Outlet',
    description: 'Kelola beberapa cabang dari satu dashboard terpusat.',
    color: '#F59E0B',
  },
  {
    icon: Users,
    title: 'Karyawan',
    description: 'Role-based akses, PIN security, dan tracking kinerja.',
    color: '#EC4899',
  },
  {
    icon: Smartphone,
    title: 'PWA',
    description: 'Install di HP seperti app native, bisa offline mode.',
    color: '#14B8A6',
  },
];

function Features() {
  return (
    <section id="fitur" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: COLORS.text }}
          >
            Fitur Utama
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: COLORS.textSecondary }}
          >
            Semua yang kamu butuhkan untuk mengelola bisnis dalam satu aplikasi
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${feature.color}20` }}
              >
                <feature.icon size={24} style={{ color: feature.color }} />
              </div>
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: COLORS.text }}
              >
                {feature.title}
              </h3>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Daftar Akun',
      description: 'Buat akun gratis dalam 30 detik',
    },
    {
      number: '2',
      title: 'Tambah Produk',
      description: 'Input produk satu per satu atau import CSV',
    },
    {
      number: '3',
      title: 'Mulai Jualan',
      description: 'Langsung gunakan kasir digital',
    },
  ];

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: COLORS.text }}
          >
            Cara Kerja
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: COLORS.textSecondary }}
          >
            Mulai gunakan Kasirku dalam 3 langkah mudah
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Step Circle */}
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4"
                style={{ backgroundColor: COLORS.primary }}
              >
                {step.number}
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gray-200" />
              )}

              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: COLORS.text }}
              >
                {step.title}
              </h3>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const testimonials = [
    {
      name: 'Budi Santoso',
      role: 'Pemilik Soto Paket Mantap',
      text: 'Kasirku membantu saya mengelola 3 cabang dengan sangat mudah. Transaksi jadi cepat dan akurat!',
      rating: 5,
    },
    {
      name: 'Siti Rahayu',
      role: 'Manager Minimarket Jaya',
      text: 'Fitur inventory nya luar biasa! Tidak perlu lagi hitung stok manual, semua otomatis.',
      rating: 5,
    },
  ];

  return (
    <section id="testimoni" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: COLORS.text }}
          >
            Testimoni Pengguna
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: COLORS.textSecondary }}
          >
            Apa kata pengguna Kasirku?
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.name}
              className="p-6 rounded-2xl border border-gray-100"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className="fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="text-base mb-4" style={{ color: COLORS.text }}>
                &quot;{testimonial.text}&quot;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium" style={{ color: COLORS.text }}>
                    {testimonial.name}
                  </p>
                  <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const pricingPlans = [
  {
    name: 'Starter',
    price: 'Gratis',
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

function Pricing() {
  return (
    <section id="harga" className="py-16 md:py-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: COLORS.text }}
          >
            Paket Harga
          </h2>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: COLORS.textSecondary }}
          >
            Pilih paket yang sesuai dengan kebutuhan bisnis kamu
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-6 rounded-2xl border ${
                plan.popular
                  ? 'border-transparent shadow-xl'
                  : 'border-gray-200'
              }`}
              style={
                plan.popular
                  ? { backgroundColor: COLORS.primary }
                  : { backgroundColor: 'white' }
              }
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-white text-xs font-bold rounded-full">
                  POPULAR
                </div>
              )}

              <h3
                className="text-lg font-semibold"
                style={{ color: plan.popular ? 'white' : COLORS.text }}
              >
                {plan.name}
              </h3>
              <div className="mt-2 mb-1">
                <span
                  className="text-3xl font-bold"
                  style={{ color: plan.popular ? 'white' : COLORS.text }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span
                    className="text-sm"
                    style={{ color: plan.popular ? 'white' : COLORS.textSecondary }}
                  >
                    {plan.period}
                  </span>
                )}
              </div>
              <p
                className="text-sm mb-4"
                style={{ color: plan.popular ? 'white' : COLORS.textSecondary }}
              >
                {plan.description}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: plan.popular ? 'white' : COLORS.text }}
                  >
                    <Check
                      size={16}
                      style={{
                        color: plan.popular ? 'white' : COLORS.primary,
                      }}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`block w-full py-3 text-center font-medium rounded-xl transition-all ${
                  plan.popular
                    ? 'bg-white text-emerald-700 hover:bg-gray-100'
                    : 'text-white hover:opacity-90'
                }`}
                style={
                  plan.popular
                    ? {}
                    : { backgroundColor: COLORS.primary }
                }
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-16 md:py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2
          className="text-3xl md:text-4xl font-bold"
          style={{ color: COLORS.text }}
        >
          Siap tingkatkan bisnis Anda?
        </h2>
        <p
          className="mt-4 text-lg"
          style={{ color: COLORS.textSecondary }}
        >
          Mulai gunakan Kasirku gratis sekarang juga
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white rounded-xl transition-all hover:opacity-90 shadow-lg"
            style={{ backgroundColor: COLORS.primary }}
          >
            Mulai Gratis Sekarang
            <ArrowRight size={24} />
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-sm" style={{ color: COLORS.textSecondary }}>
          <span>✓ Tanpa kartu kredit</span>
          <span>✓ Setup 30 detik</span>
          <span>✓ Cancel anytime</span>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: COLORS.primary }}
              >
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-xl">Kasirku</span>
            </div>
            <p className="text-gray-400 text-sm">
              Sistem POS all-in-one untuk bisnis Indonesia
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produk</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#fitur" className="hover:text-white">Fitur</a></li>
              <li><a href="#harga" className="hover:text-white">Harga</a></li>
              <li><a href="#" className="hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Tentang</a></li>
              <li><a href="#" className="hover:text-white">Kontak</a></li>
              <li><a href="#" className="hover:text-white">Karir</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white">Privacy</a></li>
              <li><a href="#" className="hover:text-white">Terms</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
          © 2024 Kasirku. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

// Default export for route
export default LandingPage;
