'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  Mail,
  Lock,
  User,
  Store,
  ShoppingBag,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { registerSchema, type RegisterFormData } from '@/features/auth/dto/register.dto';
import { useRegister } from '@/features/auth/hooks';

const PLANS = [
  {
    id: 'FREE',
    name: 'Gratis',
    price: 'Rp 0',
    period: '/bulan',
    description: 'Coba semua fitur dasar',
    features: ['Trial 14 hari', '1 Outlet', 'Transaksi unlimited', 'Laporan dasar'],
    popular: true,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    price: 'Rp 99rb',
    period: '/bulan',
    description: 'Untuk bisnis yang berkembang',
    features: ['Tanpa trial', '3 Outlet', 'Transaksi unlimited', 'Laporan lengkap', 'Support优先'],
    popular: false,
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    price: 'Rp 299rb',
    period: '/bulan',
    description: 'Untuk bisnis yang lebih besar',
    features: ['Tanpa trial', '10 Outlet', 'Transaksi unlimited', 'Semua fitur', 'API Access', 'Support 24/7'],
    popular: false,
  },
] as const;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'FREE' | 'STARTER' | 'GROWTH'>('FREE');
  const { register: registerUser, isPending, error } = useRegister();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      ownerName: '',
      businessName: '',
      businessSlug: '',
      outletName: '',
      plan: 'FREE',
    },
  });

  // Auto-generate slug from business name
  const handleBusinessNameChange = (value: string) => {
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 60);
    form.setValue('businessSlug', slug);
    form.setValue('businessName', value);
  };

  async function onSubmit(values: RegisterFormData) {
    await registerUser({
      ...values,
      plan: selectedPlan,
    });
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] p-0 md:p-6 lg:p-12">
      <main className="w-full max-w-5xl min-h-[700px] flex flex-col md:flex-row bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* ── Panel Kiri (Branding) ── */}
        <section className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-[#006c49] overflow-hidden flex-col justify-between p-8">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYPd_mKAQcObxuIAa9LHqLT-duksGE3dZpnpudJGLlwDyT1w_-UKXV6aZ9HMHQ0ISlFtafZIUSYzUDNGwt6M10oWFkhIxWEEEhpkc0G4CSddhorFSfsuXwAQ4er1SQUdd0OtD3IBWZUn3jr9n-JhVD3Ojk39CeLPVso-PrYOeT5LiX3rBYr96ZUk2fWmC-NwbcX_Mfu9ir_wqG7DrMuhru7QOPev8U4tZmr4UXukxEAzlGrFPCvmkbr6uhTsvunbrKoOT_zgqdurw"
              alt=""
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-linear-to-br from-[#006c49] via-[#006c49]/80 to-emerald-400/40" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#002113] rounded-lg flex items-center justify-center shrink-0">
                <span className="text-[#6ffbbe] font-bold text-xl">K</span>
              </div>
              <span className="text-white font-semibold text-2xl">Kasirku</span>
            </div>
            <div className="max-w-md mt-8">
              <h1 className="text-[30px] leading-tight font-semibold text-white mb-4">
                Mulai Kelola Bisnis Anda Sekarang.
              </h1>
              <p className="text-[#6ffbbe]/90 text-base leading-relaxed">
                Daftar gratis dan nikmati trial 14 hari. Tidak perlu kartu kredit.
              </p>
            </div>
          </div>

          {/* Features list */}
          <div className="relative z-10 space-y-3">
            {[
              'Tanpa batas transaksi',
              'Laporan real-time',
              'Multi-outlet support',
              'Install di HP seperti app',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-[#6ffbbe]/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-[#6ffbbe]" />
                </div>
                <span className="text-white/80 text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10">
            <p className="text-white/60 text-xs">
              © {new Date().getFullYear()} Kasirku — Platform POS untuk UMKM & Retail.
            </p>
          </div>
        </section>

        {/* ── Panel Kanan (Form) ── */}
        <section className="flex-1 flex flex-col justify-center items-center p-8 md:p-12 lg:p-10 bg-white overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="md:hidden flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-[#006c49] rounded-xl flex items-center justify-center mb-3">
                <span className="text-white font-bold text-xl">K</span>
              </div>
              <h2 className="text-[#006c49] font-semibold text-xl">Kasirku</h2>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                Daftar Gratis
              </h2>
              <p className="text-sm text-gray-500">
                Isi data di bawah untuk memulai
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Owner Name */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                  <input
                    {...register('ownerName')}
                    type="text"
                    placeholder="Nama lengkap Anda"
                    autoComplete="name"
                    disabled={isPending}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                </div>
                {errors.ownerName && (
                  <p className="mt-1 text-xs text-red-600">{errors.ownerName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="email@anda.com"
                    autoComplete="email"
                    disabled={isPending}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
                    disabled={isPending}
                    className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-[#006c49] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Business Name */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  Nama Bisnis
                </label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                  <input
                    type="text"
                    placeholder="Nama bisnis Anda"
                    autoComplete="organization"
                    disabled={isPending}
                    onChange={(e) => handleBusinessNameChange(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                </div>
                {errors.businessName && (
                  <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>
                )}
              </div>

              {/* Business Slug */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  URL Bisnis
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    kasirku.id/
                  </span>
                  <input
                    {...register('businessSlug')}
                    type="text"
                    placeholder="nama-toko-anda"
                    autoComplete="off"
                    disabled={isPending}
                    className="w-full pl-32 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                </div>
                {errors.businessSlug && (
                  <p className="mt-1 text-xs text-red-600">{errors.businessSlug.message}</p>
                )}
              </div>

              {/* Outlet Name */}
              <div className="group">
                <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                  Nama Outlet Pertama
                </label>
                <div className="relative">
                  <ShoppingBag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                  <input
                    {...register('outletName')}
                    type="text"
                    placeholder="Nama outlet/cabang pertama"
                    autoComplete="off"
                    disabled={isPending}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                  />
                </div>
                {errors.outletName && (
                  <p className="mt-1 text-xs text-red-600">{errors.outletName.message}</p>
                )}
              </div>

              {/* Plan Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-500 mb-2">
                  Pilih Paket
                </label>
                <div className="space-y-2">
                  {PLANS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan.id)}
                      disabled={isPending}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all disabled:opacity-60 ${
                        selectedPlan === plan.id
                          ? 'border-[#006c49] bg-[#006c49]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === plan.id ? 'border-[#006c49] bg-[#006c49]' : 'border-gray-300'
                          }`}>
                            {selectedPlan === plan.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{plan.name}</span>
                              {plan.popular && (
                                <span className="text-[10px] font-medium text-[#006c49] bg-[#006c49]/10 px-1.5 py-0.5 rounded">
                                  Populer
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{plan.price}{plan.period}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 bg-[#006c49] hover:bg-[#005236] disabled:opacity-60 text-white font-semibold rounded-lg shadow-lg shadow-[#006c49]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{' '}
                    Mendaftarkan...
                  </>
                ) : (
                  <>
                    Daftar Gratis
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom CTA */}
            <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col items-center gap-2">
              <p className="text-sm text-gray-400">Sudah punya akun?</p>
              <Link
                href="/login"
                className="text-sm font-semibold text-[#006c49] px-6 py-2 border border-[#006c49] rounded-lg hover:bg-[#006c49]/5 transition-colors"
              >
                Login
              </Link>
            </div>

            {/* Mobile footer */}
            <footer className="md:hidden mt-6 text-center opacity-60">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Kasirku — Platform POS untuk UMKM & Retail
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
