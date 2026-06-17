import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Proxy (Next 16; dulu bernama `middleware`) — gating auth OPTIMISTIC sisi server.
 *
 * Auth kini di cookie HttpOnly (Auth.js), terbaca di server → proxy bisa
 * mengarahkan SEBELUM halaman render (tak ada lagi spinner hydration klien).
 *
 * PENTING (dokumen Next.js `proxy.md`): ini hanya optimistic redirect. Verifikasi
 * sebenarnya tetap di DAL (`lib/session.ts` `verifySession`/`serverFetch`) yang
 * dipanggil dekat data. Jangan andalkan proxy sebagai satu-satunya pertahanan.
 *
 * Membungkus `auth` agar `req.auth` berisi session. Logika redirect by-role
 * memindahkan apa yang dulu ada di `useAuthGuard` + layout client.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const path = nextUrl.pathname;
  const session = req.auth;
  const user = session?.user;
  const isLoggedIn = !!user;

  const isAuthRoute = path === '/login' || path === '/select-outlet';

  // 1) Belum login & bukan halaman auth → ke /login.
  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // 2) Wajib ganti password (force-change) → kunci ke /change-password sampai selesai.
  //    Berlaku untuk SEMUA role & path (kecuali halaman itu sendiri). Logout tetap
  //    bisa karena /api/auth/* di luar matcher.
  if (isLoggedIn && user!.mustChangePassword && path !== '/change-password') {
    return NextResponse.redirect(new URL('/change-password', nextUrl));
  }

  // 2b) Gate PIN untuk kasir: setelah login wajib verifikasi PIN sekali per sesi.
  //     Kasir tanpa PIN → buat dulu (/setup-pin); lalu verifikasi (/verify-pin).
  //     Berjalan setelah force-change selesai (urutan: password → PIN).
  if (isLoggedIn && user!.requiresPinVerification && !user!.mustChangePassword) {
    if (!user!.hasPin && path !== '/setup-pin') {
      return NextResponse.redirect(new URL('/setup-pin', nextUrl));
    }
    if (user!.hasPin && !session!.pinVerified && path !== '/verify-pin') {
      return NextResponse.redirect(new URL('/verify-pin', nextUrl));
    }
  }

  // 3) Sudah login tapi di /login → arahkan ke beranda sesuai peran.
  if (isLoggedIn && path === '/login') {
    return NextResponse.redirect(new URL(homeFor(user!), nextUrl));
  }

  // 3) Gating peran pada area utama (optimistic; DAL tetap verifikasi).
  if (isLoggedIn) {
    const role = user!.role;

    // Super Admin → area /admin.
    if (path.startsWith('/admin') && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL(homeFor(user!), nextUrl));
    }
    // Kasir tak boleh ke dashboard manajemen → arahkan ke POS.
    if (path.startsWith('/dashboard') && role === 'CASHIER') {
      return NextResponse.redirect(new URL('/pos', nextUrl));
    }
    // Manager tanpa outlet aktif harus pilih outlet dulu (Owner dikecualikan).
    if (
      path.startsWith('/dashboard') &&
      role === 'STORE_MANAGER' &&
      !user!.currentOutletId
    ) {
      return NextResponse.redirect(new URL('/select-outlet', nextUrl));
    }
  }

  return NextResponse.next();
});

function homeFor(user: { role: string; currentOutletId: string | null }): string {
  switch (user.role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'CASHIER':
      return '/pos';
    case 'TENANT_OWNER':
      return '/dashboard';
    default: // STORE_MANAGER
      return user.currentOutletId ? '/dashboard' : '/select-outlet';
  }
}

export const config = {
  // Jalankan di semua route kecuali api, route tunnel Sentry (/monitoring),
  // aset statis, file gambar, dan artefak PWA yang HARUS publik (service worker,
  // manifest, ikon, halaman offline) — kalau ikut digerbang auth, SW gagal
  // register / tunnel ke-redirect ke /login & app tak installable.
  matcher: [
    '/((?!api|monitoring|_next/static|_next/image|favicon.ico|sw.js|swe-worker-.*|manifest.webmanifest|icons/|offline).*)',
  ],
};
