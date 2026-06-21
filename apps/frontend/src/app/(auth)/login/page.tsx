"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useLogin } from "@/features/auth/hooks";
import {
  Mail,
  Lock,
  Store,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Clock,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  tenantSlug: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, isPending, error } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", tenantSlug: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    await login({
      email: values.email,
      password: values.password,
      tenantSlug: isSuperAdmin ? undefined : values.tenantSlug,
    });
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f9fb] p-0 md:p-6 lg:p-12">
      <main className="w-full max-w-360 min-h-200 flex flex-col md:flex-row bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* ── Panel Kiri ── */}
        <section className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-[#006c49] overflow-hidden flex-col justify-between p-8">
          {/* Background image + overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYPd_mKAQcObxuIAa9LHqLT-duksGE3dZpnpudJGLlwDyT1w_-UKXV6aZ9HMHQ0ISlFtafZIUSYzUDNGwt6M10oWFkhIxWEEEhpkc0G4CSddhorFSfsuXwAQ4er1SQUdd0OtD3IBWZUn3jr9n-JhVD3Ojk39CeLPVso-PrYOeT5LiX3rBYr96ZUk2fWmC-NwbcX_Mfu9ir_wqG7DrMuhru7QOPev8U4tZmr4UXukxEAzlGrFPCvmkbr6uhTsvunbrKoOT_zgqdurw"
              alt=""
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-linear-to-br from-[#006c49] via-[#006c49]/80 to-emerald-400/40" />
          </div>

          {/* Branding */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#002113] rounded-lg flex items-center justify-center shrink-0">
                <span className="text-[#6ffbbe] font-bold text-xl">K</span>
              </div>
              <span className="text-white font-semibold text-2xl">Kasirku</span>
            </div>
            <div className="max-w-md mt-8">
              <h1 className="text-[30px] leading-tight font-semibold text-white mb-4">
                Empower Your Retail Business with Intelligence.
              </h1>
              <p className="text-[#6ffbbe]/90 text-base leading-relaxed">
                Kelola stok, transaksi, dan laporan performa bisnis Anda dalam
                satu platform cerdas yang dirancang untuk efisiensi maksimal.
              </p>
            </div>
          </div>

          {/* Stats card */}
          <div
            className="relative z-10 self-start flex gap-6 p-6 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          >
            <div className="flex flex-col">
              <span className="text-[#6ffbbe] text-xs font-medium uppercase tracking-wider">
                Total Sales
              </span>
              <span className="text-white text-4xl font-bold tracking-tight mt-1">
                Rp 2.4B
              </span>
              <div className="flex items-center gap-1 mt-1 text-[#6ffbbe]">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-semibold">+12.5%</span>
              </div>
            </div>
            <div className="w-px bg-white/20" />
            <div className="flex flex-col">
              <span className="text-[#6ffbbe] text-xs font-medium uppercase tracking-wider">
                Active Outlets
              </span>
              <span className="text-white text-4xl font-bold tracking-tight mt-1">
                24
              </span>
              <div className="flex items-center gap-1 mt-1 text-[#6ffbbe]">
                <MapPin className="w-4 h-4" />
                <span className="text-sm font-semibold">Jakarta, BDG, SUB</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10">
            <p className="text-white/60 text-xs">
              © {new Date().getFullYear()} Kasirku — Platform POS untuk UMKM
              &amp; Retail. All Rights Reserved.
            </p>
          </div>
        </section>

        {/* ── Panel Kanan (Form) ── */}
        <section className="flex-1 flex flex-col justify-center items-center p-8 md:p-12 lg:p-24 bg-white">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="md:hidden flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#006c49] rounded-xl flex items-center justify-center mb-4">
                <span className="text-white font-bold text-2xl">K</span>
              </div>
              <h2 className="text-[#006c49] font-semibold text-2xl">Kasirku</h2>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                Selamat Datang Kembali
              </h2>
              <p className="text-sm text-gray-500">
                Masuk ke akun Anda untuk mulai mengelola bisnis
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Super Admin toggle */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                <label
                  htmlFor="admin-toggle"
                  className="flex items-center gap-2 text-sm font-medium text-gray-600 cursor-pointer"
                >
                  <ShieldCheck className="w-5 h-5 text-[#006c49]" />
                  Masuk sebagai Super Admin
                </label>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isSuperAdmin}
                  id="admin-toggle"
                  onClick={() => setIsSuperAdmin((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006c49] ${
                    isSuperAdmin ? "bg-[#006c49]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      isSuperAdmin ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                {/* Email */}
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                    <input
                      {...register("email")}
                      type="email"
                      placeholder="nama@toko.com"
                      autoComplete="email"
                      disabled={isPending}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.email.message}
                    </p>
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
                      {...register("password")}
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={isPending}
                      className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-1 text-gray-400 hover:text-[#006c49] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Kode Toko */}
                {!isSuperAdmin && (
                  <div className="group">
                    <label className="block text-sm font-semibold text-gray-500 mb-1.5 group-focus-within:text-[#006c49] transition-colors">
                      Kode Toko
                    </label>
                    <div className="relative">
                      <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#006c49] transition-colors" />
                      <input
                        {...register("tenantSlug")}
                        type="text"
                        placeholder="nama-toko-anda"
                        autoComplete="off"
                        disabled={isPending}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49] focus:border-[#006c49] transition-all disabled:opacity-60"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Ingat Saya + Lupa Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-[#006c49] focus:ring-[#006c49]"
                  />
                  <span className="text-xs text-gray-500">Ingat Saya</span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-[#006c49] hover:underline"
                >
                  Lupa Password?
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className={`rounded-xl border px-4 py-4 ${
                  error.includes('trial') || error.includes('Trial')
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {error.includes('trial') || error.includes('Trial') ? (
                      <Clock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        error.includes('trial') || error.includes('Trial')
                          ? 'text-amber-800'
                          : 'text-red-700'
                      }`}>
                        {error.includes('trial') || error.includes('Trial') ? 'Trial Berakhir' : 'Login Gagal'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        error.includes('trial') || error.includes('Trial')
                          ? 'text-amber-700'
                          : 'text-red-600'
                      }`}>
                        {error}
                      </p>
                    </div>
                  </div>
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
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                    Memproses...
                  </>
                ) : (
                  "Masuk ke Dashboard"
                )}
              </button>
            </form>

            {/* Bottom CTA */}
            <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col items-center gap-4">
              <p className="text-sm text-gray-400">Belum punya akun?</p>
              <Link
                href="/register"
                className="text-sm font-semibold text-[#006c49] px-8 py-3 border border-[#006c49] rounded-lg hover:bg-[#006c49]/5 transition-colors"
              >
                Daftar Gratis
              </Link>
            </div>

            {/* Mobile footer */}
            <footer className="md:hidden mt-8 text-center opacity-60">
              <p className="text-xs text-gray-400">
                © {new Date().getFullYear()} Kasirku — Platform POS untuk UMKM
                &amp; Retail
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
