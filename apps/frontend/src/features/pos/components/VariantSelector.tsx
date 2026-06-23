'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { IDR } from '@/lib/format';
import type { Product } from '../types';

interface VariantSelectorProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectVariant: (productId: string, variantId: string | null, name: string, price: number, stock: number) => void;
}

export function VariantSelector({
  product,
  open,
  onOpenChange,
  onSelectVariant,
}: VariantSelectorProps) {
  const hasVariants = product.hasVariants && product.variants.length > 0;

  const handleSelect = (variantId: string | null, name: string, price: number, stock: number) => {
    const displayName = variantId ? `${product.name} - ${name}` : product.name;
    onSelectVariant(product.id, variantId, displayName, price, stock);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            Pilih Varian • {product.name}
          </DialogTitle>
        </DialogHeader>

        {!hasVariants ? (
          // Produk tanpa varian
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <p className="font-medium text-emerald-900">{product.name}</p>
              <p className="text-emerald-700 font-bold text-lg mt-1">
                {IDR.format(product.price)}
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                Stok: {product.stock}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-emerald-700 hover:bg-emerald-800"
                onClick={() =>
                  handleSelect(null, product.name, product.price, product.stock)
                }
              >
                Tambah
              </Button>
            </div>
          </div>
        ) : (
          // Produk dengan varian
          <div className="space-y-3 py-2 max-h-[50vh] overflow-y-auto">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => handleSelect(v.id, v.name, v.price, v.stock)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{v.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Stok: {v.stock}</p>
                  </div>
                  <p className="font-bold text-emerald-700">
                    {IDR.format(v.price)}
                  </p>
                </div>
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1 bg-emerald-700 hover:bg-emerald-800"
                onClick={() =>
                  handleSelect(product.variants[0].id, product.variants[0].name, product.variants[0].price, product.variants[0].stock)
                }
              >
                Tambah
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
