'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, FileText, Bluetooth } from 'lucide-react';
import { toastSuccess, errorAlert } from '@/lib/swal';
import { Receipt } from './Receipt';
import { isThermalSupported, printThermal } from '../escpos';
import type { ReceiptData } from '../types';

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
}

/**
 * Modal pratinjau struk + aksi cetak. Dua jalur cetak:
 * - "Cetak / PDF" via window.print() — universal, jalan offline (CSS @media print
 *   mengisolasi #receipt-print-area; lihat globals.css).
 * - "Printer Thermal" via Web Bluetooth — hanya tampil bila didukung.
 */
export function ReceiptDialog({ open, onOpenChange, data }: ReceiptDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const thermalSupported = isThermalSupported();

  if (!data) return null;

  async function handleThermal() {
    if (!data || isPrinting) return;
    setIsPrinting(true);
    try {
      await printThermal(data);
      toastSuccess('Struk dikirim ke printer');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mencetak ke printer thermal';
      // Pengguna membatalkan pemilihan perangkat bukan error yang perlu dialog merah.
      if (!/cancel|user/i.test(msg)) errorAlert(msg, 'Cetak Thermal Gagal');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Printer className="h-5 w-5 text-emerald-600" />
            Struk Transaksi
          </DialogTitle>
        </DialogHeader>

        {/* Pratinjau struk (area yang dicetak window.print) */}
        <div className="max-h-[55vh] overflow-y-auto bg-gray-100 px-4 py-4">
          <div className="shadow-sm">
            <Receipt data={data} />
          </div>
        </div>

        {/* Aksi — disembunyikan saat mencetak (agar tak ikut tertangkap print) */}
        <div className="receipt-actions flex flex-col gap-2 px-6 py-4">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => window.print()}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold"
            >
              <FileText className="mr-1 h-4 w-4" /> Cetak / PDF
            </Button>
            {thermalSupported && (
              <Button
                type="button"
                variant="outline"
                onClick={handleThermal}
                disabled={isPrinting}
                className="flex-1 h-11 rounded-xl"
              >
                <Bluetooth className="mr-1 h-4 w-4" />
                {isPrinting ? 'Mencetak…' : 'Thermal'}
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl text-gray-500"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
