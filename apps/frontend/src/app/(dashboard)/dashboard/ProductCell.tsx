'use client';

import { useState } from 'react';
import { resolveImageUrl } from '@/features/products/api';

// Avatar inisial produk — fallback bila produk tak punya gambar (warna deterministik).
const PRODUCT_AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
];

function productAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PRODUCT_AVATAR_COLORS[hash % PRODUCT_AVATAR_COLORS.length];
}

function productInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Sel produk: gambar bila ada (fallback ke avatar inisial saat null/gagal muat).
 * Client Component karena butuh state `failed` untuk onError gambar.
 */
export function ProductCell({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? null : resolveImageUrl(imageUrl);
  return (
    <div className="flex items-center gap-3 min-w-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar kecil, src dinamis dari backend
        <img
          src={src}
          alt={name}
          onError={() => setFailed(true)}
          className="w-9 h-9 rounded-lg object-cover shrink-0 bg-gray-100"
        />
      ) : (
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${productAvatarColor(
            name,
          )}`}
        >
          {productInitials(name)}
        </div>
      )}
      <span className="font-medium text-gray-900 truncate">{name}</span>
    </div>
  );
}
