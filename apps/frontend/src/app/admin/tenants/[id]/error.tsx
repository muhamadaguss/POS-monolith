'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Error boundary segmen Detail Tenant. */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-sm font-medium text-gray-900">Gagal memuat detail tenant</p>
      <p className="text-xs text-gray-400 mt-1">Terjadi kesalahan saat mengambil data.</p>
      <div className="flex items-center gap-2 mt-4">
        <Button onClick={reset} variant="outline" className="rounded-xl">
          Coba lagi
        </Button>
        <Link href="/admin/tenants">
          <Button variant="outline" className="rounded-xl">
            Kembali
          </Button>
        </Link>
      </div>
    </div>
  );
}
