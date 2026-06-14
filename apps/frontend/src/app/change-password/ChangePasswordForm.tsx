'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Lock, Eye, EyeOff, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordAction } from '@/features/auth/actions';

/** Beranda sesuai peran (selaras homeFor di proxy.ts). */
function homeFor(role: string, currentOutletId: string | null): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin';
    case 'CASHIER':
      return '/pos';
    case 'TENANT_OWNER':
      return '/dashboard';
    default: // STORE_MANAGER
      return currentOutletId ? '/dashboard' : '/select-outlet';
  }
}

/** Validasi password baru: min 8, ada huruf besar, kecil, dan angka (selaras DTO backend). */
function validateNewPassword(pw: string): string | null {
  if (pw.length < 8) return 'Password baru minimal 8 karakter';
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw)) {
    return 'Password baru harus mengandung huruf besar, huruf kecil, dan angka';
  }
  return null;
}

export function ChangePasswordForm({
  role,
  currentOutletId,
  forced,
}: {
  role: string;
  currentOutletId: string | null;
  forced: boolean;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirm) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    const pwError = validateNewPassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (oldPassword === newPassword) {
      setError('Password baru harus berbeda dari password lama');
      return;
    }

    setIsPending(true);
    try {
      await changePasswordAction(oldPassword, newPassword);
      // Clear flag mustChangePassword di session (efektif setelah wiring PR2).
      await update({ mustChangePassword: false });
      router.replace(homeFor(role, currentOutletId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah password');
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <PasswordField
        id="old"
        label="Password Lama"
        value={oldPassword}
        onChange={setOldPassword}
        show={show}
      />
      <PasswordField
        id="new"
        label="Password Baru"
        value={newPassword}
        onChange={setNewPassword}
        show={show}
      />
      <PasswordField
        id="confirm"
        label="Konfirmasi Password Baru"
        value={confirm}
        onChange={setConfirm}
        show={show}
      />

      <label className="inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
        />
        Tampilkan password
      </label>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-xs text-gray-400">
        Password baru minimal 8 karakter, mengandung huruf besar, huruf kecil, dan angka.
      </p>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        Ganti Password
      </Button>

      {!forced && (
        <button
          type="button"
          onClick={() => router.back()}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Batal
        </button>
      )}
    </form>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
}) {
  const [reveal, setReveal] = useState(false);
  const visible = show || reveal;
  return (
    <div>
      <Label htmlFor={id} className="mb-1 text-xs text-gray-500">
        {label}
      </Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-10 h-11"
          autoComplete={id === 'old' ? 'current-password' : 'new-password'}
          required
        />
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={visible ? 'Sembunyikan' : 'Tampilkan'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
