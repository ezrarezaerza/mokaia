"use client";

import React from 'react';
import { WifiOff } from 'lucide-react';

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
  if (!isOffline) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs font-medium text-amber-300 flex items-center justify-center gap-2">
      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        You are offline — all changes are saved safely on your device and will sync automatically when reconnected.
        {pendingCount > 0 ? ` (${pendingCount} pending)` : ''}
      </span>
    </div>
  );
};
