// ─────────────────────────────────────────────────────────────
// Kontak Page Client — /kontak
// ─────────────────────────────────────────────────────────────
'use client';

import { useState, type FormEvent } from 'react';
import { PolicyLayout } from '../policy-shared';
import { COLORS } from '../landing-shared';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

// ── Contact Info ──
const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'muhamadagus3197@gmail.com',
    href: 'mailto:muhamadagus3197@gmail.com',
    color: '#3B82F6',
  },
  {
    icon: Phone,
    label: 'Telepon',
    value: '0813-8474-2399',
    href: 'tel:081384742399',
    color: '#10B981',
  },
  {
    icon: MapPin,
    label: 'Alamat',
    value: 'Bekasi, Indonesia',
    color: '#F59E0B',
  },
  {
    icon: Clock,
    label: 'Jam Operasional',
    value: 'Senin – Jumat, 09:00 – 17:00 WIB',
    color: '#8B5CF6',
  },
];

export default function KontakPageClient() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    // Buka email client dengan data form
    const subject = encodeURIComponent(form.subject || 'Pertanyaan dari Website Kasirku');
    const body = encodeURIComponent(
      `Nama: ${form.name}\nEmail: ${form.email}\n\nPesan:\n${form.message}`
    );
    window.location.href = `mailto:muhamadagus3197@gmail.com?subject=${subject}&body=${body}`;
    setStatus('success');
  };

  return (
    <PolicyLayout title="Hubungi Kami" description="Punya pertanyaan, saran, atau ingin bermitra? Jangan ragu untuk menghubungi kami.">
      <div className="grid lg:grid-cols-5 gap-12">
        {/* Info Kontak */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold" style={{ color: COLORS.text }}>
            Informasi Kontak
          </h2>
          <div className="space-y-4">
            {contactInfo.map((item) => (
              <div
                key={item.label}
                className="group flex items-start gap-4 p-4 rounded-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 bg-white border border-gray-100"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-sm font-medium transition-colors hover:underline break-all"
                      style={{ color: COLORS.text }}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium" style={{ color: COLORS.text }}>
                      {item.value}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick CTA */}
          <div
            className="p-6 rounded-2xl mt-6"
            style={{ backgroundColor: COLORS.lightBg }}
          >
            <h3 className="font-semibold mb-2" style={{ color: COLORS.text }}>
              Butuh Bantuan Cepat?
            </h3>
            <p className="text-sm mb-4" style={{ color: COLORS.textSecondary }}>
              Kunjungi halaman FAQ kami untuk jawaban pertanyaan umum.
            </p>
            <a
              href="/faq"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:underline"
              style={{ color: COLORS.primary }}
            >
              Lihat FAQ →
            </a>
          </div>
        </div>

        {/* Form Kontak */}
        <div className="lg:col-span-3">
          <h2 className="text-xl font-bold mb-6" style={{ color: COLORS.text }}>
            Kirim Pesan
          </h2>

          {status === 'success' ? (
            <div
              className="p-8 rounded-2xl text-center border-2"
              style={{ borderColor: COLORS.primary, backgroundColor: COLORS.lightBg }}
            >
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: COLORS.primary }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: COLORS.text }}>
                Pesan Terkirim! 🎉
              </h3>
              <p style={{ color: COLORS.textSecondary }}>
                Email client Anda telah terbuka. Kirim email tersebut dan kami akan membalas dalam 1×24 jam kerja.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setForm({ name: '', email: '', subject: '', message: '' });
                }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{ backgroundColor: COLORS.primary, color: 'white' }}
              >
                Kirim pesan baru
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.text }}
                  >
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                    style={{
                      color: COLORS.text,
                    } as React.CSSProperties}
                    placeholder="Nama Anda"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-sm font-medium mb-2"
                    style={{ color: COLORS.text }}
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                    style={{
                      color: COLORS.text,
                    } as React.CSSProperties}
                    placeholder="email@contoh.com"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="contact-subject"
                  className="block text-sm font-medium mb-2"
                  style={{ color: COLORS.text }}
                >
                  Subjek
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400"
                  style={{
                    color: COLORS.text,
                  } as React.CSSProperties}
                  placeholder="Contoh: Pertanyaan tentang paket Growth"
                />
              </div>
              <div>
                <label
                  htmlFor="contact-message"
                  className="block text-sm font-medium mb-2"
                  style={{ color: COLORS.text }}
                >
                  Pesan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent placeholder:text-gray-400 resize-none"
                  style={{
                    color: COLORS.text,
                  } as React.CSSProperties}
                  placeholder="Tulis pesan Anda di sini..."
                />
              </div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLORS.primary }}
              >
                {status === 'sending' ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Kirim Pesan
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </PolicyLayout>
  );
}
