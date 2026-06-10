'use client';

import { useCallback, useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  getProductPrices,
  setProductPrice,
  apiErrorMessage,
} from '@/features/products/api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import type { ProductListItem, OutletPriceRow } from '@/features/products/types';
import { rupiah } from './helpers';

/** Input angka dengan prefix "Rp" — nilai tetap numerik murni. */
function RupiahInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
        Rp
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 pl-9"
      />
    </div>
  );
}

export function PriceDialog({
  product,
  outlets,
  canEdit,
  onClose,
  onSaved,
}: {
  product: ProductListItem;
  outlets: { id: string; name: string }[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<OutletPriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? '');
  const [variantId, setVariantId] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getProductPrices(product.id));
    } catch {
      /* abaikan */
    } finally {
      setLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleSave() {
    setError(null);
    if (!outletId) return setError('Pilih outlet.');
    const cost = Number(costPrice);
    const sell = Number(sellPrice);
    if (!Number.isFinite(sell) || sell <= 0) return setError('Harga jual harus lebih dari 0.');
    if (!Number.isFinite(cost) || cost < 0) return setError('HPP tidak valid.');

    setSaving(true);
    try {
      await setProductPrice(product.id, {
        outletId,
        variantId: product.hasVariants && variantId ? variantId : undefined,
        costPrice: cost,
        sellPrice: sell,
      });
      setCostPrice('');
      setSellPrice('');
      await reload();
      onSaved();
      toastSuccess('Harga berhasil disimpan');
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menyimpan harga.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-0"
      >
        {/* Header */}
        <DialogHeader className="border-b border-gray-100 px-6 py-5">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Harga — <span className="text-emerald-600">{product.name}</span>
          </DialogTitle>
          <p className="text-sm italic text-gray-500 mt-1">
            Harga jual &amp; HPP diatur per outlet.
          </p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Daftar harga eksisting */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-semibold">Outlet</th>
                  <th className="px-4 py-3 font-semibold">Varian</th>
                  <th className="px-4 py-3 font-semibold text-right">HPP</th>
                  <th className="px-4 py-3 font-semibold text-right">Jual</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-center text-gray-400">
                      Memuat…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-5 text-center text-gray-400">
                      Belum ada harga.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-800">{r.outletName}</td>
                      <td className="px-4 py-3 text-gray-400">{r.variantName ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                        {rupiah(r.costPrice)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">
                        {rupiah(r.sellPrice)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Form set harga */}
          {canEdit && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-emerald-600" />
                <p className="text-base font-semibold text-gray-900">Atur harga</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={product.hasVariants ? '' : 'col-span-2'}>
                  <Label htmlFor="pr-outlet" className="mb-2">
                    Outlet
                  </Label>
                  <select
                    id="pr-outlet"
                    value={outletId}
                    onChange={(e) => setOutletId(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
                {product.hasVariants && (
                  <div>
                    <Label htmlFor="pr-variant" className="mb-2">
                      Varian
                    </Label>
                    <select
                      id="pr-variant"
                      value={variantId}
                      onChange={(e) => setVariantId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm"
                    >
                      <option value="">Pilih varian…</option>
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pr-cost" className="mb-2">
                    HPP (cost)
                  </Label>
                  <RupiahInput id="pr-cost" value={costPrice} onChange={setCostPrice} />
                </div>
                <div>
                  <Label htmlFor="pr-sell" className="mb-2">
                    Harga jual
                  </Label>
                  <RupiahInput id="pr-sell" value={sellPrice} onChange={setSellPrice} />
                </div>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {canEdit && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
            <Button variant="ghost" onClick={onClose} disabled={saving}>
              Batal
            </Button>
            <Button size="lg" onClick={handleSave} disabled={saving}>
              <Save className="size-4" />
              {saving ? 'Menyimpan…' : 'Simpan harga'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
