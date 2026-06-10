'use client';

import { useRef, useState } from 'react';
import {
  FilePenLine,
  Trash2,
  ImageOff,
  X,
  Upload,
  Loader2,
  Save,
  Lock,
  ChevronDown,
  Info,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createProduct,
  updateProduct,
  uploadProductImage,
  resolveImageUrl,
  apiErrorMessage,
} from '@/features/products/api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import type {
  ProductListItem,
  Category,
  ProductStatus,
  ProductVariantInput,
} from '@/features/products/types';

export function ProductFormDialog({
  open,
  onClose,
  product,
  categories,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product: ProductListItem | null;
  categories: Category[];
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [barcode, setBarcode] = useState(product?.barcode ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'pcs');
  const [categoryId, setCategoryId] = useState(product?.category?.id ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'ACTIVE');
  const [variants, setVariants] = useState<ProductVariantInput[]>(
    product?.variants.map((v) => ({ name: v.name, sku: v.sku, barcode: v.barcode ?? '' })) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // izinkan pilih file sama lagi setelah hapus
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type))
      return setError('Format gambar harus JPG, PNG, atau WEBP.');
    if (file.size > 2 * 1024 * 1024) return setError('Ukuran gambar maksimal 2 MB.');

    setError(null);
    setUploading(true);
    try {
      setImageUrl(await uploadProductImage(file));
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal mengunggah gambar.'));
    } finally {
      setUploading(false);
    }
  }

  function addVariant() {
    setVariants((v) => [...v, { name: '', sku: '', barcode: '' }]);
  }
  function updateVariant(i: number, patch: Partial<ProductVariantInput>) {
    setVariants((v) => v.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removeVariant(i: number) {
    setVariants((v) => v.filter((_, idx) => idx !== i));
  }

  async function handleSubmit() {
    setError(null);
    if (!name.trim()) return setError('Nama produk wajib diisi.');
    if (!isEdit && !sku.trim()) return setError('SKU wajib diisi.');
    if (imageUrl && !/^(https?:\/\/|\/uploads\/)/i.test(imageUrl))
      return setError('Gambar tidak valid. Unggah ulang gambar.');
    if (hasVariants) {
      const clean = variants.filter((v) => v.name.trim() || v.sku.trim());
      if (clean.length === 0)
        return setError('Produk dengan varian harus punya minimal 1 varian.');
      if (clean.some((v) => !v.name.trim() || !v.sku.trim()))
        return setError('Setiap varian wajib punya nama dan SKU.');
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(product!.id, {
          name: name.trim(),
          barcode: barcode.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          unit: unit.trim() || undefined,
          categoryId: categoryId || undefined,
          status,
        });
        toastSuccess('Produk berhasil diperbarui');
      } else {
        await createProduct({
          name: name.trim(),
          sku: sku.trim(),
          barcode: barcode.trim() || undefined,
          description: description.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          unit: unit.trim() || undefined,
          categoryId: categoryId || undefined,
          hasVariants,
          variants: hasVariants
            ? variants
                .filter((v) => v.name.trim() && v.sku.trim())
                .map((v) => ({
                  name: v.name.trim(),
                  sku: v.sku.trim(),
                  barcode: v.barcode?.trim() || undefined,
                }))
            : undefined,
        });
        toastSuccess('Produk berhasil ditambahkan');
      }
      onSaved();
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menyimpan produk.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton
        className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl p-0"
      >
        {/* Header */}
        <DialogHeader className="border-b border-emerald-100 px-6 py-5">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <FilePenLine className="size-5 text-emerald-600" />
            {isEdit ? 'Edit Produk' : 'Tambah Produk'}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div>
            <Label htmlFor="p-name" className="mb-2">
              Nama produk
            </Label>
            <Input
              id="p-name"
              className="h-10"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-sku" className="mb-2">
                SKU {isEdit && '(tidak bisa diubah)'}
              </Label>
              <div className="relative">
                <Input
                  id="p-sku"
                  value={sku}
                  disabled={isEdit}
                  onChange={(e) => setSku(e.target.value)}
                  className={`h-10 ${isEdit ? 'italic pr-9' : ''}`}
                />
                {isEdit && (
                  <Lock className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="p-barcode" className="mb-2">
                Barcode
              </Label>
              <Input
                id="p-barcode"
                className="h-10"
                placeholder="Masukkan barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="p-unit" className="mb-2">
                Satuan
              </Label>
              <Input
                id="p-unit"
                className="h-10"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="p-cat" className="mb-2">
                Kategori
              </Label>
              <div className="relative">
                <select
                  id="p-cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm"
                >
                  <option value="">Tanpa kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
              </div>
            </div>
          </div>

          <div>
            <Label className="mb-2">Gambar produk (opsional)</Label>
            <div className="flex items-start gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-4">
              {/* Preview */}
              <div className="size-24 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white flex items-center justify-center">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(imageUrl) ?? ''}
                    alt="Preview"
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageOff className="size-7 text-gray-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handlePickImage}
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {uploading ? 'Mengunggah…' : 'Pilih gambar'}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={uploading}
                      onClick={() => setImageUrl('')}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="size-4" />
                      Hapus
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">JPG, PNG, atau WEBP. Maks 2 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc" className="mb-2">
              Deskripsi (opsional)
            </Label>
            <textarea
              id="p-desc"
              rows={3}
              placeholder="Tambahkan rincian produk…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 resize-y"
            />
          </div>

          {/* Status — hanya saat edit. Nonaktif menyembunyikan produk dari POS. */}
          {isEdit && (
            <div>
              <Label htmlFor="p-status" className="mb-2">
                Status
              </Label>
              <div className="relative">
                <select
                  id="p-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm"
                >
                  <option value="ACTIVE">Aktif</option>
                  <option value="INACTIVE">Nonaktif</option>
                  {status === 'DELETED' && (
                    <option value="DELETED" disabled>
                      Dihapus
                    </option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-emerald-600" />
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-400">
                <Info className="size-3.5" />
                Produk nonaktif disembunyikan dari katalog kasir (POS).
              </p>
            </div>
          )}

          {/* Varian — hanya saat tambah (kontrak PATCH tak mengelola varian) */}
          {!isEdit && (
            <div className="rounded-xl border border-gray-100 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                />
                Produk memiliki varian (size, warna, dll)
              </label>

              {hasVariants && (
                <div className="mt-3 space-y-2">
                  {variants.map((v, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Nama varian"
                        value={v.name}
                        onChange={(e) => updateVariant(i, { name: e.target.value })}
                      />
                      <Input
                        placeholder="SKU"
                        value={v.sku}
                        onChange={(e) => updateVariant(i, { sku: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeVariant(i)}
                        title="Hapus varian"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addVariant}>
                    <Plus className="size-3.5" />
                    Tambah varian
                  </Button>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving || uploading}>
            Batal
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={saving || uploading}>
            <Save className="size-4" />
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
