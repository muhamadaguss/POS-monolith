'use client';

import { useSession } from 'next-auth/react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const TRIAL_WARNING_DAYS = 7; // Tampilkan banner jika < 7 hari

interface TrialBannerProps {
  onDismiss?: () => void;
}

export default function TrialBanner({ onDismiss }: TrialBannerProps) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);

  // Cek apakah user perlu melihat banner
  const tenantStatus = session?.user?.tenantStatus;
  const trialEndsAt = session?.user?.trialEndsAt;

  // Hanya tampil jika status TRIAL
  if (tenantStatus !== 'TRIAL' || !trialEndsAt || dismissed) {
    return null;
  }

  // Hitung sisa hari trial
  const now = new Date();
  const ends = new Date(trialEndsAt);
  const diffMs = ends.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Jangan tampil jika trial sudah habis atau masih > 7 hari
  if (daysLeft <= 0 || daysLeft > TRIAL_WARNING_DAYS) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between ${isUrgent
          ? 'bg-amber-50 border border-amber-300'
          : 'bg-blue-50 border border-blue-200'
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUrgent ? 'bg-amber-100' : 'bg-blue-100'
            }`}
        >
          {isUrgent ? (
            <AlertTriangle className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
          ) : (
            <Clock className={`w-5 h-5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
          )}
        </div>
        <div>
          <p className={`font-semibold text-sm ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
            {isUrgent
              ? `Masa Trial Akan Berakhir dalam ${daysLeft} Hari!`
              : `Masa Trial Tinggal ${daysLeft} Hari Lagi`}
          </p>
          <p className={`text-xs mt-0.5 ${isUrgent ? 'text-amber-700' : 'text-blue-700'}`}>
            {isUrgent
              ? `Trial berakhir pada ${ends.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. Hubungi tim sales untuk upgrade atau lakukan perpanjangan paket di menu billing & paket sebelum trial habis.`
              : `Upgrade ke paket berbayar untuk terus menggunakan semua fitur tanpa gangguan.`}
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className={`p-1.5 rounded-lg transition-colors ${isUrgent
            ? 'hover:bg-amber-100 text-amber-600'
            : 'hover:bg-blue-100 text-blue-600'
          }`}
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
