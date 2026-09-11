"use client";

import React from 'react';
import {
  Settings,
  LogOut,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { LocalUser } from '../types';

interface DashboardHeaderProps {
  user: LocalUser | null;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  onOpenSettings,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand Identity: Prominent, Clean, No @demo subtext */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-950/50">
            <span className="font-black text-base sm:text-lg tracking-tight">$</span>
          </div>
          <div>
            <span className="font-black text-xl sm:text-2xl text-white tracking-tight leading-none block">
              Moka<span className="text-blue-500">ia</span>
            </span>
          </div>
        </div>

        {/* Desktop Controls (Clean, focused, dedicated Settings hub) */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Dedicated Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white hover:bg-slate-700/80 transition cursor-pointer shadow-xs active:scale-95"
            title="Open Settings & Cloud Sync"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            <span>Settings</span>
          </button>

          {/* Direct Sign Out Action */}
          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile Controls (Dedicated, clean Settings gear button) */}
        <div className="flex sm:hidden items-center gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 hover:text-white transition cursor-pointer touch-manipulation active:scale-95 shadow-xs flex items-center justify-center"
            aria-label="Open Settings"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
