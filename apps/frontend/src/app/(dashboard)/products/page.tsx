'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Tag,
  DollarSign,
  ImageOff,
  ChevronLeft,
  ChevronRight,
  Package,
  Shapes,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/features/auth/store';
import { RequirePermission } from '@/features/auth/RequirePermission';
import { usePageFocus } from '@/hooks/usePageFocus';
import {
  listProducts,
  listCategories,
  resolveImageUrl,
  getProductStats,
} from '@/features/products/api';
import type {
  ProductListItem,
  ProductListResult,
  Category,
  ProductStatus,
} from '@/features/products/types';
import {
  StatusBadge,
  StatCard,
  ProductFormDialog,
  PriceDialog,
  CategoryDialog,
  DeleteDialog,
  PRODUCTS_PAGE_SIZE,
  rupiah,
  pageNumbers,
  ImportProductsModal,
} from '@/features/products/components';

const PAGE_SIZE = PRODUCTS_PAGE_SIZE;

function ProductsPageInner() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const permissions = useMemo(() => user?.permissions ?? [], [user]);

  const canManage = permissions.includes('product.manage');
  const canManagePrice = permissions.includes('price.manage');
  const isOwner = user?.role === 'TENANT_OWNER';
  const canDelete = isOwner; // backend: DELETE /products → Owner only

  // Outlet konteks untuk kolom harga. Owner pilih dari picker; lainnya pakai
  // currentOutletId. Kosong = harga tampil "—" (daftar produk tetap muncul).
  const [pickedOutletId, setPickedOutletId] = useState('');
  const outletId = isOwner
    ? pickedOutletId || outlets[0]?.id || ''
    : (user?.currentOutletId ?? '');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<ProductListResult | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<{ total: number; active: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [priceProduct, setPriceProduct] = useState<ProductListItem | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductListItem | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listProducts({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        status: statusFilter || undefined,
        outletId: outletId || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setData(result);
    } catch {
      // 401/refresh ditangani interceptor; jangan jadi unhandledRejection.
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, statusFilter, outletId, page]);

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listCategories());
    } catch {
      /* abaikan */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStats(
        await getProductStats({
          search: search || undefined,
          categoryId: categoryFilter || undefined,
          status: statusFilter || undefined,
        }),
      );
    } catch {
      /* abaikan */
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  usePageFocus(() => {
    load();
    loadCategories();
    loadStats();
  });

  function onSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  // Debounce input → setSearch sudah memicu load via dep; tapi kita debounce di UI level.
  const [searchInput, setSearchInput] = useState('');
  function handleSearchInput(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => onSearchChange(value), 300);
  }

  const items = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Katalog Produk
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-4">
            Kelola produk, varian, kategori &amp; harga per outlet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOwner && (
            <select
              value={outletId}
              onChange={(e) => {
                setPickedOutletId(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            >
              {outlets.length === 0 && <option value="">Tidak ada outlet</option>}
              {outlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          {canManage && (
            <Button variant="outline" size="lg" onClick={() => setCategoryDialogOpen(true)}>
              <Tag className="size-4" />
              Kategori
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="lg" onClick={() => setImportModalOpen(true)}>
              <Package className="size-4" />
              Import CSV
            </Button>
          )}
          {canManage && (
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" />
              Produk
            </Button>
          )}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Produk"
          value={stats?.total}
          icon={<Package className="size-6" />}
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Kategori"
          value={categories.length}
          icon={<Shapes className="size-6" />}
          tint="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Produk Aktif"
          value={stats?.active}
          icon={<CheckCircle2 className="size-6" />}
          tint="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Cari nama / SKU / barcode…"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all min-w-[140px]"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ProductStatus | '');
            setPage(1);
          }}
          className="h-9 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        >
          <option value="">Semua status</option>
          <option value="ACTIVE">Aktif</option>
          <option value="INACTIVE">Nonaktif</option>
          <option value="DELETED">Dihapus</option>
        </select>
        <Button variant="outline" size="icon-lg" onClick={() => load()} title="Muat ulang">
          <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabel */}
      <div className="relative rounded-2xl border border-gray-100/80 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm shadow-sm overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/60 to-emerald-500/20" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100/50 dark:border-gray-700/30 bg-gray-50/80 dark:bg-gray-800/50 text-left text-xs uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                <th className="px-4 py-3 font-medium">Produk</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Kategori</th>
                <th className="px-4 py-3 font-medium text-right">Harga jual</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && items.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100/50 dark:border-gray-700/30">
                    <td className="px-4 py-3" colSpan={6}>
                      <div className="h-4 w-48 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-3">
                        <Package className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada produk ditemukan.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100/50 dark:border-gray-700/30 hover:bg-emerald-50/20 dark:hover:bg-emerald-900/10 transition-colors duration-150">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-9 shrink-0 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={resolveImageUrl(p.imageUrl) ?? ''}
                              alt={p.name}
                              className="size-full object-cover"
                            />
                          ) : (
                            <ImageOff className="size-4 text-gray-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{p.name}</p>
                          {p.description ? (
                            <p className="text-xs text-gray-400 truncate">{p.description}</p>
                          ) : p.hasVariants ? (
                            <p className="text-xs text-gray-400">{p.variants.length} varian</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.sku}</td>
                    <td className="px-4 py-3">
                      {p.category ? (
                        <span
                          className="px-2.5 py-1 text-xs font-medium rounded-full"
                          style={{
                            backgroundColor: (p.category.color ?? '#6b7280') + '20',
                            color: p.category.color ?? '#6b7280',
                          }}
                        >
                          {p.category.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300">
                      {p.hasVariants ? (
                        <span className="text-xs text-gray-400">per varian</span>
                      ) : (
                        rupiah(p.sellPrice)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canManagePrice && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Harga per outlet"
                            onClick={() => setPriceProduct(p)}
                          >
                            <DollarSign className="size-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Edit"
                            onClick={() => {
                              setEditing(p);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Hapus"
                            onClick={() => setDeleteTarget(p)}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer + pagination */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-100/50 dark:border-gray-700/30 px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {meta && meta.total > 0
              ? `Menampilkan ${(meta.page - 1) * meta.limit + 1} – ${Math.min(
                  meta.page * meta.limit,
                  meta.total,
                )} dari ${meta.total.toLocaleString('id-ID')} produk`
              : ''}
          </span>
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </Button>
              {pageNumbers(meta.page, meta.totalPages).map((n, i) =>
                n === 'ellipsis' ? (
                  <span key={`e${i}`} className="px-2 text-gray-400">
                    …
                  </span>
                ) : (
                  <Button
                    key={n}
                    variant={n === meta.page ? 'default' : 'outline'}
                    size="icon-sm"
                    onClick={() => setPage(n)}
                    className="tabular-nums"
                  >
                    {n}
                  </Button>
                ),
              )}
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                title="Berikutnya"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {formOpen && (
        <ProductFormDialog
          open={formOpen}
          onClose={() => setFormOpen(false)}
          product={editing}
          categories={categories}
          onSaved={() => {
            setFormOpen(false);
            load();
            loadStats();
          }}
        />
      )}

      {priceProduct && (
        <PriceDialog
          product={priceProduct}
          outlets={outlets}
          canEdit={canManagePrice}
          onClose={() => setPriceProduct(null)}
          onSaved={() => load()}
        />
      )}

      {categoryDialogOpen && (
        <CategoryDialog
          categories={categories}
          onClose={() => setCategoryDialogOpen(false)}
          onChanged={() => {
            loadCategories();
            load();
          }}
        />
      )}

      {deleteTarget && (
        <DeleteDialog
          product={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            load();
            loadStats();
          }}
        />
      )}

      {importModalOpen && (
        <ImportProductsModal
          open={importModalOpen}
          onClose={() => setImportModalOpen(false)}
          onSuccess={() => {
            setImportModalOpen(false);
            load();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <RequirePermission
      anyOf={['product.manage']}
      message="Hanya pemilik bisnis (Owner) yang dapat mengelola katalog produk."
    >
      <ProductsPageInner />
    </RequirePermission>
  );
}
