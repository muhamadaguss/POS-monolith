'use server';

import { auth } from '@/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface SelectOutletResult {
  accessToken: string;
  refreshToken: string;
  currentOutletId: string;
  role: string;
  permissions: string[];
}

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

/**
 * Server Action: pilih outlet aktif.
 *
 * Dipanggil dari Client Component, tapi BERJALAN DI SERVER → punya akses ke
 * backendAccessToken & backendRefreshToken dari session Auth.js (yang TIDAK
 * diekspos ke klien). Memanggil `POST /auth/select-outlet` backend (rotasi token),
 * lalu mengembalikan token baru agar client memperbarui session via `update()`.
 */
export async function selectOutletAction(outletId: string): Promise<SelectOutletResult> {
  const session = await auth();
  const accessToken = session?.backendAccessToken;
  if (!accessToken) throw new Error('Sesi tidak valid');

  // Refresh token lama (server-only) dikirim agar backend bisa merotasi/mencabutnya.
  // Tidak terekspos ke klien — diambil dari token Auth.js di server.
  // (auth() mengembalikan session; refresh token ada di JWT, tak di-ekspos ke session.
  //  Untuk akses refresh token di server, kita kirim tanpa dari sini — backend cukup
  //  dengan access token + akan merevoke saat rotasi berikutnya. refreshToken optional.)

  const res = await fetch(`${API_URL}/auth/select-outlet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ outletId }),
  });

  if (!res.ok) {
    let message = 'Gagal memilih outlet';
    try {
      const body = await res.json();
      message = body?.message ?? message;
    } catch {
      /* abaikan */
    }
    throw new Error(message);
  }

  return unwrap<SelectOutletResult>(await res.json());
}

/**
 * Server Action: ganti password sendiri (semua role).
 *
 * Berjalan di server → ambil backendAccessToken dari session Auth.js, panggil
 * `PATCH /auth/change-password`. Lempar Error dgn pesan backend bila gagal
 * (mis. "Password lama salah") agar form bisa menampilkannya.
 */
export async function changePasswordAction(
  oldPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const session = await auth();
  const accessToken = session?.backendAccessToken;
  if (!accessToken) throw new Error('Sesi tidak valid');

  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  if (!res.ok) {
    let message = 'Gagal mengubah password';
    try {
      const body = await res.json();
      message = Array.isArray(body?.message) ? body.message[0] : (body?.message ?? message);
    } catch {
      /* abaikan */
    }
    throw new Error(message);
  }

  return unwrap<{ message: string }>(await res.json());
}

/**
 * Server Action: revoke refresh token backend saat logout.
 * Cookie sesi Auth.js dihapus terpisah lewat `signOut()` di klien.
 */
export async function logoutAction(): Promise<void> {
  try {
    const session = await auth();
    const accessToken = session?.backendAccessToken;
    if (accessToken) {
      // logoutApi pakai axios client — di server kita panggil fetch langsung.
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
    }
  } catch {
    // Best-effort: logout tetap lanjut walau revoke gagal.
  }
}
