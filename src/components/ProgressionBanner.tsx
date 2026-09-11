"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Shield,
  Ticket,
  Palette,
  Gift,
  Info,
  X,
  ChevronRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { LocalUser } from '../types';
import { getExpProgress, getRankForLevel } from '../lib/gamification';
import { ExpJourneyModal } from './ExpJourneyModal';
import { GraceShieldModal } from './GraceShieldModal';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';

interface ProgressionBannerProps {
  user: LocalUser | null;
  onOpenSpinner?: () => void;
  onOpenWallet?: () => void;
  onOpenThemes?: () => void;
}

export const ProgressionBanner: React.FC<ProgressionBannerProps> = ({
  user,
  onOpenSpinner,
  onOpenWallet,
  onOpenThemes,
}) => {
  const [isPerksModalOpen, setIsPerksModalOpen] = useState(false);
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [isShieldModalOpen, setIsShieldModalOpen] = useState(false);

  if (!user) return null;

  const exp = user.exp ?? 0;
  const level = user.level ?? 1;
  const streak = user.currentStreak ?? 0;
  const graceDays = user.graceDays ?? 2;
  const tickets = user.spinnerTickets ?? 0;

  const { expInLevel, expNeeded, percent } = getExpProgress(exp);
  const rank = getRankForLevel(level);

  return (
    <>
      <div
        id="progression-hud-banner"
        className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg backdrop-blur-md mb-5 transition-all"
      >
        {/* Main Grid / Flex Layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 mb-3">
          {/* Player Identity: Rank & Level (Clickable to open EXP Journey & Audit History) */}
          <button
            type="button"
            onClick={() => {
              haptics.lightTap();
              setIsExpModalOpen(true);
            }}
            className="flex items-center gap-3 min-w-0 text-left hover:opacity-90 transition cursor-pointer group"
            title="View EXP Journey & Audit History"
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: `${rank.color}25`, border: `1.5px solid ${rank.color}60` }}
            >
              {rank.badge}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                  {rank.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                  Level {level}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                <strong className="text-slate-200">{expInLevel}</strong> / {expNeeded} EXP • <span className="text-indigo-400 font-semibold group-hover:underline">View History</span>
              </p>
            </div>
          </button>

          {/* Desktop Gamification Controls (Clear, high-contrast labeled pills) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {/* Streak Counter -> Opens Grace Day Shield Modal */}
            <button
              type="button"
              onClick={() => {
                haptics.shieldHaptic();
                setIsShieldModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold transition cursor-pointer"
              title="Daily Active Streak: Click to view streak shields & rules"
            >
              <Flame className="w-3.5 h-3.5 fill-orange-400" />
              <span>{streak}d Streak</span>
            </button>

            {/* Grace Day Shields -> Opens Grace Day Shield Modal */}
            <button
              type="button"
              onClick={() => {
                haptics.shieldHaptic();
                setIsShieldModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition cursor-pointer"
              title="Grace Day Shields: Click to check streak protection status"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>{graceDays} Shields</span>
            </button>

            {/* Spinner Launcher */}
            {onOpenSpinner && (
              <button
                type="button"
                onClick={onOpenSpinner}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                  tickets > 0
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700/80'
                }`}
                title="The Reward Spinner: Spin for mindful treats and perks"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>{tickets} Spins</span>
              </button>
            )}

            {/* Reward Wallet */}
            {onOpenWallet && (
              <button
                type="button"
                onClick={onOpenWallet}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-emerald-300 hover:bg-slate-700/80 text-xs font-bold transition cursor-pointer"
                title="Reward Wallet: View earned perks and unlocked treats"
              >
                <Gift className="w-3.5 h-3.5 text-emerald-400" />
                <span>Rewards</span>
              </button>
            )}

            {/* Theme Customizer */}
            {onOpenThemes && (
              <button
                type="button"
                onClick={onOpenThemes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-sky-300 hover:bg-slate-700/80 text-xs font-bold transition cursor-pointer"
                title="Custom Themes: Personalize your color atmosphere"
              >
                <Palette className="w-3.5 h-3.5 text-sky-400" />
                <span>Themes</span>
              </button>
            )}

            {/* Info button explaining all gamification */}
            <button
              type="button"
              onClick={() => setIsPerksModalOpen(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition cursor-pointer"
              title="Learn about Progression & Perks"
              aria-label="Progression Guide"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile & Tablet Gamification Controls (Compact, clean, zero truncation) */}
          <div className="flex lg:hidden items-center justify-between gap-2 pt-1 border-t border-slate-800/60 md:border-t-0 md:pt-0">
            <div className="flex items-center gap-1.5">
              {/* Streak Pill -> Opens Grace Shield Modal */}
              <button
                type="button"
                onClick={() => {
                  haptics.shieldHaptic();
                  setIsShieldModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-bold cursor-pointer hover:bg-orange-500/20 transition"
              >
                <Flame className="w-3.5 h-3.5 fill-orange-400" />
                <span>{streak}d</span>
              </button>

              {/* Shields Pill -> Opens Grace Shield Modal */}
              <button
                type="button"
                onClick={() => {
                  haptics.shieldHaptic();
                  setIsShieldModalOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer hover:bg-emerald-500/20 transition"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>{graceDays}</span>
              </button>

              {/* Spinner Tickets Pill */}
              <button
                type="button"
                onClick={onOpenSpinner}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold cursor-pointer hover:bg-amber-500/20 transition"
              >
                <Ticket className="w-3.5 h-3.5 text-amber-400" />
                <span>{tickets}</span>
              </button>
            </div>

            {/* Guide & Perks Launcher Button */}
            <button
              type="button"
              onClick={() => {
                haptics.lightTap();
                setIsExpModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer touch-manipulation active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>EXP & Perks</span>
            </button>
          </div>
        </div>

        {/* Level Progress Bar (Clickable to inspect EXP) */}
        <button
          type="button"
          onClick={() => {
            haptics.lightTap();
            setIsExpModalOpen(true);
          }}
          className="w-full text-left group cursor-pointer block"
          title="Click to view full EXP breakdown"
        >
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 group-hover:border-slate-700 transition-colors">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 shadow-sm"
            />
          </div>
        </button>
      </div>

      {/* Gamification, Streaks & Perks Modal */}
      <AnimatePresence>
        {isPerksModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-2xl bg-indigo-500/10 text-indigo-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Progression, Streaks & Perks
                    </h3>
                    <p className="text-xs text-slate-400">
                      Understand your gamified behavioral rewards
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPerksModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="Close guide"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Detailed Gamification Cards */}
              <div className="space-y-3 pt-1">
                {/* 1. Ranks & EXP */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Progression & Ranks</div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Earn EXP for every mindful financial action: <strong>+5 EXP</strong> per manual transaction, <strong>+10 EXP</strong> for resisting impulse buys in the Cooling-Off Queue, and <strong>+15 EXP</strong> for funding goals.
                    </p>
                  </div>
                </div>

                {/* 2. Streaks & Shields */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 shrink-0">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Daily Streaks ({streak} days)</div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Building financial mindfulness is a daily habit. Logging transactions or reviewing your spending keeps your streak active without guilt.
                    </p>
                  </div>
                </div>

                {/* 3. Grace Day Shields */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">Grace Day Shields ({graceDays} available)</div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Life gets busy. Grace Day Shields automatically preserve your streak if you miss logging for a calendar day, preventing negative reinforcement.
                    </p>
                  </div>
                </div>

                {/* 4. The Reward Spinner */}
                <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
                      <Ticket className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">The Reward Spinner ({tickets} spins)</div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        Spin the physics-based reward wheel to win real-world treats, bonus EXP, or app cosmetic themes.
                      </p>
                    </div>
                  </div>
                  {onOpenSpinner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPerksModalOpen(false);
                        onOpenSpinner();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition cursor-pointer shrink-0"
                    >
                      Spin
                    </button>
                  )}
                </div>

                {/* 5. Custom Themes & Reward Wallet */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  {onOpenWallet && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPerksModalOpen(false);
                        onOpenWallet();
                      }}
                      className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/80 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Gift className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">Reward Wallet</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  )}

                  {onOpenThemes && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPerksModalOpen(false);
                        onOpenThemes();
                      }}
                      className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 hover:bg-slate-700/80 flex items-center justify-between text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white">Color Themes</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    </button>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsPerksModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phase 2: EXP Journey & Audit History Modal */}
      <ExpJourneyModal
        isOpen={isExpModalOpen}
        onClose={() => setIsExpModalOpen(false)}
        user={user}
        onOpenSpinner={onOpenSpinner}
        onOpenThemes={onOpenThemes}
      />

      {/* Phase 2: Grace Day Shields Modal */}
      <GraceShieldModal
        isOpen={isShieldModalOpen}
        onClose={() => setIsShieldModalOpen(false)}
        user={user}
      />
    </>
  );
};
