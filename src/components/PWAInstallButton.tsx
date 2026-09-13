"use client";

import React, { useState } from 'react';
import { Download, Smartphone, X, Share, PlusSquare, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    soundFx.playCoinSound();
    haptics.lightTap();
    const success = await install();
    if (success) {
      soundFx.playImpulseVictorySound();
      haptics.successPulse();
    }
  };

  const handleOpenIOSGuide = () => {
    soundFx.playTickSound();
    haptics.lightTap();
    setShowIOSGuide(true);
  };

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 text-xs font-semibold transition-colors cursor-pointer shadow-xs active:scale-95"
        title="Install Mokaia App"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={handleOpenIOSGuide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/80 text-xs font-medium transition cursor-pointer active:scale-95"
          title="Add Mokaia to iOS Home Screen"
        >
          <Smartphone className="w-3.5 h-3.5 text-blue-400" />
          <span>Add to Phone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 shadow-2xl text-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0">1</span>
                  <span>Tap the <strong className="text-blue-400 inline-flex items-center gap-1"><Share className="w-3 h-3" /> Share</strong> button in Safari toolbar.</span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0">2</span>
                  <span>Select <strong className="text-indigo-400 inline-flex items-center gap-1"><PlusSquare className="w-3 h-3" /> Add to Home Screen</strong>.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-[11px] text-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Opens full-screen with instant offline access.</span>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
