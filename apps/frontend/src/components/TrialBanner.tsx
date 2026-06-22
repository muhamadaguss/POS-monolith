'use client';

import { useSession } from 'next-auth/react';
import { Clock, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const TRIAL_WARNING_DAYS = 7;

interface TrialBannerProps {
  onDismiss?: () => void;
}

export default function TrialBanner({ onDismiss }: TrialBannerProps) {
  const { data: session } = useSession();
  const [dismissed, setDismissed] = useState(false);
  const [animating, setAnimating] = useState(false);

  const tenantStatus = session?.user?.tenantStatus;
  const trialEndsAt = session?.user?.trialEndsAt;

  if (tenantStatus !== 'TRIAL' || !trialEndsAt || dismissed) {
    return null;
  }

  const now = new Date();
  const ends = new Date(trialEndsAt);
  const diffMs = ends.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0 || daysLeft > TRIAL_WARNING_DAYS) {
    return null;
  }

  const handleDismiss = () => {
    setAnimating(true);
    setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 300);
  };

  const isUrgent = daysLeft <= 3;

  return (
    <div
      className={`rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 transition-all duration-300 border shadow-sm ${
        animating ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0 scale-100'
      } ${
        isUrgent
          ? 'bg-gradient-to-r from-amber-50 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/10 border-amber-200 dark:border-amber-700/50'
          : 'bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border-emerald-200 dark:border-emerald-700/50'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
            isUrgent
              ? 'bg-amber-100 dark:bg-amber-900/40'
              : 'bg-emerald-100 dark:bg-emerald-900/40'
          }`}
        >
          {isUrgent ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          )}
        </div>
        <div className="min-w-0">
          <p
            className={`font-semibold text-sm ${
              isUrgent
                ? 'text-amber-800 dark:text-amber-300'
                : 'text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {isUrgent
              ? `Masa Trial Akan Berakhir dalam ${daysLeft} Hari!`
              : `Masa Trial Tinggal ${daysLeft} Hari Lagi`}
          </p>
          <p
            className={`text-xs mt-0.5 leading-relaxed ${
              isUrgent
                ? 'text-amber-700/80 dark:text-amber-400/70'
                : 'text-emerald-700/80 dark:text-emerald-400/70'
            }`}
          >
            {isUrgent
              ? `Trial berakhir pada ${ends.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}. Hubungi tim sales untuk upgrade.`
              : 'Upgrade ke paket berbayar untuk terus menggunakan semua fitur tanpa gangguan.'}
          </p>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95 shrink-0 ${
          isUrgent
            ? 'text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            : 'text-emerald-500 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
        }`}
        aria-label="Tutup notifikasi"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
