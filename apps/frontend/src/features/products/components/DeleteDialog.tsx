'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deleteProduct, apiErrorMessage } from '@/features/products/api';
import { toastSuccess, errorAlert } from '@/lib/swal';
import type { ProductListItem } from '@/features/products/types';

export function DeleteDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: ProductListItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      onDeleted();
      toastSuccess('Produk berhasil dihapus');
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menghapus produk.'));
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>Hapus produk?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">{product.name}</span> akan dihapus. Jika sudah pernah ada
          transaksi, produk hanya dinonaktifkan dari katalog (status menjadi “Dihapus”) demi menjaga
          integritas riwayat.
        </p>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            Batal
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Menghapus…' : 'Hapus'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
