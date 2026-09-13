"use client";

import React from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface OfflineBannerProps {
  isOffline: boolean;
  isSimulated: boolean;
  pendingCount: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOffline,
  isSimulated,
  pendingCount,
}) => {
  const { language } = useTranslation();
  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-medium text-amber-300 flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {language === 'id'
          ? 'Anda sedang offline — semua perubahan tersimpan aman di perangkat Anda dan disinkronkan otomatis saat terhubung kembali.'
          : 'You are offline — all changes are saved safely on your device and will sync automatically when reconnected.'}
        {pendingCount > 0
          ? ` (${pendingCount} ${language === 'id' ? 'tertunda' : 'pending'})`
          : ''}
      </span>
    </div>
  );
};
