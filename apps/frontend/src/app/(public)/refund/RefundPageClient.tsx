// ─────────────────────────────────────────────────────────────
// Refund Policy Client — /refund
// ─────────────────────────────────────────────────────────────
'use client';

import { PolicyLayout, SidebarNav } from '../policy-shared';

const sidebarSections = [
  { id: 'prinsip', label: 'Prinsip Umum' },
  { id: 'pengecualian', label: 'Pengecualian Refund' },
  { id: 'prosedur', label: 'Prosedur Pengajuan' },
  { id: 'waktu', label: 'Waktu Pemrosesan' },
  { id: 'pembatalan', label: 'Pembatalan Langganan' },
  { id: 'kontak', label: 'Kontak' },
];

export default function RefundPageClient() {
  return (
    <PolicyLayout
      title="Kebijakan Pengembalian Dana (Refund Policy)"
      description="Kami berkomitmen memberikan layanan terbaik. Berikut kebijakan pengembalian dana Kasirku."
      lastUpdated="15 November 2023"
    >
      <div className="flex gap-10">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <SidebarNav sections={sidebarSections} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <section id="prinsip">
            <h2>1. Prinsip Umum</h2>
            <p>
              Pembayaran langganan Kasirku bersifat <strong>final</strong> dan{' '}
              <strong>tidak dapat dikembalikan (non-refundable)</strong> setelah
              masa aktif langganan dimulai. Hal ini dikarenakan layanan Kasirku
              bersifat digital yang langsung dapat diakses dan digunakan setelah
              pembayaran terkonfirmasi.
            </p>
            <p>
              Kami menganjurkan Anda untuk memanfaatkan{' '}
              <strong>Paket Starter gratis</strong> untuk mengevaluasi Platform
              sebelum berkomitmen ke paket berbayar.
            </p>
          </section>

          <section id="pengecualian">
            <h2>2. Pengecualian — Kapan Refund Dipertimbangkan?</h2>
            <p>Dalam kondisi tertentu, kami akan mempertimbangkan pengembalian dana:</p>
            <ul>
              <li>
                <strong>Pembayaran Ganda (Double Charge):</strong> Jika sistem
                menagih lebih dari satu kali untuk periode yang sama karena
                kesalahan teknis.
              </li>
              <li>
                <strong>Kegagalan Aktivasi:</strong> Jika pembayaran sukses tetapi
                fitur premium tidak aktif dalam 1×24 jam.
              </li>
              <li>
                <strong>Kesalahan Sistem:</strong> Jika Platform mengalami
                downtime lebih dari 72 jam berturut-turut yang bukan disebabkan
                force majeure.
              </li>
            </ul>
          </section>

          <section id="prosedur">
            <h2>3. Prosedur Pengajuan Refund</h2>
            <p>Untuk mengajukan permintaan refund:</p>
            <ol className="list-decimal pl-5 space-y-2">
              <li>
                Kirim email ke <strong>support@kasirku.id</strong> dengan subjek:{' '}
                <em>&quot;Permohonan Refund - [ID Invoice]&quot;</em>
              </li>
              <li>Sertakan informasi:
                <ul className="list-disc pl-5 mt-1">
                  <li>Nama lengkap dan email terdaftar</li>
                  <li>ID Invoice atau Order ID Midtrans</li>
                  <li>Tanggal dan jumlah pembayaran</li>
                  <li>Alasan pengajuan refund (disertai bukti pendukung)</li>
                </ul>
              </li>
              <li>
                Tim kami akan meninjau permohonan Anda dalam waktu maksimal{' '}
                <strong>3 hari kerja</strong>.
              </li>
            </ol>
          </section>

          <section id="waktu">
            <h2>4. Waktu & Metode Pemrosesan</h2>
            <p>Jika permohonan refund disetujui:</p>
            <ul>
              <li><strong>Waktu Pemrosesan:</strong> 5–14 hari kerja setelah persetujuan.</li>
              <li><strong>Metode Pengembalian:</strong> Dana dikembalikan ke sumber dana awal.</li>
              <li><strong>Biaya Admin:</strong> Biaya administrasi payment gateway tidak dikembalikan.</li>
              <li><strong>Konfirmasi:</strong> Anda menerima email setelah dana dikirimkan.</li>
            </ul>
          </section>

          <section id="pembatalan">
            <h2>5. Pembatalan Langganan (Tanpa Refund)</h2>
            <p>
              Anda dapat membatalkan langganan kapan saja melalui dashboard.
              Pembatalan menghentikan penagihan otomatis untuk periode berikutnya,
              namun Anda tetap dapat mengakses fitur premium hingga akhir periode
              yang sudah dibayarkan.
            </p>
            <p>
              <strong>Penting:</strong> Pembatalan langganan bukan berarti
              pengembalian dana untuk periode yang sudah berjalan.
              Akun akan otomatis beralih ke Paket Starter gratis setelah periode berakhir.
            </p>
          </section>

          <section id="kontak">
            <h2>6. Pertanyaan & Bantuan</h2>
            <p>Jika Anda memiliki pertanyaan:</p>
            <ul>
              <li><strong>Email:</strong> muhamadagus3197@gmail.com</li>
              <li><strong>Telepon:</strong> 0813-8474-2399</li>
              <li><strong>Jam Operasional:</strong> Senin–Jumat, 09:00–17:00 WIB</li>
              <li><strong>Alamat:</strong> Bekasi, Indonesia</li>
            </ul>
          </section>
        </div>
      </div>
    </PolicyLayout>
  );
}
