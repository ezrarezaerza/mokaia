"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Flame,
  X,
  Sparkles,
  Info,
  Calendar,
  CheckCircle2,
  Heart,
  Zap,
} from 'lucide-react';
import type { LocalUser } from '../types';
import { getShieldStatus } from '../lib/db';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface GraceShieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: LocalUser | null;
}

export const GraceShieldModal: React.FC<GraceShieldModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  const [shieldData, setShieldData] = useState({
    activeShields: 2,
    maxShields: 2,
    currentStreak: 0,
    longestStreak: 0,
    daysUntilNextShield: 0,
    canRecharge: false,
  });

  useEffect(() => {
    if (isOpen && user?.id) {
      getShieldStatus(user.id).then(setShieldData).catch(console.warn);
      soundFx.playShieldSound();
      haptics.shieldHaptic();
    }
  }, [isOpen, user?.id]);

  if (!isOpen || !user) return null;

  const activeShields = shieldData.activeShields;
  const streak = user.currentStreak ?? 0;
  const longestStreak = user.longestStreak ?? streak;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            haptics.lightTap();
            onClose();
          }}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        >
          {/* Mobile Grab Handle */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-slate-700" />
          </div>

          {/* Pinned Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Grace Day Shields
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Guilt-free streak protection & loss aversion
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {/* Visual Shield Slots */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-slate-800/60 to-slate-900/60 border border-slate-700/60 text-center space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Available Shield Slots ({activeShields} / 2)
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                {[0, 1].map((slotIndex) => {
                  const isSlotActive = slotIndex < activeShields;
                  return (
                    <motion.div
                      key={slotIndex}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        soundFx.playShieldSound();
                        haptics.shieldHaptic();
                      }}
                      className={`relative w-28 sm:w-32 h-36 rounded-2xl border flex flex-col items-center justify-center p-3 transition-all cursor-pointer ${
                        isSlotActive
                          ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                          : 'bg-slate-800/40 border-slate-700/40 opacity-60'
                      }`}
                    >
                      {isSlotActive ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 mb-2">
                            <ShieldCheck className="w-6 h-6 fill-emerald-400/20" />
                          </div>
                          <span className="text-xs font-bold text-emerald-300">Shield Active</span>
                          <span className="text-[10px] text-emerald-400/80 mt-0.5 font-mono">Ready to Protect</span>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 mb-2">
                            <ShieldAlert className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-400">Consumed</span>
                          <span className="text-[10px] text-slate-500 mt-0.5 font-mono">Recharging</span>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                {activeShields === 2
                  ? 'Your streak is fully shielded. If you miss a day, a shield is consumed automatically.'
                  : activeShields === 1
                  ? '1 shield remains active to protect your streak if you miss a day.'
                  : 'All shields are consumed! Log in daily to recharge your streak shield.'}
              </p>
            </div>

            {/* Current Streak & Stats Banner */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
                  <Flame className="w-5 h-5 fill-orange-400" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Current Streak</span>
                  <span className="text-base font-bold text-white font-mono">{streak} Days</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Longest Streak</span>
                  <span className="text-base font-bold text-white font-mono">{longestStreak} Days</span>
                </div>
              </div>
            </div>

            {/* How Grace Days Work (Behavioral Psychology) */}
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Heart className="w-4 h-4 text-rose-400" />
                <span>The Psychology of Grace Days</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Behavioral studies show that breaking a daily streak often triggers the <em>"What-the-Hell Effect"</em>—causing users to give up on budgeting entirely out of discouragement.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mokaia Grace Day Shields eliminate financial guilt by seamlessly absorbing accidental missed days, preserving your momentum while keeping your focus on positive habit building.
              </p>
            </div>

            {/* Shield Recharge Rules */}
            <div className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/50 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Shield Regeneration Rules</span>
              </div>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>
                  Earn <strong>+1 Grace Shield</strong> for every <strong>7 consecutive days</strong> of active logging.
                </li>
                <li>
                  You can hold a maximum of <strong>2 active shields</strong> at any time.
                </li>
                <li>
                  You also have a chance to win Grace Shields directly from <strong>The Reward Spinner</strong>!
                </li>
              </ul>
            </div>
          </div>

          {/* Pinned Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900 shrink-0 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                onClose();
              }}
              className="py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
            >
              Got It
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
