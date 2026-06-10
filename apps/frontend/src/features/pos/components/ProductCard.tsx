'use client';

import { useState } from 'react';
import { resolveImageUrl } from '@/features/products/api';
import { IDR, getInitials } from '@/lib/format';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAdd: (product: Product) => void;
}

export function ProductCard({ product, onAdd }: ProductCardProps) {
  const outOfStock = product.stock === 0;
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = imgFailed ? null : resolveImageUrl(product.imageUrl ?? null);

  return (
    <div
      role={outOfStock ? undefined : 'button'}
      tabIndex={outOfStock ? undefined : 0}
      onClick={() => !outOfStock && onAdd(product)}
      onKeyDown={(e) => { if (!outOfStock && (e.key === 'Enter' || e.key === ' ')) onAdd(product); }}
      className={`group bg-white p-2 rounded-xl border border-gray-200 shadow-sm transition-all
        ${outOfStock
          ? 'opacity-60 grayscale cursor-not-allowed'
          : 'hover:shadow-md hover:border-emerald-500 active:scale-[0.98] cursor-pointer'
        }`}
    >
      {/* Image area */}
      <div className="aspect-square rounded-lg bg-gray-100 mb-2 overflow-hidden relative">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.name}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-black text-gray-300 select-none">
              {getInitials(product.name)}
            </span>
          </div>
        )}

        {/* Out of stock overlay */}
        {outOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
            <span className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase tracking-wider">
              Habis
            </span>
          </div>
        )}

        {/* Stock badge — only when in stock */}
        {!outOfStock && (
          <div className="absolute bottom-1 right-1 bg-emerald-700/90 text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
            STOK: {product.stock}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1 mb-1">
          {product.name}
        </h3>
        <p className="text-base font-bold text-emerald-700">
          {IDR.format(product.price)}
        </p>
      </div>
    </div>
  );
}
