"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Smartphone,
  X,
  Zap,
  WifiOff,
  Bell,
  Sparkles,
  Share,
  PlusSquare,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface PWAInstallBannerProps {
  onOpenSettings?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = () => {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismissPrompt } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If app is already installed or dismissed within the last 7 days, don't show
  if (isInstalled || isDismissed) {
    return null;
  }

  // Only render if browser supports installation or is iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    soundFx.playCoinSound();
    haptics.lightTap();

    if (isInstallable) {
      setIsInstalling(true);
      const success = await install();
      setIsInstalling(false);
      if (success) {
        soundFx.playImpulseVictorySound();
        haptics.successPulse();
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleDismiss = () => {
    haptics.lightTap();
    dismissPrompt(7);
  };

  return (
    <>
      {/* Non-intrusive App Install Banner */}
      <div className="w-full max-w-7xl mx-auto px-4 pt-3 pb-1">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-500/30 p-3.5 sm:p-4 shadow-lg shadow-blue-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Left: App Icon & Value Propositions */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 p-0.5 shrink-0 shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center text-white font-black text-lg">
                M
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                  Install Mokaia on Your Phone
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Instant & Offline Ready
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-emerald-400" /> 100% Offline
                </span>
                <span className="inline-flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Fast Logging
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bell className="w-3 h-3 text-purple-400" /> Daily Streaks
                </span>
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 justify-end relative z-10 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer active:scale-95"
            >
              {isIOS ? (
                <>
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Add to Home Screen</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner for 7 days"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
              title="Dismiss for 7 days"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* iOS Safari Interactive Walkthrough Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 space-y-5 relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
                    <p className="text-[11px] text-slate-400">iOS Safari 2-step setup</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Visual 2-step instructions */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-200">
                    <span>Tap the </span>
                    <strong className="text-blue-400 inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-blue-900/40 border border-blue-700/50">
                      <Share className="w-3 h-3" /> Share
                    </strong>
                    <span>icon located at the bottom bar of Safari.</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-200">
                    <span>Scroll down and tap </span>
                    <strong className="text-indigo-400 inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/50">
                      <PlusSquare className="w-3 h-3" /> Add to Home Screen
                    </strong>
                    <span>to install Mokaia like a native app.</span>
                  </div>
                </div>
              </div>

              {/* Standalone benefits */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Works 100% offline with zero browser address bar distractions!</span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer shadow-md"
              >
                Got It, Ready to Install
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
