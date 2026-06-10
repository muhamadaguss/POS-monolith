'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Banknote, CreditCard, Smartphone, ArrowLeftRight, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { IDR } from '@/lib/format';

type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'QRIS' | 'TRANSFER' | 'OTHER';

const METHODS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'CASH', label: 'Tunai', icon: Banknote },
  { value: 'QRIS', label: 'QRIS', icon: Smartphone },
  { value: 'DEBIT_CARD', label: 'Debit', icon: CreditCard },
  { value: 'CREDIT_CARD', label: 'Kredit', icon: CreditCard },
  { value: 'TRANSFER', label: 'Transfer', icon: ArrowLeftRight },
  { value: 'OTHER', label: 'Lainnya', icon: MoreHorizontal },
];

const CASH_SHORTCUTS = [10_000, 20_000, 50_000, 100_000];

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grandTotal: number;
  isPending: boolean;
  error: string | null;
  onConfirm: (method: PaymentMethod, cashReceived?: number) => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  grandTotal,
  isPending,
  error,
  onConfirm,
}: CheckoutDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [cashInput, setCashInput] = useState('');

  const cashReceived = cashInput ? parseInt(cashInput.replace(/\D/g, ''), 10) : 0;
  const change = method === 'CASH' ? Math.max(cashReceived - grandTotal, 0) : 0;
  const isCashInsufficient = method === 'CASH' && cashReceived < grandTotal;

  function handleConfirm() {
    if (isPending) return;
    onConfirm(method, method === 'CASH' ? cashReceived : undefined);
  }

  function handleCashShortcut(amount: number) {
    const rounded = amount >= grandTotal ? amount : grandTotal;
    setCashInput(rounded.toString());
  }

  return (
    <Dialog open={open} onOpenChange={isPending ? undefined : onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-bold text-gray-900">Pembayaran</DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            Total tagihan:{' '}
            <span className="font-bold text-emerald-700 text-base">{IDR.format(grandTotal)}</span>
          </p>
        </DialogHeader>

        <Separator />

        <div className="px-6 py-5 space-y-5">
          {/* Payment method selector */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Metode Bayar
            </p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setMethod(value); setCashInput(''); }}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 py-3 transition-all ${
                    method === value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash section */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Uang Diterima
              </p>

              {/* Shortcut buttons */}
              <div className="grid grid-cols-4 gap-2">
                {CASH_SHORTCUTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => handleCashShortcut(amount)}
                    className="rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 py-2 text-xs font-semibold text-gray-700 transition-colors"
                  >
                    {IDR.format(amount)}
                  </button>
                ))}
              </div>

              {/* Manual input */}
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Masukkan jumlah uang"
                value={cashInput ? IDR.format(parseInt(cashInput.replace(/\D/g, ''), 10) || 0) : ''}
                onChange={(e) => setCashInput(e.target.value.replace(/\D/g, ''))}
                className="text-lg font-bold h-12"
              />

              {/* Change display */}
              {cashReceived > 0 && (
                <div className={`rounded-xl px-4 py-3 text-center ${
                  isCashInsufficient ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'
                }`}>
                  {isCashInsufficient ? (
                    <p className="text-sm font-semibold text-red-600">
                      Kurang: {IDR.format(grandTotal - cashReceived)}
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-emerald-600 font-medium">Kembalian</p>
                      <p className="text-3xl font-black text-emerald-700 tabular-nums mt-0.5">
                        {IDR.format(change)}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Actions */}
        <div className="px-6 py-4 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="flex-1 h-12 rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || (method === 'CASH' && isCashInsufficient)}
            className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Konfirmasi
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
