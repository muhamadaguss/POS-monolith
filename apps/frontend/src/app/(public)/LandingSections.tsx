// ─────────────────────────────────────────────────────────────
// Below-fold sections — loaded lazily via next/dynamic
// ─────────────────────────────────────────────────────────────
'use client';

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
  ChevronDown,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import { COLORS, RevealSection, SectionBadge, SectionTitle, AnimatedCounter } from './landing-shared';

// ── Features Data ──
const features = [
  { icon: ShoppingCart, title: 'Kasir (POS)', description: 'Transaksi cepat & akurat dengan berbagai metode pembayaran.', color: '#059669', tag: 'Terpopuler' },
  { icon: Package, title: 'Inventaris', description: 'Stok real-time, auto restock, dan tracking mutasi barang.', color: '#3B82F6', tag: 'Otomatisasi' },
  { icon: BarChart3, title: 'Laporan', description: 'Omzet, keuntungan, dan laporan lengkap secara real-time.', color: '#8B5CF6', tag: 'Analitik' },
  { icon: Store, title: 'Multi Outlet', description: 'Kelola beberapa cabang dari satu dashboard terpusat.', color: '#F59E0B', tag: 'Skalabilitas' },
  { icon: Users, title: 'Karyawan', description: 'Role-based akses, PIN security, dan tracking kinerja.', color: '#EC4899', tag: 'Keamanan' },
  { icon: Smartphone, title: 'PWA Mobile', description: 'Install di HP seperti app native, bisa offline mode.', color: '#14B8A6', tag: 'Modern' },
];

function Features() {
  return (
    <section id="fitur" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <h2 className="sr-only">Fitur Unggulan</h2>
            <SectionBadge>Fitur Unggulan</SectionBadge>
            <SectionTitle title="Semua yang Kamu Butuhkan" subtitle="Fitur lengkap untuk mengelola bisnis dalam satu aplikasi" />
          </div>
        </RevealSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <RevealSection key={feature.title} delay={index * 100}>
              <div className="group relative p-6 rounded-2xl border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 bg-white cursor-pointer overflow-hidden">
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: `linear-gradient(135deg, ${COLORS.primary}08, transparent 50%)` }} />
                <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                {feature.tag && (
                  <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full transition-all duration-300 group-hover:scale-110" style={{ backgroundColor: `${feature.color}15`, color: feature.color }}>
                    {feature.tag}
                  </span>
                )}
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg relative" style={{ backgroundColor: `${feature.color}15` }}>
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: `0 0 20px ${feature.color}40` }} />
                  <feature.icon size={28} style={{ color: feature.color, position: 'relative', zIndex: 1 }} />
                </div>
                <h3 className="text-lg font-semibold mb-2 transition-colors group-hover:text-emerald-700 relative z-[1]" style={{ color: COLORS.text }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed relative z-[1]" style={{ color: COLORS.textSecondary }}>{feature.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium transition-all duration-300 group-hover:gap-3 relative z-[1]" style={{ color: feature.color }}>
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

// ── How It Works ──
function HowItWorks() {
  const steps = [
    { number: '1', title: 'Daftar Akun', description: 'Buat akun gratis dalam 30 detik', icon: UserPlus, color: '#059669' },
    { number: '2', title: 'Tambah Produk', description: 'Input produk satu per satu atau import CSV', icon: Package, color: '#3B82F6' },
    { number: '3', title: 'Mulai Jualan', description: 'Langsung gunakan kasir digital', icon: ShoppingCart, color: '#8B5CF6' },
  ];
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>3 Langkah Mudah</SectionBadge>
            <SectionTitle title="Cara Kerja" subtitle="Mulai gunakan Kasirku dalam hitungan menit" />
          </div>
        </RevealSection>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <RevealSection key={step.number} delay={index * 150}>
              <div className="relative text-center group">
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 z-0">
                    <div className="h-full bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-100 rounded-full" />
                  </div>
                )}
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl relative z-10" style={{ background: `linear-gradient(135deg, ${step.color}, ${COLORS.primary})`, boxShadow: `0 4px 20px ${step.color}40` }}>
                  <step.icon size={28} className="text-white" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white shadow-md" style={{ backgroundColor: COLORS.primaryDark }}>
                    {step.number}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 transition-colors group-hover:text-emerald-700" style={{ color: COLORS.text }}>{step.title}</h3>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>{step.description}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──
function Testimonials() {
  const testimonials = [
    { name: 'Budi Santoso', role: 'Pemilik Soto Paket Mantap — 3 Cabang', text: 'Kasirku membantu saya mengelola 3 cabang dengan sangat mudah. Transaksi jadi cepat dan akurat! Sekarang omzet naik 40% dalam 3 bulan.', rating: 5, avatar: 'BS' },
    { name: 'Siti Rahayu', role: 'Manager Minimarket Jaya — 2 Cabang', text: 'Fitur inventory nya luar biasa! Tidak perlu lagi hitung stok manual, semua otomatis. Waktu operasional karyawan jadi lebih efisien.', rating: 5, avatar: 'SR' },
    { name: 'Ahmad Wijaya', role: 'Owner Kedai Kopi Nusantara', text: 'Dashboard yang clean dan easy to use. Karyawan baru bisa langsung pakai dalam 5 menit. Fitur laporan harian sangat membantu!', rating: 5, avatar: 'AW' },
    { name: 'Dewi Lestari', role: 'Supervisor Bakery Fresh — 4 Cabang', text: 'Laporan real-time sangat membantu saya monitor penjualan setiap jam. Sekarang saya bisa ambil keputusan bisnis lebih cepat!', rating: 5, avatar: 'DL' },
  ];

  return (
    <section id="testimoni" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>Testimoni</SectionBadge>
            <SectionTitle title="Apa Kata Pengguna?" subtitle="Lebih dari 500 bisnis telah menggunakan Kasirku" />
          </div>
        </RevealSection>
        <div className="grid md:grid-cols-2 gap-6">
          {testimonials.map((t, index) => (
            <RevealSection key={t.name} delay={index * 100}>
              <div className="relative p-6 rounded-2xl border border-gray-100 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white overflow-hidden">
                <div className="absolute -top-4 -right-2 text-6xl font-serif leading-none opacity-[0.06] pointer-events-none select-none" style={{ color: COLORS.primary }}>&quot;</div>
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl bg-gradient-to-b from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="flex gap-1 mb-4 relative z-[1]">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} size={20} className="fill-amber-400 text-amber-400 transition-transform duration-300 hover:scale-110" />
                  ))}
                </div>
                <p className="text-base mb-4 leading-relaxed italic relative z-[1]" style={{ color: COLORS.text }}>&quot;{t.text}&quot;</p>
                <div className="flex items-center gap-3 relative z-[1]">
                  <div className="relative group/avatar">
                    <div className="absolute inset-0 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(135deg, ${COLORS.primary}, #10B981)`, padding: '2px' }} />
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold transition-transform duration-300 hover:scale-110 relative z-10" style={{ backgroundColor: COLORS.primary }}>{t.avatar}</div>
                  </div>
                  <div>
                    <p className="font-semibold" style={{ color: COLORS.text }}>{t.name}</p>
                    <p className="text-sm" style={{ color: COLORS.textSecondary }}>{t.role}</p>
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

// ── Pricing ──
const pricingPlans = [
  { name: 'Starter', price: 'Gratis', description: 'Cocok untuk bisnis kecil', features: ['1 Outlet', '3 Karyawan', 'Fitur Dasar', 'Laporan Sederhana'], cta: 'Mulai Gratis', popular: false },
  { name: 'Growth', price: 'Rp 299rb', period: '/bulan', description: 'Untuk bisnis yang berkembang', features: ['5 Outlet', '20 Karyawan', 'Semua Fitur', 'Laporan Lengkap', 'Priority Support'], cta: 'Pilih Paket', popular: true },
  { name: 'Enterprise', price: 'Hubungi Kami', description: 'Untuk bisnis skala besar', features: ['Unlimited Outlet', 'Unlimited Karyawan', 'Custom Fitur', 'Dedicated Support', 'API Access'], cta: 'Hubungi Kami', popular: false },
];

function Pricing() {
  return (
    <section id="harga" className="py-16 md:py-24" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>Paket Harga</SectionBadge>
            <SectionTitle title="Pilih Paket yang Sesuai" subtitle="Mulai gratis, upgrade kapan saja" />
          </div>
        </RevealSection>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <RevealSection key={plan.name} delay={index * 100}>
              <div className={`relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-2 ${plan.popular ? 'bg-white shadow-xl border-2 border-emerald-500 scale-105 md:scale-110' : 'bg-white border border-gray-200 hover:shadow-xl hover:border-emerald-200'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-xs font-bold rounded-full shadow-lg whitespace-nowrap">⭐ PALING POPULER</div>
                )}
                <h3 className="text-lg font-semibold" style={{ color: COLORS.text }}>{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold" style={{ color: plan.popular ? COLORS.primaryDark : COLORS.text }}>{plan.price}</span>
                  {plan.period && <span className="text-sm" style={{ color: COLORS.textSecondary }}>{plan.period}</span>}
                </div>
                <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm" style={{ color: COLORS.text }}>
                      <Check size={16} style={{ color: COLORS.primaryDark }} />{feature}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className={`block w-full py-3 text-center font-medium rounded-xl transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${plan.popular ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg hover:opacity-90' : 'text-white hover:opacity-90 hover:shadow-lg'}`} style={plan.popular ? {} : { backgroundColor: COLORS.primaryDark }}>
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

// ── FAQ ──
const faqItems = [
  { question: 'Apakah Kasirku gratis?', answer: 'Ya! Paket Starter kami gratis selamanya untuk 1 outlet dan 3 karyawan. Anda bisa upgrade kapan saja sesuai kebutuhan bisnis.' },
  { question: 'Apakah bisa dipakai di HP?', answer: 'Tentu! Kasirku adalah Progressive Web App (PWA) yang bisa diinstall di layar utama HP Android & iOS seperti aplikasi native. Bisa digunakan offline juga!' },
  { question: 'Bagaimana cara mulai menggunakan Kasirku?', answer: 'Cukup daftar akun gratis, tambahkan produk, dan langsung bisa mulai transaksi. Proses setup hanya butuh waktu kurang dari 5 menit.' },
  { question: 'Apakah data saya aman?', answer: 'Keamanan adalah prioritas kami. Semua data dienkripsi, server kami menggunakan sertifikat SSL, dan ada backup otomatis setiap hari.' },
  { question: 'Bisakah mengelola beberapa cabang?', answer: 'Bisa! Paket Growth dan Enterprise mendukung multi-outlet. Anda bisa monitor semua cabang dari satu dashboard dengan data real-time.' },
];

function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" className="py-16 md:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealSection>
          <div className="text-center mb-12">
            <SectionBadge>FAQ</SectionBadge>
            <SectionTitle title="Pertanyaan Umum" subtitle="Temukan jawaban untuk pertanyaan yang sering diajukan" />
          </div>
        </RevealSection>
        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <RevealSection key={index} delay={index * 80}>
              <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-200">
                <button onClick={() => setOpenIndex(openIndex === index ? null : index)} className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50/50">
                  <span className="text-base font-semibold pr-4" style={{ color: COLORS.text }}>{item.question}</span>
                  <ChevronRight size={20} className={`transition-all duration-300 flex-shrink-0 ${openIndex === index ? 'rotate-90' : ''}`} style={{ color: COLORS.primaryDark }} />
                </button>
                <div className="overflow-hidden transition-all duration-300" style={{ maxHeight: openIndex === index ? '300px' : '0px', opacity: openIndex === index ? 1 : 0 }}>
                  <div className="px-5 pb-5"><p className="text-sm leading-relaxed" style={{ color: COLORS.textSecondary }}>{item.answer}</p></div>
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
        <RevealSection>
          <div className="text-center mt-8">
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              Masih punya pertanyaan?{' '}
              <a href="mailto:support@kasirku.id" className="font-medium underline hover:no-underline transition-colors" style={{ color: COLORS.primaryDark }}>Hubungi tim support kami</a>
            </p>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

// ── CTA ──
function CTA() {
  return (
    <section className="py-16 md:py-24 overflow-hidden relative" style={{ backgroundColor: COLORS.warmBg }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-5 translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: COLORS.primaryDark }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-5 -translate-x-1/2 translate-y-1/2" style={{ backgroundColor: COLORS.primaryDark }} />
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <RevealSection>
          <div className="relative inline-block mb-6">
            <span className="text-6xl">🚀</span>
            <div className="absolute -top-2 -right-2 w-4 h-4 rounded-full animate-ping" style={{ backgroundColor: COLORS.primaryDark }} />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ color: COLORS.text }}>Siap Tingkatkan Bisnis Anda?</h2>
          <p className="mt-4 text-lg" style={{ color: COLORS.textSecondary }}>Bergabung dengan 500+ bisnis yang sudah menggunakan Kasirku</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95" style={{ backgroundColor: COLORS.primaryDark }}>
              Mulai Gratis Sekarang
              <ArrowRight size={24} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm flex-wrap" style={{ color: COLORS.textSecondary }}>
            <span className="flex items-center gap-2"><Check size={16} style={{ color: COLORS.primaryDark }} /> Tanpa kartu kredit</span>
            <span className="flex items-center gap-2"><Check size={16} style={{ color: COLORS.primaryDark }} /> Setup 30 detik</span>
            <span className="flex items-center gap-2"><Check size={16} style={{ color: COLORS.primaryDark }} /> Cancel anytime</span>
          </div>
        </RevealSection>
      </div>
    </section>
  );
}

// ── Footer ──
function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: COLORS.primary }}><span className="text-white font-bold text-sm">K</span></div>
              <span className="font-bold text-xl">Kasirku</span>
            </div>
            <p className="text-gray-300 text-sm mb-4 leading-relaxed">Sistem POS all-in-one untuk UMKM Indonesia. Kelola bisnis lebih cerdas dengan Kasirku.</p>
            <div className="flex items-center gap-3">
              {['Twitter', 'Instagram', 'LinkedIn', 'YouTube'].map((social) => (
                <a key={social} href="#" className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-emerald-600 transition-all duration-300 hover:scale-110" aria-label={`Kunjungi halaman ${social} Kasirku`}>
                  <span className="text-xs font-medium">{social[0]}</span>
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-base">Produk</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link href="/" className="hover:text-white transition-colors">Beranda</Link></li>
              <li><Link href="/fitur" className="hover:text-white transition-colors">Fitur</Link></li>
              <li><Link href="/harga" className="hover:text-white transition-colors">Harga</Link></li>
              <li><button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-white transition-colors">FAQ</button></li>
              <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-base">Perusahaan</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><a href="#" className="hover:text-white transition-colors">Tentang</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Karir</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Kontak</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4 text-white text-base">Kontak</h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2"><Mail size={14} /><a href="mailto:support@kasirku.id" className="hover:text-white transition-colors">support@kasirku.id</a></li>
              <li className="flex items-center gap-2"><Phone size={14} /><span>021-1234-5678</span></li>
              <li className="flex items-center gap-2"><MapPin size={14} /><span>Jakarta, Indonesia</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-300">© 2025 Kasirku. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Cookies Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Export: lazy bundle ──
export default function LandingSections() {
  return (
    <>
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </>
  );
}
