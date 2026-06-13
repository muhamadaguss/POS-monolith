"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePageFocus } from "@/hooks/usePageFocus";
import {
  Search,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Package,
  Pencil,
  Trash2,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuthStore, useAuthHydrated } from "@/features/auth/store";
import { proactiveRefresh } from "@/lib/api";
import { getInventory, createStockAdjustment } from "@/features/inventory/api";
import { resolveImageUrl } from "@/features/products/api";
import { toastSuccess, errorAlert } from "@/lib/swal";
import type { InventoryItem } from "@/features/inventory/api";

const CATEGORIES = ["Semua", "Minuman", "Makanan", "Snack"];
const PAGE_SIZE = 10;

type SortKey = "name" | "quantity";
type SortDir = "asc" | "desc";

function CategoryBadge({ category }: { category: string }) {
  const colorMap: Record<string, string> = {
    Minuman: "bg-blue-100 text-blue-700",
    Makanan: "bg-amber-100 text-amber-700",
    Snack: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`px-3 py-1 text-xs font-medium rounded-full ${colorMap[category] ?? "bg-gray-100 text-gray-600"}`}
    >
      {category}
    </span>
  );
}

function StockStatusBadge({
  quantity,
  minStock,
}: {
  quantity: number;
  minStock: number;
}) {
  if (quantity === 0) {
    return (
      <span className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
        Habis
      </span>
    );
  }
  if (quantity <= minStock) {
    return (
      <span className="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
        Stok Rendah
      </span>
    );
  }
  return (
    <span className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
      Tersedia
    </span>
  );
}

function ProductThumbnail({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveImageUrl(imageUrl);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- thumbnail kecil, src dinamis dari backend
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className="w-10 h-10 rounded-lg object-cover shrink-0 bg-gray-100"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
      <ImageOff className="w-4 h-4 text-gray-400" />
    </div>
  );
}

export default function InventoryPage() {
  const user = useAuthStore((s) => s.user);
  const outlets = useAuthStore((s) => s.outlets);
  const hydrated = useAuthHydrated();
  const isOwner = user?.role === "TENANT_OWNER";

  const [selectedOutletId, setSelectedOutletId] = useState<string>("");

  // Primitif stabil untuk dependency efek — objek user/outlets dibangun ulang
  // tiap render oleh shim, jadi tak boleh jadi dependency (memicu re-run).
  const currentOutletId = user?.currentOutletId ?? null;
  const firstOutletId = outlets[0]?.id ?? null;

  useEffect(() => {
    if (!hydrated) return;
    if (selectedOutletId) return;
    if (currentOutletId) {
      setSelectedOutletId(currentOutletId);
    } else if (isOwner && firstOutletId) {
      setSelectedOutletId(firstOutletId);
    }
  }, [hydrated, currentOutletId, firstOutletId, isOwner, selectedOutletId]);

  const outletId = selectedOutletId;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [showOpname, setShowOpname] = useState(false);
  const [opnameCounts, setOpnameCounts] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (q?: string, cat?: string) => {
      if (!outletId) {
        setIsLoading(false);
        return;
      }
      await proactiveRefresh().catch(() => {});
      setIsLoading(true);
      try {
        const data = await getInventory(
          outletId,
          q,
          cat === "Semua" ? undefined : cat,
        );
        setItems(data);
      } finally {
        setIsLoading(false);
      }
    },
    [outletId],
  );

  useEffect(() => {
    setItems([]);
    load();
  }, [load]);
  usePageFocus(load);

  function handleSearch(val: string) {
    setSearch(val);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val, category), 300);
  }

  function handleCategory(cat: string) {
    setCategory(cat);
    setPage(1);
    load(search, cat);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const sorted = [...items].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    if (sortKey === "name")
      return a.productName.localeCompare(b.productName) * dir;
    if (sortKey === "quantity") return (a.quantity - b.quantity) * dir;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const lowStockCount = items.filter(
    (i) => i.quantity > 0 && i.quantity <= i.minStock,
  ).length;
  const outOfStockCount = items.filter((i) => i.quantity === 0).length;

  async function handleOpnameSubmit() {
    const itemsPayload = Object.entries(opnameCounts)
      .filter(([, v]) => v !== "")
      .map(([productId, v]) => ({ productId, physicalCount: parseInt(v, 10) }));
    if (itemsPayload.length === 0) return;
    setIsPending(true);
    try {
      await createStockAdjustment({ outletId, items: itemsPayload });
      setOpnameCounts({});
      setShowOpname(false);
      toastSuccess('Penyesuaian stok berhasil disimpan');
      load(search, category);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      errorAlert(msg ?? 'Gagal menyimpan penyesuaian stok');
    } finally {
      setIsPending(false);
    }
  }

  function buildPageNumbers(): (number | "...")[] {
    if (totalPages <= 5)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, "...", totalPages];
    if (page >= totalPages - 2)
      return [1, "...", totalPages - 2, totalPages - 1, totalPages];
    return [1, "...", page - 1, page, page + 1, "...", totalPages];
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventaris</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pantau dan kelola ketersediaan produk di seluruh outlet Anda secara
            real-time.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {isOwner && outlets.length > 0 && (
            <div className="relative">
              <select
                value={selectedOutletId}
                onChange={(e) => {
                  setSelectedOutletId(e.target.value);
                  setSearch("");
                  setCategory("Semua");
                  setPage(1);
                }}
                className="appearance-none pl-3 pr-8 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setShowOpname(true)}
            className="gap-2 rounded-xl border-gray-300 text-gray-600"
          >
            <ClipboardList className="w-4 h-4" />
            Stock Opname
          </Button>
        </div>
      </div>

      {/* Insight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Total Produk</p>
            <p className="text-3xl font-bold text-gray-900 mt-0.5">
              {isLoading ? "—" : items.length.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Stok Rendah</p>
            <p className="text-3xl font-bold text-orange-600 mt-0.5">
              {isLoading ? "—" : lowStockCount}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 text-red-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium">Produk Habis</p>
            <p className="text-3xl font-bold text-red-600 mt-0.5">
              {isLoading ? "—" : outOfStockCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari produk, SKU, atau kategori..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategory(cat)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                category === cat
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="sm:ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => load(search, category)}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="text-left px-6 py-4">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Produk
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">
                  SKU
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">
                  Kategori
                </th>
                <th className="text-right px-6 py-4">
                  <button
                    type="button"
                    onClick={() => toggleSort("quantity")}
                    className="ml-auto flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Stok Saat Ini
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500">
                  Status
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-16 text-sm text-gray-400"
                  >
                    Tidak ada produk ditemukan
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.quantity === 0
                        ? "bg-red-50/40 hover:bg-red-50/60"
                        : item.quantity <= item.minStock
                          ? "bg-amber-50/40 hover:bg-amber-50/60"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    {/* Produk + thumbnail */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ProductThumbnail name={item.productName} imageUrl={item.imageUrl} />
                        <span className="font-semibold text-gray-900">
                          {item.productName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-mono text-xs text-gray-400">{item.sku}</p>
                      {item.variantName && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.variantName}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <CategoryBadge category={item.categoryName} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-bold tabular-nums text-base ${
                          item.quantity === 0
                            ? "text-red-600"
                            : item.quantity <= item.minStock
                              ? "text-orange-600"
                              : "text-gray-900"
                        }`}
                      >
                        {item.quantity}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StockStatusBadge
                        quantity={item.quantity}
                        minStock={item.minStock}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: summary + pagination */}
        {!isLoading && (
          <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Menampilkan {Math.min(paginated.length, PAGE_SIZE)} dari{" "}
              {sorted.length} produk
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <div className="flex items-center gap-1">
                  {buildPageNumbers().map((n, i) =>
                    n === "..." ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-2 text-gray-400 text-sm"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setPage(n as number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === n
                            ? "bg-emerald-600 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stock Opname Dialog */}
      <Dialog open={showOpname} onOpenChange={setShowOpname}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Stock Opname</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Masukkan jumlah fisik produk. Kosongkan jika tidak berubah.
            </p>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.productName}
                  </p>
                  <p className="text-xs text-gray-400">
                    Sistem: {item.quantity} {item.unit}
                  </p>
                </div>
                <div className="w-28 shrink-0">
                  <Label
                    htmlFor={`opname-${item.productId}`}
                    className="sr-only"
                  >
                    Fisik
                  </Label>
                  <Input
                    id={`opname-${item.productId}`}
                    type="number"
                    min={0}
                    placeholder="Fisik"
                    value={opnameCounts[item.productId] ?? ""}
                    onChange={(e) =>
                      setOpnameCounts((prev) => ({
                        ...prev,
                        [item.productId]: e.target.value,
                      }))
                    }
                    className="h-9 text-right"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => setShowOpname(false)}
              className="flex-1 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleOpnameSubmit}
              disabled={
                isPending || Object.values(opnameCounts).every((v) => v === "")
              }
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                "Simpan Opname"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
