'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Loader2, AlertTriangle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyPinAction } from '@/features/auth/actions';
import { logoutAction } from '@/features/auth/actions';
import { useSelectOutlet } from '@/features/auth/hooks';

/** Verifikasi PIN kasir (gate login). Sukses → tandai sesi & masuk POS. */
export function VerifyPinForm() {
  const router = useRouter();
  const { update, data: session } = useSession();
  const { selectOutlet } = useSelectOutlet();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN harus 6 digit angka');
      return;
    }
    setIsPending(true);
    try {
      await verifyPinAction(pin);
      await update({ pinVerified: true });
      // Kasir umumnya 1 outlet → auto-pilih agar tak perlu layar select-outlet.
      // Bila >1 outlet (diizinkan sistem), tampilkan layar pilih.
      const outlets = session?.outlets ?? [];
      if (outlets.length === 1) {
        await selectOutlet(outlets[0].id, '/pos');
      } else {
        router.replace('/pos');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'PIN salah';
      setError(msg);
      setPin('');
      // Backend mengunci akun setelah 3× gagal → paksa logout ke /login.
      if (/dikunci/i.test(msg)) {
        await logoutAction();
        await signOut({ redirectTo: '/login' });
        return;
      }
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <input
        inputMode="numeric"
        autoFocus
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        maxLength={6}
        className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label="PIN 6 digit"
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-left">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" disabled={isPending || pin.length !== 6} className="w-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        Verifikasi
      </Button>

      <button
        type="button"
        onClick={async () => {
          await logoutAction();
          await signOut({ redirectTo: '/login' });
        }}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
      >
        Keluar
      </button>
    </form>
  );
}
