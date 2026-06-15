'use client';

import { useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { resetStaffPassword, resetStaffPin } from '@/features/users/api';
import { errorAlert } from '@/lib/swal';
import type { StaffMember } from '@/features/users/api';

type Kind = 'password' | 'pin';

interface ResetCredentialDialogProps {
  staff: StaffMember;
  kind: Kind;
  onClose: () => void;
}

const COPY = {
  password: {
    title: 'Reset Password',
    Icon: KeyRound,
    warn: 'Password baru akan dibuat otomatis & ditampilkan sekali. Staf wajib menggantinya saat login berikutnya. Sesi aktif staf akan diputus.',
    done: 'Salin & sampaikan password ini ke staf. Tidak akan ditampilkan lagi.',
    label: 'password',
  },
  pin: {
    title: 'Reset PIN',
    Icon: Hash,
    warn: 'PIN baru (6 digit) akan dibuat otomatis & ditampilkan sekali. Sampaikan ke staf untuk otorisasi aksi kasir (void/refund).',
    done: 'Salin & sampaikan PIN ini ke staf. Tidak akan ditampilkan lagi.',
    label: 'PIN',
  },
} as const;

/**
 * Dialog reset kredensial staf (password / PIN). Backend men-generate kredensial
 * acak & mengembalikannya SEKALI; tak pernah menerima input dari owner/manager.
 */
export function ResetCredentialDialog({ staff, kind, onClose }: ResetCredentialDialogProps) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const c = COPY[kind];

  async function doReset() {
    setLoading(true);
    try {
      if (kind === 'password') {
        const res = await resetStaffPassword(staff.id);
        setValue(res.password);
      } else {
        const res = await resetStaffPin(staff.id);
        setValue(res.pin);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      errorAlert(msg ?? `Gagal mereset ${c.label}`);
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* abaikan */
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>
            {c.title} — {staff.name}
          </DialogTitle>
        </DialogHeader>

        {!value ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{c.warn}</span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button onClick={doReset} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <c.Icon className="size-4" />
                )}
                {c.title}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">{c.done}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-gray-100 px-3 py-2 text-sm font-mono break-all">
                {value}
              </code>
              <button
                type="button"
                onClick={copy}
                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                title="Salin"
                aria-label={`Salin ${c.label}`}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Selesai</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
