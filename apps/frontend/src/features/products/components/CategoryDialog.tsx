'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  apiErrorMessage,
} from '@/features/products/api';
import { toastSuccess, errorAlert, confirmDialog } from '@/lib/swal';
import type { Category } from '@/features/products/types';

export function CategoryDialog({
  categories,
  onClose,
  onChanged,
}: {
  categories: Category[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#10b981');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function startEdit(c: Category) {
    setEditingId(c.id);
    setName(c.name);
    setColor(c.color ?? '#10b981');
  }
  function reset() {
    setEditingId(null);
    setName('');
    setColor('#10b981');
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError('Nama kategori wajib diisi.');
    setSaving(true);
    try {
      if (editingId) {
        await updateCategory(editingId, { name: name.trim(), color });
        toastSuccess('Kategori berhasil diperbarui');
      } else {
        await createCategory({ name: name.trim(), color });
        toastSuccess('Kategori berhasil ditambahkan');
      }
      reset();
      onChanged();
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menyimpan kategori.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Category) {
    const ok = await confirmDialog({
      title: 'Hapus kategori?',
      text: `Kategori "${c.name}" akan dihapus.`,
      danger: true,
      confirmText: 'Ya, hapus',
    });
    if (!ok) return;
    setError(null);
    try {
      await deleteCategory(c.id);
      onChanged();
      toastSuccess('Kategori berhasil dihapus');
    } catch (err) {
      errorAlert(apiErrorMessage(err, 'Gagal menghapus kategori.'));
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Kelola Kategori</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {categories.length === 0 && (
            <p className="text-sm text-gray-400">Belum ada kategori.</p>
          )}
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/50 px-3 py-2"
            >
              <span
                className="size-3 rounded-full shrink-0"
                style={{ backgroundColor: c.color ?? '#6b7280' }}
              />
              <span className="flex-1 text-sm text-gray-800">{c.name}</span>
              <span className="text-xs text-gray-400">{c.productCount} produk</span>
              <Button variant="ghost" size="icon-sm" onClick={() => startEdit(c)} title="Edit">
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleDelete(c)}
                title="Hapus"
                disabled={c.productCount > 0}
              >
                <Trash2 className="size-4 text-red-500" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 p-3 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            {editingId ? 'Edit kategori' : 'Tambah kategori'}
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="c-name">Nama</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="c-color">Warna</Label>
              <input
                id="c-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-1"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            {editingId && (
              <Button variant="outline" size="sm" onClick={reset}>
                Batal edit
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Menyimpan…' : editingId ? 'Simpan' : 'Tambah'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
