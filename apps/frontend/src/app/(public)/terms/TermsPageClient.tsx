// ─────────────────────────────────────────────────────────────
// Terms of Service Client — /terms
// ─────────────────────────────────────────────────────────────
'use client';

import { PolicyLayout, SidebarNav } from '../policy-shared';

const sidebarSections = [
  { id: 'definisi', label: 'Definisi Layanan' },
  { id: 'akses-akun', label: 'Akses Akun' },
  { id: 'langganan', label: 'Langganan & Pembayaran' },
  { id: 'penggunaan', label: 'Penggunaan Layanan' },
  { id: 'batasan', label: 'Batasan Tanggung Jawab' },
  { id: 'privasi', label: 'Privasi & Data' },
  { id: 'hki', label: 'Hak Kekayaan Intelektual' },
  { id: 'penghentian', label: 'Penghentian Layanan' },
  { id: 'perubahan', label: 'Perubahan Ketentuan' },
  { id: 'kontak', label: 'Kontak' },
];

export default function TermsPageClient() {
  return (
    <PolicyLayout
      title="Syarat & Ketentuan"
      description="Dengan menggunakan Kasirku, Anda menyetujui syarat dan ketentuan berikut. Harap baca dengan saksama."
      lastUpdated="15 November 2023"
    >
      <div className="flex gap-10">
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <div className="sticky top-24">
            <SidebarNav sections={sidebarSections} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <section id="definisi">
            <h2>1. Definisi Layanan</h2>
            <p>
              <strong>Kasirku</strong> (&quot;kami&quot;, &quot;Platform&quot;) adalah penyedia layanan
              Software-as-a-Service (SaaS) Point of Sales (POS) yang membantu
              pelaku bisnis UMKM di Indonesia dalam mengelola transaksi penjualan,
              inventaris, laporan keuangan, dan manajemen karyawan secara digital.
            </p>
            <p>
              <strong>Pengguna</strong> (&quot;Anda&quot;) adalah individu atau badan usaha
              yang mendaftar, mengakses, dan menggunakan Platform Kasirku, baik
              dalam kapasitas sebagai pemilik bisnis maupun karyawan yang
              ditunjuk.
            </p>
            <p>
              Dengan mengakses atau menggunakan Platform Kasirku, Anda menyatakan
              telah membaca, memahami, dan menyetujui seluruh syarat dan ketentuan
              ini. Apabila Anda tidak menyetujui, harap tidak menggunakan layanan
              kami.
            </p>
          </section>

          <section id="akses-akun">
            <h2>2. Akses & Keamanan Akun</h2>
            <p>
              Anda bertanggung jawab penuh atas:
            </p>
            <ul>
              <li>Menjaga kerahasiaan kredensial login (email dan password).</li>
              <li>Menjaga kerahasiaan PIN keamanan karyawan.</li>
              <li>Semua aktivitas yang terjadi di bawah akun Anda.</li>
              <li>Segera memberitahukan kami jika terjadi akses tidak sah atau
              pelanggaran keamanan.</li>
            </ul>
            <p>
              Kasirku tidak bertanggung jawab atas kerugian yang timbul akibat
              kelalaian Anda dalam menjaga keamanan akun.
            </p>
          </section>

          <section id="langganan">
            <h2>3. Langganan & Pembayaran</h2>
            <p>
              Kasirku menawarkan paket layanan berbayar (Growth dan Enterprise)
              dengan fitur tambahan. Ketentuan langganan:
            </p>
            <ul>
              <li>
                <strong>Biaya Langganan:</strong> Biaya ditagihkan di awal periode
                (bulanan atau tahunan) sesuai paket yang dipilih.
              </li>
              <li>
                <strong>Pembaruan Otomatis:</strong> Langganan akan diperbarui
                secara otomatis kecuali Anda membatalkannya sebelum periode
                berikutnya.
              </li>
              <li>
                <strong>Perubahan Harga:</strong> Kami berhak mengubah harga paket
                dengan pemberitahuan minimal 30 hari sebelumnya.
              </li>
              <li>
                <strong>Pajak:</strong> Semua harga yang tercantum belum termasuk
                pajak yang berlaku (PPN).
              </li>
            </ul>
          </section>

          <section id="penggunaan">
            <h2>4. Penggunaan Layanan</h2>
            <p>
              Anda setuju untuk menggunakan Kasirku sesuai dengan hukum yang berlaku
              di Republik Indonesia dan tidak:
            </p>
            <ul>
              <li>Menggunakan Platform untuk aktivitas ilegal atau penipuan.</li>
              <li>Mencatat transaksi fiktif atau memanipulasi data keuangan.</li>
              <li>Mendistribusikan malware, virus, atau kode berbahaya.</li>
              <li>Mencoba mengakses data pengguna lain tanpa izin.</li>
              <li>Menjual kembali, menyewakan, atau mendistribusikan akses
              layanan kepada pihak ketiga tanpa izin tertulis.</li>
              <li>Melakukan reverse engineering terhadap Platform.</li>
            </ul>
          </section>

          <section id="batasan">
            <h2>5. Batasan Tanggung Jawab</h2>
            <p>
              Kasirku menyediakan Platform &quot;sebagaimana adanya&quot; (as-is).
              Dalam batas maksimum yang diizinkan oleh hukum:
            </p>
            <ul>
              <li>
                Kami tidak bertanggung jawab atas kerugian operasional yang
                disebabkan oleh gangguan internet lokal pengguna.
              </li>
              <li>
                Kami tidak bertanggung jawab atas kesalahan pencatatan transaksi
                yang disebabkan oleh kelalaian pengguna.
              </li>
              <li>
                Kami tidak bertanggung jawab atas kewajiban perpajakan pengguna.
                Anda bertanggung jawab penuh atas pelaporan pajak bisnis Anda.
              </li>
              <li>
                Kami tidak menjamin Platform bebas dari gangguan atau error,
                namun kami berkomitmen untuk menyelesaikan masalah teknis.
              </li>
            </ul>
          </section>

          <section id="privasi">
            <h2>6. Privasi & Perlindungan Data</h2>
            <p>
              Kami berkomitmen melindungi privasi dan data Anda:
            </p>
            <ul>
              <li>
                Data bisnis Anda (produk, transaksi, pelanggan) adalah milik
                Anda sepenuhnya.
              </li>
              <li>
                Kami tidak menjual atau membagikan data Anda ke pihak ketiga.
              </li>
              <li>
                Kami menggunakan enkripsi untuk melindungi data dalam transmisi
                dan penyimpanan.
              </li>
              <li>
                Data disimpan di server yang aman dengan backup berkala.
              </li>
            </ul>
          </section>

          <section id="hki">
            <h2>7. Hak Kekayaan Intelektual</h2>
            <p>
              Seluruh konten Platform Kasirku — termasuk kode sumber, desain,
              logo, merek, teks, dan antarmuka — adalah milik Kasirku dan
              dilindungi undang-undang HKI Indonesia.
            </p>
            <p>
              Anda tidak diperkenankan menyalin, memodifikasi, atau
              mendistribusikan Platform tanpa izin tertulis.
            </p>
          </section>

          <section id="penghentian">
            <h2>8. Penghentian Layanan</h2>
            <p>
              Kami berhak menangguhkan atau menghentikan akun Anda jika:
            </p>
            <ul>
              <li>Anda melanggar Syarat & Ketentuan ini.</li>
              <li>Anda menggunakan Platform untuk aktivitas ilegal.</li>
              <li>Pembayaran langganan gagal dan tidak diselesaikan dalam 14 hari.</li>
            </ul>
            <p>
              Anda dapat menghentikan penggunaan layanan kapan saja. Data
              disimpan 30 hari sebelum dihapus permanen.
            </p>
          </section>

          <section id="perubahan">
            <h2>9. Perubahan Ketentuan</h2>
            <p>
              Kami dapat memperbarui ketentuan ini. Perubahan diumumkan melalui
              Platform atau email. Penggunaan lanjutan berarti persetujuan Anda.
              Perubahan material diberitahukan minimal 14 hari sebelumnya.
            </p>
          </section>

          <section id="kontak">
            <h2>10. Kontak</h2>
            <p>
              Jika Anda memiliki pertanyaan:
            </p>
            <ul>
              <li><strong>Email:</strong> muhamadagus3197@gmail.com</li>
              <li><strong>Telepon:</strong> 0813-8474-2399</li>
              <li><strong>Alamat:</strong> Bekasi, Indonesia</li>
            </ul>
          </section>
        </div>
      </div>
    </PolicyLayout>
  );
}
