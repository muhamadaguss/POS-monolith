'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 * - "Cetak / PDF" via window.print() — universal, jalan offline.
 * - "Printer Thermal" via Web Bluetooth — hanya tampil bila didukung.
 *
 * Area cetak (#receipt-print-area) DI-PORTAL ke document.body, BUKAN di dalam
 * dialog. Sebabnya: DialogContent base-ui memusatkan diri dengan
 * position:fixed + top/left 50% sehingga menjadi containing block yang
 * menggeser elemen cetak. Dengan mem-portal struk-cetak langsung ke body, CSS
 * @media print bisa menempatkannya tepat di sudut kertas tanpa melawan styling
 * dialog. Pratinjau di dalam dialog memakai <Receipt> terpisah (tanpa id cetak).
 */
export function ReceiptDialog({ open, onOpenChange, data }: ReceiptDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  // Ref ke struk PRATINJAU (yang terlihat di layar) untuk mengukur tinggi.
  // Tidak mengukur node portal cetak karena itu display:none (scrollHeight=0).
  const previewRef = useRef<HTMLDivElement>(null);
  const thermalSupported = isThermalSupported();

  if (!data) return null;

  /**
   * Cetak via window.print() dengan tinggi kertas mengikuti isi struk.
   * Chromium hanya menghormati ukuran @page yang eksplisit (bukan `auto`), jadi
   * kita ukur tinggi area cetak (px → mm) lalu set `@page size: 80mm <h>mm`
   * tepat sebelum print, dan membersihkannya setelah dialog print tertutup.
   * Hasil: PDF 80mm tanpa ruang kosong di bawah, berapapun jumlah item.
   */
  function printReceipt() {
    const PX_PER_MM = 96 / 25.4; // 1mm pada 96dpi
    // Ukur dari pratinjau yang TERLIHAT (previewRef). Node portal cetak tidak
    // bisa diukur karena display:none → scrollHeight 0 → tinggi @page salah →
    // konten pecah jadi banyak halaman. Tambah margin bawah agar tak terpotong.
    const px = previewRef.current?.scrollHeight ?? 0;
    const heightMm = px > 0 ? Math.ceil(px / PX_PER_MM) + 4 : 200;

    const style = document.createElement('style');
    style.id = 'receipt-page-size';
    style.textContent = `@page { size: 80mm ${heightMm}mm; margin: 0; }`;
    document.head.appendChild(style);

    const cleanup = () => {
      document.getElementById('receipt-page-size')?.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    window.print();
  }

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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-gray-900">
              <Printer className="h-5 w-5 text-emerald-600" />
              Struk Transaksi
            </DialogTitle>
          </DialogHeader>

          {/* Pratinjau struk di layar (tanpa id cetak; hanya tampilan).
           * previewRef pada pembungkus <Receipt> dipakai mengukur tinggi cetak. */}
          <div className="max-h-[55vh] overflow-y-auto bg-gray-100 px-4 py-4 print:hidden">
            <div ref={previewRef} className="shadow-sm">
              <Receipt data={data} />
            </div>
          </div>

          {/* Aksi — tak ikut tercetak (print:hidden). */}
          <div className="flex flex-col gap-2 px-6 py-4 print:hidden">
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={printReceipt}
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

      {/* Area cetak sebenarnya — di-portal ke body, hanya muncul saat @media print. */}
      {createPortal(
        <div className="receipt-print-root">
          <Receipt data={data} forPrint />
        </div>,
        document.body,
      )}
    </>
  );
}
