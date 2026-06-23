'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
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
import { getInventory, type InventoryItem } from '@/features/inventory/api';
import { createTransferAction } from '@/features/inventory/actions';
import { toastSuccess, errorAlert } from '@/lib/swal';

interface OutletOpt {
  id: string;
  name: string;
}

interface DraftItem {
  productId: string;
  quantity: string;
}

export function CreateTransferDialog({
  outlets,
  defaultFromOutletId,
  onClose,
  onCreated,
}: {
  outlets: OutletOpt[];
  defaultFromOutletId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fromOutletId, setFromOutletId] = useState(defaultFromOutletId || outlets[0]?.id || '');
  const [toOutletId, setToOutletId] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<DraftItem[]>([{ productId: '', quantity: '' }]);
  const [stock, setStock] = useState<InventoryItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStock = useCallback(async (outletId: string) => {
    if (!outletId) {
      setStock([]);
      return;
    }
    setLoadingStock(true);
    try {
      const data = await getInventory(outletId);
      setStock(data.filter((i) => i.quantity > 0));
    } catch {
      setStock([]);
    } finally {
      setLoadingStock(false);
    }
  }, []);

  useEffect(() => {
    loadStock(fromOutletId);
    setRows([{ productId: '', quantity: '' }]);
  }, [fromOutletId, loadStock]);

  function availableFor(productId: string): number {
    return stock.find((s) => s.productId === productId)?.quantity ?? 0;
  }

  function updateRow(idx: number, patch: Partial<DraftItem>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { productId: '', quantity: '' }]);
  }
  function removeRow(idx: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  const validRows = rows.filter((r) => r.productId && Number(r.quantity) > 0);
  const hasOverflow = rows.some(
    (r) => r.productId && Number(r.quantity) > availableFor(r.productId),
  );
  const canSubmit =
    !!fromOutletId &&
    !!toOutletId &&
    fromOutletId !== toOutletId &&
    validRows.length > 0 &&
    !hasOverflow &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await createTransferAction({
        fromOutletId,
        toOutletId,
        note: note.trim() || undefined,
        items: validRows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })),
      });
      toastSuccess('Transfer diajukan');
      onCreated();
    } catch (err) {
      errorAlert(err instanceof Error ? err.message : 'Gagal mengajukan transfer');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Ajukan Transfer Stok</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Pilih cabang asal &amp; tujuan, lalu produk yang dipindahkan. Stok berpindah setelah
            cabang tujuan menerima.
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from" className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                Cabang Asal
              </Label>
              <select
                id="from"
                value={fromOutletId}
                onChange={(e) => setFromOutletId(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="">Pilih cabang…</option>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="to" className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                Cabang Tujuan
              </Label>
              <select
                id="to"
                value={toOutletId}
                onChange={(e) => setToOutletId(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
              >
                <option value="">Pilih cabang…</option>
                {outlets
                  .filter((o) => o.id !== fromOutletId)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="mb-1 text-xs text-gray-500 dark:text-gray-400">Produk</Label>
            {loadingStock ? (
              <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 py-3">
                <Loader2 className="size-4 animate-spin" /> Memuat stok cabang asal…
              </div>
            ) : stock.length === 0 && fromOutletId ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 py-3">Tidak ada stok tersedia di cabang asal.</p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, idx) => {
                  const avail = row.productId ? availableFor(row.productId) : 0;
                  const over = row.productId && Number(row.quantity) > avail;
                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <select
                          aria-label="Pilih produk"
                          value={row.productId}
                          onChange={(e) => updateRow(idx, { productId: e.target.value })}
                          className="h-9 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300"
                        >
                          <option value="">Pilih produk…</option>
                          {stock.map((s) => (
                            <option key={s.productId} value={s.productId}>
                              {s.productName} (stok {s.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          aria-label="Jumlah"
                          value={row.quantity}
                          onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                          className={over ? 'border-red-400' : ''}
                        />
                        {over && <p className="text-[11px] text-red-500 mt-0.5">Maks {avail}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(idx)}
                        disabled={rows.length === 1}
                        aria-label="Hapus baris"
                      >
                        <Trash2 className="size-4 text-gray-400" />
                      </Button>
                    </div>
                  );
                })}
                <Button type="button" variant="outline" size="sm" onClick={addRow}>
                  <Plus className="size-3.5" /> Tambah produk
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="note" className="mb-1 text-xs text-gray-500 dark:text-gray-400">
              Catatan (opsional)
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. restok cabang baru"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Ajukan Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
