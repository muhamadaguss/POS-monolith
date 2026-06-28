// ─────────────────────────────────────────────────────────────
// Shared layout for policy & FAQ pages — consistent with landing
// ─────────────────────────────────────────────────────────────
'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { COLORS } from './landing-shared';

// ── Policy Layout ──
export function PolicyLayout({
  title,
  description,
  children,
  lastUpdated,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  lastUpdated?: string;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80 group"
            style={{ color: COLORS.textSecondary }}
          >
            <ArrowLeft
              size={16}
              className="transition-transform group-hover:-translate-x-1"
            />
            Kembali ke Beranda
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: COLORS.primary }}
            >
              <span className="text-white font-bold text-sm">K</span>
            </div>
            <span
              className="font-bold text-lg hidden sm:inline"
              style={{ color: COLORS.text }}
            >
              Kasirku
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="mb-10">
          <h1
            className="text-3xl md:text-4xl font-bold mb-3"
            style={{ color: COLORS.text }}
          >
            {title}
          </h1>
          <p
            className="text-lg leading-relaxed"
            style={{ color: COLORS.textSecondary }}
          >
            {description}
          </p>
          {lastUpdated && (
            <p className="mt-3 text-sm" style={{ color: '#9CA3AF' }}>
              Terakhir diperbarui: {lastUpdated}
            </p>
          )}
        </div>

        <article
          className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:leading-relaxed prose-p:mb-4 prose-li:leading-relaxed prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline"
          style={{ color: COLORS.text }}
        >
          {children}
        </article>
      </main>

      {/* Footer mini */}
      <footer
        className="border-t border-gray-200 py-8"
        style={{ backgroundColor: '#F9FAFB' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm" style={{ color: COLORS.textSecondary }}>
            © 2025 Kasirku. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm">
            <Link
              href="/faq"
              className="transition-colors hover:opacity-80"
              style={{ color: COLORS.textSecondary }}
            >
              FAQ
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:opacity-80"
              style={{ color: COLORS.textSecondary }}
            >
              Syarat & Ketentuan
            </Link>
            <Link
              href="/refund"
              className="transition-colors hover:opacity-80"
              style={{ color: COLORS.textSecondary }}
            >
              Kebijakan Refund
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Sidebar Nav (for terms/refund pages) ──
export function SidebarNav({
  sections,
}: {
  sections: { id: string; label: string }[];
}) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="space-y-1">
      <h4
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: '#9CA3AF' }}
      >
        Daftar Isi
      </h4>
      {sections.map((section) => (
        <button
          key={section.id}
          onClick={() => scrollTo(section.id)}
          className={`block w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 ${
            activeId === section.id
              ? 'font-medium'
              : 'hover:bg-gray-100'
          }`}
          style={{
            color: activeId === section.id ? COLORS.primary : COLORS.textSecondary,
            backgroundColor: activeId === section.id ? COLORS.lightBg : 'transparent',
          }}
        >
          <span className="flex items-center gap-2">
            {activeId === section.id && <ChevronRight size={14} />}
            {section.label}
          </span>
        </button>
      ))}
    </nav>
  );
}

// ── FAQ Accordion Item ──
export function FaqAccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-emerald-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-gray-50/50"
      >
        <span
          className="text-base font-semibold pr-4"
          style={{ color: COLORS.text }}
        >
          {question}
        </span>
        <ChevronRight
          size={20}
          className={`transition-all duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-90' : ''
          }`}
          style={{ color: COLORS.primaryDark }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: isOpen ? '500px' : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div className="px-5 pb-5">
          <div
            className="text-sm leading-relaxed"
            style={{ color: COLORS.textSecondary }}
          >
            {answer}
          </div>
        </div>
      </div>
    </div>
  );
}
