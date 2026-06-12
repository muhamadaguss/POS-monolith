'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Error boundary segmen Riwayat Shift (gantikan try/catch kosong lama). */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-sm font-medium text-gray-900">Gagal memuat riwayat shift</p>
      <p className="text-xs text-gray-400 mt-1">Terjadi kesalahan saat mengambil data.</p>
      <Button onClick={reset} variant="outline" className="rounded-xl mt-4">
        Coba lagi
      </Button>
    </div>
  );
}
