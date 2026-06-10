import Swal from 'sweetalert2';

// Helper SweetAlert terpusat agar gaya notifikasi konsisten di seluruh app.
// Warna mengikuti brand Kasirku (emerald).

const BRAND = '#059669'; // emerald-600
const DANGER = '#dc2626'; // red-600

/** Toast kecil auto-close di pojok kanan atas (sukses create/update). */
export function toastSuccess(title: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
}

/** Toast info ringkas (mis. "Disalin"). */
export function toastInfo(title: string): void {
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title,
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
  });
}

/** Modal error di tengah — untuk kegagalan operasi. */
export function errorAlert(message: string, title = 'Gagal'): void {
  Swal.fire({
    icon: 'error',
    title,
    text: message,
    confirmButtonColor: BRAND,
    confirmButtonText: 'Tutup',
  });
}

/** Modal sukses di tengah (klik OK) — untuk aksi penting yang perlu ditegaskan. */
export function successAlert(message: string, title = 'Berhasil'): void {
  Swal.fire({
    icon: 'success',
    title,
    text: message,
    confirmButtonColor: BRAND,
    confirmButtonText: 'OK',
  });
}

interface ConfirmOptions {
  title?: string;
  text?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean; // tombol konfirmasi merah (aksi destruktif)
}

/** Dialog konfirmasi (mis. sebelum hapus). Resolusi true bila pengguna setuju. */
export async function confirmDialog(opts: ConfirmOptions = {}): Promise<boolean> {
  const result = await Swal.fire({
    icon: opts.danger ? 'warning' : 'question',
    title: opts.title ?? 'Anda yakin?',
    text: opts.text,
    showCancelButton: true,
    confirmButtonText: opts.confirmText ?? 'Ya, lanjutkan',
    cancelButtonText: opts.cancelText ?? 'Batal',
    confirmButtonColor: opts.danger ? DANGER : BRAND,
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
  });
  return result.isConfirmed;
}

interface VoidPromptResult {
  voidReason: string;
  managerPin: string;
}

/**
 * Dialog khusus void transaksi: minta alasan (wajib) + PIN manager 6 digit.
 * Mengembalikan null bila dibatalkan. Validasi dilakukan di preConfirm agar
 * pengguna tidak bisa lanjut dengan input kosong/PIN bukan 6 digit.
 */
export async function voidTransactionPrompt(
  receiptNumber: string,
): Promise<VoidPromptResult | null> {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Batalkan transaksi?',
    html: `
      <p style="font-size:13px;color:#6b7280;margin:0 0 14px">
        Struk <b>${receiptNumber}</b> akan dibatalkan dan stok dikembalikan.
        Tindakan ini tidak dapat diurungkan.
      </p>
      <input id="void-reason" class="swal2-input" style="margin:0 0 10px"
        placeholder="Alasan pembatalan" maxlength="120" />
      <input id="void-pin" type="password" class="swal2-input" style="margin:0"
        placeholder="PIN Manager (6 digit)" inputmode="numeric"
        autocomplete="off" maxlength="6" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Batalkan Transaksi',
    cancelButtonText: 'Tutup',
    confirmButtonColor: DANGER,
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    didOpen: () => {
      // Batasi PIN ke angka saja.
      const pin = document.getElementById('void-pin') as HTMLInputElement | null;
      pin?.addEventListener('input', () => {
        pin.value = pin.value.replace(/\D/g, '').slice(0, 6);
      });
      (document.getElementById('void-reason') as HTMLInputElement | null)?.focus();
    },
    preConfirm: () => {
      const voidReason = (
        document.getElementById('void-reason') as HTMLInputElement
      ).value.trim();
      const managerPin = (
        document.getElementById('void-pin') as HTMLInputElement
      ).value.trim();
      if (!voidReason) {
        Swal.showValidationMessage('Alasan pembatalan wajib diisi');
        return false;
      }
      if (managerPin.length !== 6) {
        Swal.showValidationMessage('PIN manager harus 6 digit');
        return false;
      }
      return { voidReason, managerPin };
    },
  });
  return result.isConfirmed ? (result.value as VoidPromptResult) : null;
}

interface RefundPromptResult {
  refundReason: string;
  managerPin: string;
}

/**
 * Dialog khusus refund transaksi: minta alasan (wajib) + PIN manager 6 digit.
 * Pola identik dengan void; bedanya transaksi menjadi REFUNDED (bukan VOIDED).
 */
export async function refundTransactionPrompt(
  receiptNumber: string,
): Promise<RefundPromptResult | null> {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Refund transaksi?',
    html: `
      <p style="font-size:13px;color:#6b7280;margin:0 0 14px">
        Struk <b>${receiptNumber}</b> akan di-refund dan stok dikembalikan.
        Tindakan ini tidak dapat diurungkan.
      </p>
      <input id="refund-reason" class="swal2-input" style="margin:0 0 10px"
        placeholder="Alasan refund" maxlength="120" />
      <input id="refund-pin" type="password" class="swal2-input" style="margin:0"
        placeholder="PIN Manager (6 digit)" inputmode="numeric"
        autocomplete="off" maxlength="6" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Refund Transaksi',
    cancelButtonText: 'Tutup',
    confirmButtonColor: BRAND,
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    didOpen: () => {
      const pin = document.getElementById('refund-pin') as HTMLInputElement | null;
      pin?.addEventListener('input', () => {
        pin.value = pin.value.replace(/\D/g, '').slice(0, 6);
      });
      (document.getElementById('refund-reason') as HTMLInputElement | null)?.focus();
    },
    preConfirm: () => {
      const refundReason = (
        document.getElementById('refund-reason') as HTMLInputElement
      ).value.trim();
      const managerPin = (
        document.getElementById('refund-pin') as HTMLInputElement
      ).value.trim();
      if (!refundReason) {
        Swal.showValidationMessage('Alasan refund wajib diisi');
        return false;
      }
      if (managerPin.length !== 6) {
        Swal.showValidationMessage('PIN manager harus 6 digit');
        return false;
      }
      return { refundReason, managerPin };
    },
  });
  return result.isConfirmed ? (result.value as RefundPromptResult) : null;
}
