/**
 * Cetak struk ke printer thermal (58/80mm) lewat Web Bluetooth, protokol ESC/POS.
 *
 * Dipisah menjadi dua lapis agar mudah diuji:
 * - `buildEscPosReceipt(data)` — MURNI: menyusun byte ESC/POS dari ReceiptData.
 * - `printThermal(data)`       — EFEK: minta device Bluetooth, connect, kirim byte.
 *
 * Catatan: dukungan bergantung perangkat & browser (Chrome/Android punya Web
 * Bluetooth; iOS Safari tidak). Pemanggil harus cek `isThermalSupported()` dulu
 * dan menyembunyikan tombol bila tak didukung. Jalur cetak utama tetap PDF/
 * window.print() yang universal.
 */
import { toNum } from '@/lib/format';
import type { ReceiptData } from './types';

// Tipe minimal Web Bluetooth yang dipakai (hindari dependency @types/web-bluetooth).
// Hanya member yang benar-benar dipanggil yang dideklarasikan.
interface BluetoothLike {
  requestDevice(options: {
    filters: { services: number[] }[];
    optionalServices?: number[];
  }): Promise<{
    gatt?: {
      connect(): Promise<{
        getPrimaryService(service: number): Promise<{
          getCharacteristic(characteristic: number): Promise<{
            writeValueWithoutResponse(value: BufferSource): Promise<void>;
          }>;
        }>;
        disconnect(): void;
      }>;
    };
  }>;
}

function getBluetooth(): BluetoothLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth;
}

/** True bila Web Bluetooth tersedia di lingkungan ini. */
export function isThermalSupported(): boolean {
  return getBluetooth() !== undefined;
}

// ── ESC/POS command bytes ─────────────────────────────────────────────────────
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const INIT = [ESC, 0x40]; // ESC @  — reset printer
const ALIGN_LEFT = [ESC, 0x61, 0x00];
const ALIGN_CENTER = [ESC, 0x61, 0x01];
const BOLD_ON = [ESC, 0x45, 0x01];
const BOLD_OFF = [ESC, 0x45, 0x00];
const CUT = [GS, 0x56, 0x42, 0x00]; // GS V B 0 — partial cut

const LINE_WIDTH = 32; // karakter per baris untuk kertas 58mm (font A)

/** Format Rupiah ringkas tanpa simbol untuk struk thermal (lebar terbatas). */
function rupiah(value: number | string): string {
  return toNum(value).toLocaleString('id-ID');
}

/** Baris dua kolom: label di kiri, nilai rata kanan, dipadkan ke LINE_WIDTH. */
function twoCol(left: string, right: string): string {
  const space = Math.max(1, LINE_WIDTH - left.length - right.length);
  return left + ' '.repeat(space) + right;
}

const DIVIDER = '-'.repeat(LINE_WIDTH);

/**
 * Susun byte ESC/POS lengkap untuk satu struk. Mengembalikan Uint8Array siap
 * kirim. Fungsi murni — tidak menyentuh Bluetooth/DOM (mudah diuji).
 */
export function buildEscPosReceipt(data: ReceiptData): Uint8Array {
  const bytes: number[] = [];
  const enc = new TextEncoder();
  const text = (s: string) => bytes.push(...enc.encode(s));
  const newline = () => bytes.push(LF);
  const cmd = (arr: number[]) => bytes.push(...arr);

  cmd(INIT);

  // Header — outlet (tengah, tebal untuk nama)
  cmd(ALIGN_CENTER);
  cmd(BOLD_ON);
  text(data.outlet.name);
  newline();
  cmd(BOLD_OFF);
  if (data.outlet.address) {
    text(data.outlet.address);
    newline();
  }
  if (data.outlet.city) {
    text(data.outlet.city);
    newline();
  }
  if (data.outlet.phone) {
    text(`Telp: ${data.outlet.phone}`);
    newline();
  }

  // Info transaksi (kiri)
  cmd(ALIGN_LEFT);
  text(DIVIDER);
  newline();
  text(`No: ${data.receiptNumber}`);
  newline();
  text(new Date(data.createdAt).toLocaleString('id-ID'));
  newline();
  if (data.cashier?.name) {
    text(`Kasir: ${data.cashier.name}`);
    newline();
  }
  text(DIVIDER);
  newline();

  // Item
  for (const item of data.items) {
    const name = item.variantName
      ? `${item.productName} (${item.variantName})`
      : item.productName;
    text(name);
    newline();
    const qty = toNum(item.quantity);
    const left = `  ${qty} x ${rupiah(item.unitPrice)}`;
    text(twoCol(left, rupiah(item.subtotal)));
    newline();
  }

  // Total
  text(DIVIDER);
  newline();
  text(twoCol('Subtotal', rupiah(data.subtotal)));
  newline();
  if (toNum(data.discountAmount) > 0) {
    text(twoCol('Diskon', `-${rupiah(data.discountAmount)}`));
    newline();
  }
  if (toNum(data.taxAmount) > 0) {
    text(twoCol('Pajak', rupiah(data.taxAmount)));
    newline();
  }
  cmd(BOLD_ON);
  text(twoCol('TOTAL', rupiah(data.totalAmount)));
  newline();
  cmd(BOLD_OFF);
  text(twoCol('Bayar', rupiah(data.amountPaid)));
  newline();
  text(twoCol('Kembali', rupiah(data.changeAmount)));
  newline();

  // Footer
  if (data.outlet.receiptNote) {
    cmd(ALIGN_CENTER);
    text(DIVIDER);
    newline();
    text(data.outlet.receiptNote);
    newline();
  }
  newline();
  newline();
  cmd(CUT);

  return new Uint8Array(bytes);
}

// Service UUID printer thermal generik (Serial Port Profile umum di modul HM-10/RS).
const PRINTER_SERVICE = 0x18f0;
const PRINTER_CHARACTERISTIC = 0x2af1;

/**
 * Cetak ke printer thermal Bluetooth. Melempar Error bila tak didukung atau
 * pengguna membatalkan pemilihan perangkat — pemanggil menampilkan pesan ramah.
 * Mengirim dalam potongan 512 byte agar tak melebihi batas MTU karakteristik.
 */
export async function printThermal(data: ReceiptData): Promise<void> {
  const bluetooth = getBluetooth();
  if (!bluetooth) {
    throw new Error('Perangkat ini tidak mendukung cetak Bluetooth');
  }

  const device = await bluetooth.requestDevice({
    filters: [{ services: [PRINTER_SERVICE] }],
    optionalServices: [PRINTER_SERVICE],
  });

  const server = await device.gatt!.connect();
  try {
    const service = await server.getPrimaryService(PRINTER_SERVICE);
    const characteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC);

    const payload = buildEscPosReceipt(data);
    const CHUNK = 512;
    for (let offset = 0; offset < payload.length; offset += CHUNK) {
      await characteristic.writeValueWithoutResponse(payload.slice(offset, offset + CHUNK));
    }
  } finally {
    server.disconnect();
  }
}
