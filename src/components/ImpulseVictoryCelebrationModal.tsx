"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Ticket,
  TrendingDown,
  ArrowRight,
  X,
  HeartHandshake,
  Flame,
} from 'lucide-react';
import type { ImpulseVictoryResult } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface ImpulseVictoryCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  victoryData: ImpulseVictoryResult | null;
  mascotName?: string;
  mascotEmoji?: string;
  mascotPersonality?: string;
  onOpenSpinner?: () => void;
}

export const ImpulseVictoryCelebrationModal: React.FC<ImpulseVictoryCelebrationModalProps> = ({
  isOpen,
  onClose,
  victoryData,
  mascotName = 'Mochi',
  mascotEmoji = '🐱',
  mascotPersonality = 'zen',
  onOpenSpinner,
}) => {
  const { format: formatMoney } = useCurrency();

  useEffect(() => {
    if (isOpen && victoryData) {
      soundFx.playImpulseVictorySound();
      haptics.successPulse();

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'],
        });
      } catch {
        // Fallback
      }
    }
  }, [isOpen, victoryData]);

  if (!isOpen || !victoryData) return null;

  const getMascotVictorySpeech = () => {
    if (mascotPersonality === 'hype') {
      return `BOOM! Willpower victory! You crushed the urge to buy "${victoryData.itemDescription}" and defended ${formatMoney(victoryData.savedAmount)}! That's how champions build real wealth!`;
    }
    if (mascotPersonality === 'pragmatic') {
      return `Logical victory logged. By rejecting "${victoryData.itemDescription}", you retained ${formatMoney(victoryData.savedAmount)} of capital with 0% depreciation. Outstanding ROI!`;
    }
    if (mascotPersonality === 'cozy') {
      return `So proud of you! Walking away from "${victoryData.itemDescription}" gives your future self so much peace of mind. Here is a treat ticket for the wheel!`;
    }
    return `Mindful triumph! You paused, waited, and chose intentional living over "${victoryData.itemDescription}". ${formatMoney(victoryData.savedAmount)} is still yours to direct.`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-md bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl shadow-emerald-950/40 z-10 text-slate-100 overflow-hidden"
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close victory modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Top Banner Tag */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Impulse Defeated</span>
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight mb-1">
            Mindful Victory!
          </h2>
          <p className="text-xs text-slate-400 mb-5">
            You successfully resisted buying{' '}
            <span className="text-slate-200 font-semibold underline decoration-emerald-500/40">
              {victoryData.itemDescription}
            </span>
          </p>

          {/* Saved Amount Hero Display */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-slate-900 border border-emerald-500/30 text-center mb-4 shadow-inner">
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
              Money Protected & Kept
            </div>
            <div className="text-4xl font-extrabold text-emerald-300 tracking-tight">
              +{formatMoney(victoryData.savedAmount)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Still growing for your real goals and freedom
            </div>
          </div>

          {/* Rewards Earned Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight">
                  +{victoryData.expAwarded} EXP
                </div>
                <div className="text-[10px] text-purple-300 font-medium truncate">
                  Progression Surge
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
                <Ticket className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white leading-tight">
                  +1 Spin Ticket
                </div>
                <div className="text-[10px] text-amber-300 font-medium truncate">
                  Reward Wheel
                </div>
              </div>
            </div>
          </div>

          {/* Mascot Speech Bubble */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/70 flex items-start gap-3 mb-5">
            <div className="text-2xl shrink-0 p-1.5 rounded-xl bg-slate-800 border border-slate-700">
              {mascotEmoji}
            </div>
            <div className="text-xs leading-relaxed space-y-1">
              <div className="font-bold text-emerald-400 text-[11px] uppercase tracking-wider">
                {mascotName} says:
              </div>
              <p className="text-slate-200">{getMascotVictorySpeech()}</p>
            </div>
          </div>

          {/* Cumulative Stats Milestone */}
          <div className="px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400 mb-5">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Lifetime Impulses Resisted:</span>
            </span>
            <span className="font-mono font-bold text-slate-200">
              {victoryData.totalResistedCount} ({formatMoney(victoryData.totalSavedAmount)} total)
            </span>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2">
            {onOpenSpinner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSpinner();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Ticket className="w-4 h-4" />
                <span>Spin the Reward Wheel Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
            >
              Keep Saving & Continue
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
