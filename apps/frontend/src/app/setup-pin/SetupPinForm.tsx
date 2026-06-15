'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setupPinAction, logoutAction } from '@/features/auth/actions';

/** Buat PIN kasir pertama kali. Sukses → tandai hasPin, lanjut ke /verify-pin. */
export function SetupPinForm() {
  const router = useRouter();
  const { update } = useSession();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(pin)) {
      setError('PIN harus 6 digit angka');
      return;
    }
    if (pin !== confirm) {
      setError('Konfirmasi PIN tidak cocok');
      return;
    }
    setIsPending(true);
    try {
      await setupPinAction(pin);
      await update({ hasPin: true });
      router.replace('/verify-pin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat PIN');
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <PinField label="PIN baru" value={pin} onChange={setPin} autoFocus />
      <PinField label="Konfirmasi PIN" value={confirm} onChange={setConfirm} />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 text-left">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending || pin.length !== 6 || confirm.length !== 6}
        className="w-full"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Buat PIN
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

function PinField({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="text-left">
      <label className="mb-1 block text-xs text-gray-500">{label}</label>
      <input
        inputMode="numeric"
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        maxLength={6}
        className="w-full h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        aria-label={label}
      />
    </div>
  );
}
