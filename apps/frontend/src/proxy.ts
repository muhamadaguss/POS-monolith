import { NextResponse } from 'next/server';

export function proxy() {
  // Auth disimpan di localStorage (client-side), tidak bisa dibaca middleware.
  // Karena itu SEMUA proteksi & redirect ditangani client-side guards:
  // - RootPage (`/`) membaca store dan mengarahkan sesuai role/login state
  // - DashboardLayout / PosLayout / AuthLayout menjaga route masing-masing
  // Middleware dibiarkan pass-through agar tidak menimpa keputusan client.
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
