// ─────────────────────────────────────────────────────────────
// FAQ Page Client — /faq
// ─────────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';
import { PolicyLayout, FaqAccordionItem } from '../policy-shared';
import { COLORS } from '../landing-shared';
import { HelpCircle, CreditCard, Shield, Users, Smartphone } from 'lucide-react';

interface FaqEntry {
  question: string;
  answer: React.ReactNode;
}

interface FaqCategory {
  id: string;
  icon: typeof HelpCircle;
  label: string;
  items: FaqEntry[];
}

const faqCategories: FaqCategory[] = [
  {
    id: 'akun',
    icon: Users,
    label: 'Akun & Langganan',
    items: [
      {
        question: 'Bagaimana cara mendaftar akun Kasirku?',
        answer: (
          <>
            <p>Mendaftar sangat mudah! Cukup:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Klik tombol &quot;Mulai Gratis&quot; di halaman utama</li>
              <li>Isi nama bisnis, email, dan password</li>
              <li>Verifikasi email Anda</li>
              <li>Langsung bisa digunakan!</li>
            </ol>
          </>
        ),
      },
      {
        question: 'Apakah Kasirku gratis?',
        answer:
          'Ya! Paket Starter kami gratis selamanya untuk 1 outlet dan 3 karyawan. Anda bisa upgrade kapan saja ke paket Growth atau Enterprise sesuai kebutuhan bisnis.',
      },
      {
        question: 'Apakah ada masa trial?',
        answer:
          'Paket Starter gratis selamanya, jadi Anda bisa mencoba semua fitur dasar tanpa batas waktu. Untuk fitur premium, Anda bisa upgrade ke paket Growth atau Enterprise kapan saja.',
      },
      {
        question: 'Bagaimana cara upgrade paket?',
        answer: (
          <>
            <p>Upgrade paket sangat mudah:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Buka halaman <strong>Billing</strong> di dashboard</li>
              <li>Pilih paket yang diinginkan</li>
              <li>Klik &quot;Pilih Paket&quot; lalu &quot;Bayar&quot;</li>
              <li>Selesaikan pembayaran via Midtrans</li>
              <li>Fitur premium langsung aktif!</li>
            </ol>
          </>
        ),
      },
      {
        question: 'Bisakah downgrade paket?',
        answer:
          'Ya, Anda bisa downgrade ke paket yang lebih rendah saat periode langganan berakhir. Fitur yang tidak tersedia di paket baru akan dinonaktifkan. Data Anda tetap aman dan dapat diakses.',
      },
      {
        question: 'Berapa banyak outlet yang bisa dikelola?',
        answer:
          'Tergantung paket: Starter (1 outlet), Growth (3 outlet), Enterprise (unlimited outlet). Anda bisa monitor semua cabang dari satu dashboard dengan data real-time.',
      },
    ],
  },
  {
    id: 'fitur',
    icon: Smartphone,
    label: 'Fitur & Teknis',
    items: [
      {
        question: 'Apakah bisa dipakai di HP?',
        answer:
          'Tentu! Kasirku adalah Progressive Web App (PWA) yang bisa diinstall di layar utama HP Android & iOS seperti aplikasi native. Bisa digunakan offline juga — data akan tersinkronisasi otomatis saat koneksi kembali.',
      },
      {
        question: 'Metode pembayaran apa yang didukung?',
        answer:
          'Kasirku terintegrasi dengan Midtrans sebagai payment gateway. Kami mendukung: Transfer Bank (BCA, Mandiri, BNI, BRI), QRIS (GoPay, OVO, ShopeePay), Virtual Account, dan kartu kredit/debit.',
      },
      {
        question: 'Apakah mendukung printer thermal?',
        answer:
          'Ya! Kasirku mendukung printer thermal Bluetooth dan USB untuk cetak struk transaksi. Kami juga mendukung printer ESC/POS standar yang banyak digunakan di pasaran.',
      },
      {
        question: 'Apakah data bisa diekspor?',
        answer:
          'Tentu. Anda bisa ekspor laporan penjualan, inventaris, dan data transaksi ke format CSV atau Excel kapan saja dari dashboard.',
      },
      {
        question: 'Bagaimana cara setup awal?',
        answer: (
          <>
            <p>Setup awal hanya butuh 5 menit:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-1">
              <li>Tambah outlet dan informasi bisnis</li>
              <li>Input produk & inventaris</li>
              <li>Tambah akun karyawan</li>
              <li>Atur metode pembayaran</li>
              <li>Mulai transaksi!</li>
            </ol>
          </>
        ),
      },
    ],
  },
  {
    id: 'pembayaran',
    icon: CreditCard,
    label: 'Pembayaran & Billing',
    items: [
      {
        question: 'Bagaimana cara melakukan pembayaran?',
        answer:
          'Setelah memilih paket di halaman Billing, klik "Bayar". Anda akan diarahkan ke halaman pembayaran Midtrans yang aman. Pilih metode pembayaran favorit Anda (transfer bank, VA, QRIS, dll) dan selesaikan transaksi.',
      },
      {
        question: 'Berapa lama aktivasi setelah pembayaran?',
        answer:
          'Aktivasi instan! Begitu pembayaran terkonfirmasi oleh Midtrans (biasanya 1-5 menit), paket Anda langsung aktif secara otomatis.',
      },
      {
        question: 'Apakah bisa pembayaran manual via transfer?',
        answer:
          'Ya, Midtrans menyediakan Virtual Account untuk setiap bank. Anda bisa transfer ke nomor VA yang diberikan. Pembayaran akan terverifikasi otomatis begitu dana masuk.',
      },
      {
        question: 'Apakah ada biaya tersembunyi?',
        answer:
          'Tidak ada! Harga yang tertera di halaman Harga sudah final. Tidak ada biaya tambahan, biaya setup, atau biaya tersembunyi lainnya.',
      },
      {
        question: 'Bagaimana cara melihat riwayat pembayaran?',
        answer:
          'Semua invoice dan riwayat pembayaran bisa dilihat di halaman Billing dashboard Anda. Anda juga akan menerima email konfirmasi setiap kali pembayaran berhasil.',
      },
    ],
  },
  {
    id: 'keamanan',
    icon: Shield,
    label: 'Keamanan & Privasi',
    items: [
      {
        question: 'Apakah data saya aman?',
        answer:
          'Keamanan adalah prioritas utama kami. Semua data dienkripsi (at-rest & in-transit), server menggunakan SSL/TLS, database terisolasi per tenant, dan kami melakukan backup otomatis setiap hari.',
      },
      {
        question: 'Di mana data saya disimpan?',
        answer:
          'Data Anda disimpan di server cloud yang aman dengan infrastruktur modern. Setiap tenant memiliki database terisolasi sehingga data Anda tidak bercampur dengan data tenant lain.',
      },
      {
        question: 'Bagaimana dengan keamanan akses karyawan?',
        answer:
          'Kasirku menggunakan sistem PIN 6-digit dan Role-Based Access Control (RBAC). Setiap karyawan hanya bisa mengakses fitur sesuai perannya. Anda bisa mengatur permission detail untuk setiap role.',
      },
      {
        question: 'Apakah Kasirku mematuhi regulasi privasi data?',
        answer:
          'Ya. Kami mematuhi UU Perlindungan Data Pribadi Indonesia dan standar internasional. Kami tidak menjual atau membagikan data Anda ke pihak ketiga tanpa izin.',
      },
    ],
  },
];

export default function FaqPageClient() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PolicyLayout
      title="Pertanyaan Umum (FAQ)"
      description="Temukan jawaban untuk pertanyaan yang sering diajukan seputar Kasirku — dari cara daftar hingga keamanan data."
    >
      <div className="flex flex-wrap gap-2 mb-10">
        {faqCategories.map((cat) => (
          <a
            key={cat.id}
            href={`#${cat.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:shadow-sm"
            style={{
              backgroundColor: COLORS.lightBg,
              color: COLORS.primary,
            }}
          >
            <cat.icon size={16} />
            {cat.label}
          </a>
        ))}
      </div>

      {faqCategories.map((category) => (
        <section key={category.id} id={category.id} className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: COLORS.lightBg }}
            >
              <category.icon size={20} style={{ color: COLORS.primary }} />
            </div>
            <h2
              className="text-2xl font-bold"
              style={{ color: COLORS.text }}
            >
              {category.label}
            </h2>
          </div>
          <div className="space-y-3">
            {category.items.map((item, itemIdx) => {
              const itemId = `${category.id}-${itemIdx}`;
              return (
                <FaqAccordionItem
                  key={itemId}
                  question={item.question}
                  answer={item.answer}
                  isOpen={!!openItems[itemId]}
                  onToggle={() => toggleItem(itemId)}
                />
              );
            })}
          </div>
        </section>
      ))}

      <div
        className="mt-12 p-8 rounded-2xl text-center"
        style={{ backgroundColor: COLORS.lightBg }}
      >
        <h3
          className="text-xl font-bold mb-2"
          style={{ color: COLORS.text }}
        >
          Masih punya pertanyaan?
        </h3>
        <p className="mb-4" style={{ color: COLORS.textSecondary }}>
          Tim support kami siap membantu Anda
        </p>
        <a
          href="mailto:muhamadagus3197@gmail.com"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
          style={{ backgroundColor: COLORS.primary }}
        >
          Hubungi Support
        </a>
      </div>
    </PolicyLayout>
  );
}
