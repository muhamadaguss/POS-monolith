'use client';

import { useState, useEffect, useRef } from 'react';
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
  TrendingUp,
  Shield,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Color Palette (from design reference)
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryAccent: '#065F46',
  lightBg: '#ECFDF5',
  warmBg: '#FFFBF5',
  text: '#1F2937',
  textSecondary: '#6B7280',
};

// ─────────────────────────────────────────────────────────────
// Custom Hook: useScrollReveal
// ─────────────────────────────────────────────────────────────
function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

// ─────────────────────────────────────────────────────────────
// Custom Hook: useCountUp
// ─────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startTime: number;
    let animationId: number;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic for smoother animation
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationId = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };
    animationId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationId);
  }, [target, duration, start]);

  return count;
}

// ─────────────────────────────────────────────────────────────
// Animated Counter Component
// ─────────────────────────────────────────────────────────────
function AnimatedCounter({ value, suffix = '', prefix = '', isDecimal = false }: { value: number; suffix?: string; prefix?: string; isDecimal?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const intTarget = isDecimal ? value * 10 : value;
  const count = useCountUp(intTarget, 2200, isVisible);

  const displayValue = isDecimal
    ? (count / 10).toFixed(1)
    : count.toLocaleString('id-ID');

  return (
    <div ref={containerRef} className="inline-block">
      {prefix}{displayValue}{suffix}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scroll Reveal Wrapper
// ─────────────────────────────────────────────────────────────
function RevealSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.1);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Badge
// ─────────────────────────────────────────────────────────────
function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-block px-4 py-1 rounded-full text-sm font-medium mb-4"
      style={{ backgroundColor: COLORS.lightBg, color: COLORS.primary }}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Section Title
// ─────────────────────────────────────────────────────────────
function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2
        className="text-3xl md:text-4xl font-bold"
        style={{ color: COLORS.text }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="mt-4 text-lg max-w-2xl mx-auto"
          style={{ color: COLORS.textSecondary }}
        >
          {subtitle}
        </p>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// Header Component
// ─────────────────────────────────────────────────────────────
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const navItems = [
    { id: 'fitur', label: 'Fitur' },
    { id: 'harga', label: 'Harga' },
    { id: 'testimoni', label: 'Testimoni' },
    { id: 'faq', label: 'FAQ' },
  ];

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100'
          : 'bg-white/90 backdrop-blur-md border-b border-gray-100/50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
              style={{ backgroundColor: COLORS.primary }}
            >
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span className="font-bold text-xl transition-colors" style={{ color: COLORS.text }}>
              Kasirku
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="text-sm font-medium hover:opacity-80 transition-all duration-200 hover:-translate-y-0.5"
                style={{ color: COLORS.textSecondary }}
              >
                {item.label}
              </button>
            ))}
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
              className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
              style={{ backgroundColor: COLORS.primary }}
            >
              Mulai Gratis
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors relative z-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-6 transition-all duration-300 ${
          mobileMenuOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        }`}
      >
        <div className="space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="block text-sm font-medium w-full text-left py-2 hover:bg-gray-50 rounded-lg px-3 transition-colors"
              style={{ color: COLORS.textSecondary }}
            >
              {item.label}
            </button>
          ))}
          <hr className="border-gray-100" />
          <Link
            href="/login"
            className="block text-sm font-medium py-2 px-3"
            style={{ color: COLORS.text }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Login
          </Link>
          <Link
            href="/login"
            className="block w-full text-center px-4 py-3 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95"
            style={{ backgroundColor: COLORS.primary }}
            onClick={() => setMobileMenuOpen(false)}
          >
            Mulai Gratis
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Stable seeded particles (no hydration mismatch)
  const particles = [
    { top: '12%', left: '8%', size: 6, opacity: 0.12, delay: '0.5s', duration: '5.5s' },
    { top: '25%', left: '75%', size: 8, opacity: 0.08, delay: '2s', duration: '7s' },
    { top: '45%', left: '20%', size: 5, opacity: 0.15, delay: '1s', duration: '6s' },
    { top: '60%', left: '90%', size: 7, opacity: 0.10, delay: '0.8s', duration: '5s' },
    { top: '70%', left: '35%', size: 4, opacity: 0.18, delay: '1.5s', duration: '6.5s' },
    { top: '15%', left: '55%', size: 9, opacity: 0.07, delay: '2.5s', duration: '7.5s' },
    { top: '82%', left: '15%', size: 5, opacity: 0.14, delay: '0.3s', duration: '5.8s' },
    { top: '38%', left: '65%', size: 6, opacity: 0.11, delay: '1.8s', duration: '6.2s' },
  ];

  return (
    <section
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${COLORS.warmBg} 0%, #FFFAF2 30%, #F0FDF4 60%, #ECFDF5 80%, ${COLORS.warmBg} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'gradient-shift 15s ease infinite',
      }}
    >
      {/* Floating Particles - stable positions, no hydration mismatch */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: COLORS.primary,
            opacity: p.opacity,
            top: p.top,
            left: p.left,
            animation: `float ${p.duration} ease-in-out infinite`,
            animationDelay: p.delay,
          }}
        />
      ))}
      {/* Floating decorative circles */}
      <div
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.07]"
        style={{ backgroundColor: COLORS.primary }}
      />
      <div
        className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-[0.07]"
        style={{ backgroundColor: COLORS.primary }}
      />
      <div
        className="absolute top-1/3 -left-10 w-32 h-32 rounded-full opacity-[0.05]"
        style={{ backgroundColor: COLORS.primary }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div
            className={`text-center lg:text-left transition-all duration-1000 ${
              loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 transition-all duration-300 hover:scale-105 cursor-default"
              style={{ backgroundColor: COLORS.lightBg }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: COLORS.primary }}
                />
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ backgroundColor: COLORS.primary }}
                />
              </span>
              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>
                Baru: Fitur Multi-Outlet kini tersedia!
              </span>
            </div>

            <h1
              className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight"
              style={{ color: COLORS.text }}
            >
              Kelola Bisnis Lebih{' '}
              <span
                className="relative inline-block"
                style={{ color: COLORS.primary }}
              >
                Cerdas
                <span
                  className="absolute -bottom-1 left-0 w-full h-1 rounded-full"
                  style={{ backgroundColor: COLORS.primary, opacity: 0.3 }}
                />
              </span>{' '}
              dengan Kasirku
            </h1>
            <p
              className="mt-6 text-lg md:text-xl leading-relaxed"
              style={{ color: COLORS.textSecondary }}
            >
              Sistem POS all-in-one untuk mengelola kasir, inventaris, dan
              laporan dengan mudah. <strong>Cocok untuk bisnis retail dan kuliner.</strong>
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95"
                style={{ backgroundColor: COLORS.primary }}
              >
                Mulai Gratis
                <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={scrollToFeatures}
                className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-xl transition-all duration-300 border-2 hover:bg-white/50 active:scale-95"
                style={{ borderColor: COLORS.primary, color: COLORS.primary }}
              >
                <span>Lihat Demo</span>
                <ChevronDown size={20} className="transition-transform group-hover:translate-y-1 animate-bounce" />
              </button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start flex-wrap">
              {[
                { icon: Shield, text: 'Aman' },
                { icon: Zap, text: 'Cepat' },
                { icon: Clock, text: '24/7' },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-2 group cursor-default">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
                    style={{ backgroundColor: COLORS.lightBg }}
                  >
                    <item.icon size={16} style={{ color: COLORS.primary }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: COLORS.textSecondary }}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Dashboard Preview */}
          <div className="relative">
            <div className="relative mx-auto max-w-lg">
              {/* Floating Stats Badge */}
              <div
                className={`absolute -top-6 -left-6 md:-left-12 bg-white rounded-2xl shadow-xl p-4 z-10 transition-all duration-700 hover:scale-105 hover:shadow-2xl ${
                  loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: COLORS.lightBg }}
                  >
                    <TrendingUp size={20} style={{ color: COLORS.primary }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>Omzet Bulan Ini</p>
                    <p className="font-bold" style={{ color: COLORS.text }}>Rp 12.5jt</p>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Card */}
              <div
                className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 hover:shadow-3xl hover:-translate-y-2 ${
                  loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '200ms' }}
              >
                {/* Dashboard Header */}
                <div className="bg-gradient-to-r px-4 py-3 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                      <ShoppingCart size={14} className="text-white" />
                    </div>
                    <span className="text-white font-semibold text-sm">Kasirku Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Kasir', icon: ShoppingCart, color: COLORS.primary, value: '127' },
                      { label: 'Produk', icon: Package, color: '#3B82F6', value: '89' },
                      { label: 'Laporan', icon: BarChart3, color: '#8B5CF6', value: '45' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl p-3 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-md cursor-pointer"
                        style={{ backgroundColor: `${item.color}15` }}
                      >
                        <item.icon size={24} style={{ color: item.color }} />
                        <p className="text-lg font-bold mt-1" style={{ color: COLORS.text }}>{item.value}</p>
                        <p className="text-xs" style={{ color: COLORS.textSecondary }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="h-24 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 flex items-center justify-center border-2 border-dashed transition-all duration-300 hover:shadow-inner cursor-pointer"
                    style={{ borderColor: `${COLORS.primary}30` }}
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium" style={{ color: COLORS.primary }}>📊 Real-time Analytics</p>
                      <p className="text-xs" style={{ color: COLORS.textSecondary }}>Transaksi terakhir: 2 menit lalu</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Success Badge */}
              <div
                className={`absolute -bottom-4 -right-4 md:-right-8 bg-white rounded-xl shadow-xl p-3 z-10 transition-all duration-700 hover:scale-105 hover:shadow-2xl ${
                  loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: '500ms' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    <Check size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: COLORS.text }}>Transaksi Berhasil!</p>
                    <p className="text-xs" style={{ color: COLORS.textSecondary }}>Rp 125.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Stats Section
// ─────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: 500, suffix: '+', label: 'Bisnis Aktif' },
    { value: 50000, suffix: '+', label: 'Transaksi/Hari' },
    { value: 99, suffix: '%', label: 'Uptime' },
    { value: 4.9, suffix: '/5', label: 'Rating', isDecimal: true },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-12">
        {stats.map((stat, i) => (
          <RevealSection key={stat.label} delay={i * 100}>
            <div className="text-center group">
              <div
                className="text-3xl md:text-4xl font-bold mb-1 transition-all duration-300 group-hover:scale-110"
                style={{ color: COLORS.primary }}
              >
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  isDecimal={stat.isDecimal}
                />
              </div>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                {stat.label}
              </p>
            </div>
          </RevealSection>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Features Section
// ─────────────────────────────────────────────────────────────
const features = [
  {
    icon: ShoppingCart,
    title: 'Kasir (POS)',
    description: 'Transaksi cepat & akurat dengan berbagai metode pembayaran.',
    color: '#059669',
    tag: 'Terpopuler',
  },
  {
    icon: Package,
    title: 'Inventaris',
    description: 'Stok real-time, auto restock, dan tracking mutasi barang.',
    color: '#3B82F6',
    tag: 'Otomatisasi',
  },
  {
    icon: BarChart3,
    title: 'Laporan',
    description: 'Omzet, keuntungan, dan laporan lengkap secara real-time.',
    color: '#8B5CF6',
    tag: 'Analitik',
  },
  {
    icon: Store,
    title: 'Multi Outlet',
    description: 'Kelola beberapa cabang dari satu dashboard terpusat.',
    color: '#F59E0B',
    tag: 'Skalabilitas',
  },
  {
    icon: Users,
    title: 'Karyawan',
    description: 'Role-based akses, PIN security, dan tracking kinerja.',
    color: '#EC4899',
    tag: 'Keamanan',
  },
  {
    icon: Smartphone,
    title: 'PWA Mobile',
    description: 'Install di HP seperti app native, bisa offline mode.',
    color: '#14B8A6',
    tag: 'Modern',
  },
];

function Features() {
  return (
    <section id="fitur" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>Fitur Unggulan</SectionBadge>
            <SectionTitle
              title="Semua yang Kamu Butuhkan"
              subtitle="Fitur lengkap untuk mengelola bisnis dalam satu aplikasi"
            />
          </div>
        </RevealSection>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <RevealSection key={feature.title} delay={index * 100}>
              <div className="group relative p-6 rounded-2xl border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-emerald-200 cursor-pointer bg-white">
                {/* Tag */}
                {feature.tag && (
                  <span
                    className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${feature.color}15`, color: feature.color }}
                  >
                    {feature.tag}
                  </span>
                )}

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon size={28} style={{ color: feature.color }} />
                </div>

                {/* Content */}
                <h3
                  className="text-lg font-semibold mb-2 transition-colors group-hover:text-emerald-700"
                  style={{ color: COLORS.text }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
                  {feature.description}
                </p>

                {/* Hover Arrow */}
                <div
                  className="mt-4 flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-3"
                  style={{ color: feature.color }}
                >
                  <span>Pelajari</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// How It Works Section
// ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { number: '1', title: 'Daftar Akun', description: 'Buat akun gratis dalam 30 detik', icon: '🚀' },
    { number: '2', title: 'Tambah Produk', description: 'Input produk satu per satu atau import CSV', icon: '📦' },
    { number: '3', title: 'Mulai Jualan', description: 'Langsung gunakan kasir digital', icon: '💰' },
  ];

  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>3 Langkah Mudah</SectionBadge>
            <SectionTitle
              title="Cara Kerja"
              subtitle="Mulai gunakan Kasirku dalam hitungan menit"
            />
          </div>
        </RevealSection>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <RevealSection key={step.number} delay={index * 150}>
              <div className="relative text-center group">
                {/* Step Circle */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {step.icon}
                </div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-1">
                    <div className="h-full bg-gradient-to-r from-emerald-200 to-emerald-100 rounded-full" />
                  </div>
                )}

                <h3
                  className="text-xl font-semibold mb-2 transition-colors group-hover:text-emerald-700"
                  style={{ color: COLORS.text }}
                >
                  {step.title}
                </h3>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {step.description}
                </p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Testimonials Section
// ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      name: 'Budi Santoso',
      role: 'Pemilik Soto Paket Mantap — 3 Cabang',
      text: 'Kasirku membantu saya mengelola 3 cabang dengan sangat mudah. Transaksi jadi cepat dan akurat! Sekarang omzet naik 40% dalam 3 bulan.',
      rating: 5,
      avatar: 'BS',
    },
    {
      name: 'Siti Rahayu',
      role: 'Manager Minimarket Jaya — 2 Cabang',
      text: 'Fitur inventory nya luar biasa! Tidak perlu lagi hitung stok manual, semua otomatis. Waktu operasional karyawan jadi lebih efisien.',
      rating: 5,
      avatar: 'SR',
    },
    {
      name: 'Ahmad Wijaya',
      role: 'Owner Kedai Kopi Nusantara',
      text: 'Dashboard yang clean dan easy to use. Karyawan baru bisa langsung pakai dalam 5 menit. Fitur laporan harian sangat membantu!',
      rating: 5,
      avatar: 'AW',
    },
    {
      name: 'Dewi Lestari',
      role: 'Supervisor Bakery Fresh — 4 Cabang',
      text: 'Laporan real-time sangat membantu saya monitor penjualan setiap jam. Sekarang saya bisa ambil keputusan bisnis lebih cepat!',
      rating: 5,
      avatar: 'DL',
    },
  ];

  return (
    <section id="testimoni" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>Testimoni</SectionBadge>
            <SectionTitle
              title="Apa Kata Pengguna?"
              subtitle="Lebih dari 500 bisnis telah menggunakan Kasirku"
            />
          </div>
        </RevealSection>

        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((testimonial, index) => (
            <RevealSection key={testimonial.name} delay={index * 100}>
              <div className="p-6 rounded-2xl border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 bg-white">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={20}
                      className="fill-amber-400 text-amber-400 transition-transform duration-300 hover:scale-110"
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-base mb-4 leading-relaxed italic" style={{ color: COLORS.text }}>
                  &quot;{testimonial.text}&quot;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold transition-transform duration-300 hover:scale-110 hover:shadow-lg"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: COLORS.text }}>
                      {testimonial.name}
                    </p>
                    <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Pricing Section
// ─────────────────────────────────────────────────────────────
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
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>Paket Harga</SectionBadge>
            <SectionTitle
              title="Pilih Paket yang Sesuai"
              subtitle="Mulai gratis, upgrade kapan saja"
            />
          </div>
        </RevealSection>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <RevealSection key={plan.name} delay={index * 100}>
              <div
                className={`relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
                  plan.popular
                    ? 'bg-white shadow-xl border-2 border-emerald-500 scale-105 md:scale-110'
                    : 'bg-white border border-gray-200 hover:shadow-xl hover:border-emerald-200'
                }`}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">
                    ⭐ PALING POPULER
                  </div>
                )}

                {/* Plan Name */}
                <h3 className="text-lg font-semibold" style={{ color: COLORS.text }}>
                  {plan.name}
                </h3>

                {/* Price */}
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

                {/* Features */}
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

                {/* CTA Button */}
                <Link
                  href="/login"
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
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// FAQ Section
// ─────────────────────────────────────────────────────────────
const faqItems = [
  {
    question: 'Apakah Kasirku gratis?',
    answer: 'Ya! Paket Starter kami gratis selamanya untuk 1 outlet dan 3 karyawan. Anda bisa upgrade kapan saja sesuai kebutuhan bisnis.',
  },
  {
    question: 'Apakah bisa dipakai di HP?',
    answer: 'Tentu! Kasirku adalah Progressive Web App (PWA) yang bisa diinstall di layar utama HP Android & iOS seperti aplikasi native. Bisa digunakan offline juga!',
  },
  {
    question: 'Bagaimana cara mulai menggunakan Kasirku?',
    answer: 'Cukup daftar akun gratis, tambahkan produk, dan langsung bisa mulai transaksi. Proses setup hanya butuh waktu kurang dari 5 menit.',
  },
  {
    question: 'Apakah data saya aman?',
    answer: 'Keamanan adalah prioritas kami. Semua data dienkripsi, server kami menggunakan sertifikat SSL, dan ada backup otomatis setiap hari.',
  },
  {
    question: 'Bisakah mengelola beberapa cabang?',
    answer: 'Bisa! Paket Growth dan Enterprise mendukung multi-outlet. Anda bisa monitor semua cabang dari satu dashboard dengan data real-time.',
  },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>FAQ</SectionBadge>
            <SectionTitle
              title="Pertanyaan Umum"
              subtitle="Temukan jawaban untuk pertanyaan yang sering diajukan"
            />
          </div>
        </RevealSection>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <RevealSection key={index} delay={index * 80}>
              <div
                className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-200"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50/50"
                >
                  <span
                    className="text-base font-semibold pr-4"
                    style={{ color: COLORS.text }}
                  >
                    {item.question}
                  </span>
                  <ChevronRight
                    size={20}
                    className={`transition-all duration-300 flex-shrink-0 ${
                      openIndex === index ? 'rotate-90' : ''
                    }`}
                    style={{ color: COLORS.primary }}
                  />
                </button>
                <div
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: openIndex === index ? '300px' : '0px',
                    opacity: openIndex === index ? 1 : 0,
                  }}
                >
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>

        <RevealSection>
          <div className="text-center mt-8">
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              Masih punya pertanyaan?{' '}
              <a
                href="mailto:support@kasirku.id"
                className="font-medium underline hover:no-underline transition-colors"
                style={{ color: COLORS.primary }}
              >
                Hubungi tim support kami
              </a>
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA Section
// ─────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-16 md:py-24 overflow-hidden relative" style={{ backgroundColor: COLORS.warmBg }}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 translate-x-1/2 -translate-y-1/2"
          style={{ backgroundColor: COLORS.primary }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 -translate-x-1/2 translate-y-1/2"
          style={{ backgroundColor: COLORS.primary }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <RevealSection>
          <div className="relative inline-block mb-6">
            <span className="text-6xl">🚀</span>
            <div
              className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping"
              style={{ backgroundColor: COLORS.primary }}
            />
          </div>

          <h2
            className="text-3xl md:text-4xl font-bold"
            style={{ color: COLORS.text }}
          >
            Siap Tingkatkan Bisnis Anda?
          </h2>
          <p
            className="mt-4 text-lg"
            style={{ color: COLORS.textSecondary }}
          >
            Bergabung dengan 500+ bisnis yang sudah menggunakan Kasirku
          </p>

          {/* CTA Button */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95"
              style={{ backgroundColor: COLORS.primary }}
            >
              Mulai Gratis Sekarang
              <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 flex items-center justify-center gap-6 text-sm flex-wrap" style={{ color: COLORS.textSecondary }}>
            <span className="flex items-center gap-2">
              <Check size={16} style={{ color: COLORS.primary }} />
              Tanpa kartu kredit
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} style={{ color: COLORS.primary }} />
              Setup 30 detik
            </span>
            <span className="flex items-center gap-2">
              <Check size={16} style={{ color: COLORS.primary }} />
              Cancel anytime
            </span>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────────────────────
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
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Sistem POS all-in-one untuk UMKM Indonesia. Kelola bisnis lebih cerdas dengan Kasirku.
            </p>
            <div className="flex items-center gap-3">
              {['Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-emerald-600 transition-all duration-300 hover:scale-110"
                  aria-label={social}
                >
                  <span className="text-xs font-medium">{social[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Produk</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <button onClick={() => document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-white transition-colors">
                  Fitur
                </button>
              </li>
              <li>
                <button onClick={() => document.getElementById('harga')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-white transition-colors">
                  Harga
                </button>
              </li>
              <li>
                <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
                  className="hover:text-white transition-colors">
                  FAQ
                </button>
              </li>
              <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Perusahaan</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Tentang</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kontak</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Kontak</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <Mail size="14" />
                <a href="mailto:support@kasirku.id" className="hover:text-white transition-colors">
                  support@kasirku.id
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size="14" />
                <span>021-1234-5678</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin size="14" />
                <span>Jakarta, Indonesia</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">
            © 2024 Kasirku. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────
export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 animate-pulse" />
              <div className="w-20 h-5 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-14 h-8 bg-gray-200 rounded-lg animate-pulse" />
              <div className="w-24 h-8 bg-emerald-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="pt-32 pb-24 bg-gradient-to-br from-amber-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-48 h-8 bg-emerald-100 rounded-full animate-pulse" />
              <div className="space-y-3">
                <div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" />
                <div className="w-3/4 h-12 bg-gray-200 rounded-lg animate-pulse" />
              </div>
              <div className="w-full h-6 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-4">
                <div className="w-36 h-12 bg-emerald-200 rounded-xl animate-pulse" />
                <div className="w-32 h-12 bg-gray-200 rounded-xl animate-pulse" />
              </div>
            </div>
            <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-center py-8">
        <p className="text-emerald-600 font-medium animate-pulse">Memuat halaman...</p>
      </div>
    </div>
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
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

export default LandingPage;
