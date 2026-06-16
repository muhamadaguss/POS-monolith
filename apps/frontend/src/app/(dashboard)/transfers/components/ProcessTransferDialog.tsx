'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { processTransferAction } from '@/features/inventory/actions';
import type { StockTransfer } from '@/features/inventory/transfers';
import { toastSuccess, errorAlert } from '@/lib/swal';

type ProcessAction = 'APPROVED' | 'REJECTED' | 'CANCELLED';

const ACTION_META: Record<
  ProcessAction,
  { title: string; desc: string; confirm: string; danger: boolean }
> = {
  APPROVED: {
    title: 'Terima Transfer',
    desc: 'Stok akan dikurangi dari cabang asal dan ditambahkan ke cabang tujuan. Tindakan ini tidak dapat dibatalkan.',
    confirm: 'Terima',
    danger: false,
  },
  REJECTED: {
    title: 'Tolak Transfer',
    desc: 'Transfer ditolak dan stok tidak berpindah.',
    confirm: 'Tolak',
    danger: true,
  },
  CANCELLED: {
    title: 'Batalkan Transfer',
    desc: 'Transfer yang Anda ajukan akan dibatalkan dan stok tidak berpindah.',
    confirm: 'Batalkan',
    danger: true,
  },
};

export function ProcessTransferDialog({
  transfer,
  action,
  onClose,
  onProcessed,
}: {
  transfer: StockTransfer;
  action: ProcessAction;
  onClose: () => void;
  onProcessed: () => void;
}) {
  const meta = ACTION_META[action];
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await processTransferAction(transfer.id, { status: action, note: note.trim() || undefined });
      toastSuccess(`Transfer ${meta.confirm.toLowerCase()}`);
      onProcessed();
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal memproses transfer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{meta.title}</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">{meta.desc}</p>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div className="rounded-xl bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-900">
              {transfer.fromOutlet.name} → {transfer.toOutlet.name}
            </p>
            <p className="text-gray-500 mt-0.5">
              {transfer.items.length} produk ·{' '}
              {transfer.items.reduce((s, i) => s + i.quantity, 0)} unit
            </p>
          </div>
          <div>
            <Label htmlFor="pnote" className="mb-1 text-xs text-gray-500">
              Catatan (opsional)
            </Label>
            <Input
              id="pnote"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Alasan / keterangan"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Kembali
          </Button>
          <Button
            variant={meta.danger ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {meta.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
