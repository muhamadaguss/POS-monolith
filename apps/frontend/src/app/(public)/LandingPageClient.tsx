'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ShoppingCart, Package, BarChart3,
  TrendingUp, Shield, Clock, Zap,
} from './hero-icons';
import {
  COLORS, RevealSection, AnimatedCounter,
} from './landing-shared';
import { ArrowRight, Check, ChevronDown, Menu, X } from './icons';

// ⬇️ Lazy-load below-fold sections (Features → Footer)
const LandingSections = dynamic(() => import('./LandingSections'), {
  loading: () => null,
});

// ─────────────────────────────────────────────────────────────
// Loading Skeleton (SSR fallback)
// ─────────────────────────────────────────────────────────────
export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-emerald-100 animate-pulse" /><div className="w-20 h-5 bg-gray-200 rounded animate-pulse" /></div>
            <div className="hidden md:flex items-center gap-8">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="w-12 h-4 bg-gray-200 rounded animate-pulse" />)}</div>
            <div className="hidden md:flex items-center gap-3"><div className="w-14 h-8 bg-gray-200 rounded-lg animate-pulse" /><div className="w-24 h-8 bg-emerald-200 rounded-xl animate-pulse" /></div>
          </div>
        </div>
      </div>
      <div className="pt-32 pb-24 bg-gradient-to-br from-amber-50 via-white to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="w-48 h-8 bg-emerald-100 rounded-full animate-pulse" />
              <div className="space-y-3"><div className="w-full h-12 bg-gray-200 rounded-lg animate-pulse" /><div className="w-3/4 h-12 bg-gray-200 rounded-lg animate-pulse" /></div>
              <div className="w-full h-6 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-4"><div className="w-36 h-12 bg-emerald-200 rounded-xl animate-pulse" /><div className="w-32 h-12 bg-gray-200 rounded-xl animate-pulse" /></div>
            </div>
            <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
      <div className="text-center py-8"><p className="text-emerald-600 font-medium animate-pulse">Memuat halaman...</p></div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────
function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const NAV_ITEMS = [
    { label: 'Beranda', href: '/' },
    { label: 'Fitur', href: '/fitur' },
    { label: 'Harga', href: '/harga' },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-100' : 'bg-white/90 backdrop-blur-md border-b border-gray-100/50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex-1 flex justify-start">
            <Link href="/" className="flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg" style={{ backgroundColor: COLORS.primary }}>
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <span className="font-bold text-xl transition-colors" style={{ color: COLORS.text }}>Kasirku</span>
            </Link>
          </div>
          <div className="hidden md:flex flex-1 justify-center">
            <nav className="flex items-center gap-8">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} className="text-sm font-medium transition-all duration-200 hover:-translate-y-0.5" style={{ color: isActive(item.href) ? COLORS.primary : COLORS.textSecondary }}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1 flex justify-end items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: COLORS.text }}>Login</Link>
              <Link href="/register" className="px-4 py-2 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:opacity-90 hover:shadow-lg hover:-translate-y-0.5 active:scale-95" style={{ backgroundColor: COLORS.primary }}>Mulai Gratis</Link>
            </div>
            <button className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors relative z-50" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setMobileMenuOpen(false)} />
      )}
      <div className={`md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 py-6 transition-all duration-300 ${mobileMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        <div className="space-y-4">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="block text-sm font-medium w-full text-left py-2 hover:bg-gray-50 rounded-lg px-3 transition-colors" style={{ color: COLORS.textSecondary }} onClick={() => setMobileMenuOpen(false)}>
              {item.label}
            </Link>
          ))}
          <hr className="border-gray-100" />
          <Link href="/login" className="block text-sm font-medium py-2 px-3" style={{ color: COLORS.text }} onClick={() => setMobileMenuOpen(false)}>Login</Link>
          <Link href="/register" className="block w-full text-center px-4 py-3 text-sm font-medium text-white rounded-xl transition-all duration-300 hover:shadow-lg active:scale-95" style={{ backgroundColor: COLORS.primary }} onClick={() => setMobileMenuOpen(false)}>Mulai Gratis</Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────
function Hero() {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(true); }, []);

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
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden" style={{ background: `linear-gradient(160deg, ${COLORS.warmBg} 0%, #FFFAF2 30%, #F0FDF4 60%, #ECFDF5 80%, ${COLORS.warmBg} 100%)` }}>
      {/* Composited gradient shift overlay (GPU) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `linear-gradient(90deg, transparent, ${COLORS.primary}00, ${COLORS.primary}15, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'gradient-shift 15s ease-in-out infinite',
        }}
      />
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, ${COLORS.primary} 1px, transparent 0)`, backgroundSize: '40px 40px' }} />
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] rounded-full opacity-[0.06] blur-3xl pointer-events-none" style={{ backgroundColor: COLORS.primary }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04] blur-3xl pointer-events-none" style={{ backgroundColor: '#10B981' }} />
      {particles.map((p, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none" style={{ width: `${p.size}px`, height: `${p.size}px`, backgroundColor: COLORS.primary, opacity: p.opacity, top: p.top, left: p.left, animation: `float ${p.duration} ease-in-out infinite`, animationDelay: p.delay, boxShadow: `0 0 ${p.size * 2}px ${p.size}px ${COLORS.primary}22` }} />
      ))}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className={`text-center lg:text-left transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 transition-all duration-300 hover:scale-105 cursor-default" style={{ backgroundColor: COLORS.lightBg }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: COLORS.primary }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: COLORS.primary }} />
              </span>
              <span className="text-sm font-medium" style={{ color: COLORS.primary }}>Baru: Fitur Multi-Outlet kini tersedia!</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight" style={{ color: COLORS.text }}>
              Kelola Bisnis Lebih{' '}
              <span className="relative inline-block" style={{ color: COLORS.primary }}>
                Cerdas
                <span className="absolute -bottom-1 left-0 w-full h-1 rounded-full" style={{ backgroundColor: COLORS.primary, opacity: 0.3 }} />
              </span>{' '}dengan Kasirku
            </h1>
            <p className="mt-6 text-lg md:text-xl leading-relaxed" style={{ color: COLORS.textSecondary }}>
              Sistem POS all-in-one untuk mengelola kasir, inventaris, dan laporan dengan mudah. <strong>Cocok untuk bisnis retail dan kuliner.</strong>
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/register" className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95" style={{ backgroundColor: COLORS.primary }}>
                Mulai Gratis <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <button onClick={() => document.getElementById('fitur')?.scrollIntoView({ behavior: 'smooth' })} className="group inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium rounded-xl transition-all duration-300 border-2 hover:bg-white/50 active:scale-95" style={{ borderColor: COLORS.primary, color: COLORS.primary }}>
                <span>Lihat Demo</span>
                <ChevronDown size={20} className="transition-transform group-hover:translate-y-1 animate-bounce" />
              </button>
            </div>
            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start flex-wrap">
              {[{ icon: Shield, text: 'Aman' }, { icon: Zap, text: 'Cepat' }, { icon: Clock, text: '24/7' }].map((item) => (
                <div key={item.text} className="flex items-center gap-2 group cursor-default">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md" style={{ backgroundColor: COLORS.lightBg }}>
                    <item.icon size={16} style={{ color: COLORS.primary }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: COLORS.primary }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="relative mx-auto max-w-lg">
              <div className={`absolute -top-6 -left-6 md:-left-12 bg-white rounded-2xl shadow-xl p-4 z-10 transition-all duration-700 hover:scale-105 hover:shadow-2xl ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`} style={{ transitionDelay: '300ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: COLORS.lightBg }}><TrendingUp size={20} style={{ color: COLORS.primary }} /></div>
                  <div><p className="text-xs" style={{ color: COLORS.textSecondary }}>Omzet Bulan Ini</p><p className="font-bold" style={{ color: COLORS.text }}>Rp 12.5jt</p></div>
                </div>
              </div>
              <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-700 hover:shadow-3xl hover:-translate-y-2 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '200ms' }}>
                <div className="bg-gradient-to-r px-4 py-3 flex items-center justify-between" style={{ backgroundColor: COLORS.primary }}>
                  <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center"><ShoppingCart size={14} className="text-white" /></div><span className="text-white font-semibold text-sm">Kasirku Dashboard</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" /></div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    {[{ label: 'Kasir', icon: ShoppingCart, color: COLORS.primary, value: '127' }, { label: 'Produk', icon: Package, color: '#3B82F6', value: '89' }, { label: 'Laporan', icon: BarChart3, color: '#8B5CF6', value: '45' }].map((item) => (
                      <div key={item.label} className="rounded-xl p-3 flex flex-col items-center transition-all duration-300 hover:scale-105 hover:shadow-md cursor-pointer" style={{ backgroundColor: `${item.color}15` }}>
                        <item.icon size={24} style={{ color: item.color }} />
                        <p className="text-lg font-bold mt-1" style={{ color: COLORS.text }}>{item.value}</p>
                        <p className="text-xs" style={{ color: COLORS.textSecondary }}>{item.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-24 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 flex items-center justify-center border-2 border-dashed transition-all duration-300 hover:shadow-inner cursor-pointer" style={{ borderColor: `${COLORS.primary}30` }}>
                    <div className="text-center"><p className="text-sm font-medium" style={{ color: COLORS.primary }}>📊 Real-time Analytics</p><p className="text-xs" style={{ color: COLORS.textSecondary }}>Transaksi terakhir: 2 menit lalu</p></div>
                  </div>
                </div>
              </div>
              <div className={`absolute -bottom-4 -right-4 md:-right-8 bg-white rounded-xl shadow-xl p-3 z-10 transition-all duration-700 hover:scale-105 hover:shadow-2xl ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '500ms' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: COLORS.primary }}><Check size={20} className="text-white" /></div>
                  <div><p className="text-sm font-semibold" style={{ color: COLORS.text }}>Transaksi Berhasil!</p><p className="text-xs" style={{ color: COLORS.textSecondary }}>Rp 125.000</p></div>
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
// Stats
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 py-16">
        {stats.map((stat, i) => (
          <RevealSection key={stat.label} delay={i * 100}>
            <div className="relative group bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-100/80 p-6 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200">
              <div className="absolute top-0 left-4 right-4 h-1 rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-500" />
              <div className="text-3xl md:text-4xl font-bold mb-1 transition-all duration-300 group-hover:scale-110" style={{ color: COLORS.primary }}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} isDecimal={stat.isDecimal} />
              </div>
              <p className="text-sm" style={{ color: COLORS.textSecondary }}>{stat.label}</p>
            </div>
          </RevealSection>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <Hero />
      <Stats />
      <LandingSections />
    </main>
  );
}

export default LandingPage;
