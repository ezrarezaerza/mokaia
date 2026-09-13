"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Share2,
  X,
  Trophy,
  CheckCircle2,
  Flame,
  ArrowRight,
  RotateCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import type { LocalDebt, LocalUser } from '../types';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface DebtConqueredCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: LocalDebt | null;
  user: LocalUser;
  onOpenShareCard: (debt: LocalDebt) => void;
  onOpenSpinner?: () => void;
}

export const DebtConqueredCelebrationModal: React.FC<DebtConqueredCelebrationModalProps> = ({
  isOpen,
  onClose,
  debt,
  user,
  onOpenShareCard,
  onOpenSpinner,
}) => {
  const { format: formatMoney } = useCurrency();
  React.useEffect(() => {
    if (isOpen) {
      soundFx.playFanfareSound();
      haptics.successPulse();

      // Burst gold & purple confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#a855f7', '#ec4899', '#3b82f6', '#eab308', '#10b981'],
        });
      } catch {
        // Fallback gracefully if canvas is unavailable
      }
    }
  }, [isOpen]);

  if (!isOpen || !debt) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900 to-purple-950/50 border border-purple-500/30 p-6 sm:p-7 shadow-2xl shadow-purple-950/60 z-10 text-center space-y-5 overflow-hidden"
        >
          {/* Ambient Glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Animated Hero Trophy Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 p-0.5 shadow-xl shadow-purple-500/25">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center text-4xl">
              ⚔️
            </div>
            <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
              {formatMoney(0)}
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <span className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold">
              Liability Smashed
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Debt Fully Conquered!
            </h2>
            <p className="text-sm text-slate-300 font-medium">
              You paid off <strong className="text-white">&quot;{debt.name}&quot;</strong> in full.
            </p>
          </div>

          {/* Rewards Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">EXP Boost</span>
                <span className="text-base font-black font-mono text-purple-300">+100 EXP</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <RotateCw className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-medium block">Reward Spinner</span>
                <span className="text-base font-black font-mono text-emerald-300">+1 Spin Ticket</span>
              </div>
            </div>
          </div>

          {/* Psychological Reassurance / Positive reinforcement */}
          <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/20 text-xs text-purple-200/90 text-left">
            💡 <strong>Mindful Milestone:</strong> You freed up cash flow from this obligation.
            Every dollar previously bleeding to this balance is now available for your savings goals or guilt-free joy!
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => {
                soundFx.playTickSound();
                haptics.selectionTick();
                onClose();
                onOpenShareCard(debt);
              }}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-purple-950/40 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <Share2 className="w-4 h-4" />
              <span>Generate Milestone Share Card</span>
            </button>

            {onOpenSpinner && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playTickSound();
                  haptics.lightTap();
                  onClose();
                  onOpenSpinner();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <RotateCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Spin the Reward Spinner</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Continue to Command Center
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
