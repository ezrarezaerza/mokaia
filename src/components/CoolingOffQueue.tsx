"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  TrendingDown,
  Lock,
  Unlock,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  approveCoolingOffTransaction,
  rejectCoolingOffTransaction,
  devFastForwardCoolingOff,
  calculateCoolingOffSavings,
  type ImpulseVictoryResult,
} from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import type { LocalTransaction, LocalCategory } from '../types';
import { soundFx } from '../lib/soundFx';
import { haptics } from '../lib/haptics';
import { ImpulseVictoryCelebrationModal } from './ImpulseVictoryCelebrationModal';

interface CoolingOffQueueProps {
  userId: string;
  transactions?: LocalTransaction[];
  categories?: LocalCategory[];
  mascotName?: string;
  mascotEmoji?: string;
  mascotPersonality?: string;
  onAddImpulse?: () => void;
  onOpenQuickAdd?: () => void;
  onOpenSpinner?: () => void;
}

export const CoolingOffQueue: React.FC<CoolingOffQueueProps> = ({
  userId,
  transactions = [],
  categories = [],
  mascotName = 'Mochi',
  mascotEmoji = '🐱',
  mascotPersonality = 'zen',
  onAddImpulse,
  onOpenQuickAdd,
  onOpenSpinner,
}) => {
  const safeTransactions = Array.isArray(transactions) ? transactions : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const handleOpenImpulse = onOpenQuickAdd || onAddImpulse;

  // Real-time ticking UTC clock for live countdowns
  const [nowUtc, setNowUtc] = useState<number>(Date.now());
  const [victoryModalData, setVictoryModalData] = useState<ImpulseVictoryResult | null>(null);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState<boolean>(false);
  const [savingsStats, setSavingsStats] = useState<{
    savedAmount: number;
    rejectedCount: number;
    lockedCount: number;
    lockedAmount: number;
  }>({
    savedAmount: 0,
    rejectedCount: 0,
    lockedCount: 0,
    lockedAmount: 0,
  });

  // Tick clock every second for smooth, accurate countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowUtc(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute savings stats whenever transactions change
  useEffect(() => {
    calculateCoolingOffSavings(userId).then(setSavingsStats);
  }, [userId, safeTransactions]);

  // Filter transactions locked in Cooling-Off Queue or recently resolved
  const lockedItems = safeTransactions.filter((t) => !t.isDeleted && t.queueStatus === 'LOCKED');
  const rejectedItems = safeTransactions.filter((t) => !t.isDeleted && t.queueStatus === 'REJECTED');
  const approvedItems = safeTransactions.filter((t) => !t.isDeleted && t.queueStatus === 'APPROVED');

  const categoryMap = new Map<string, LocalCategory>();
  for (const c of safeCategories) {
    categoryMap.set(c.id, c);
  }

  // Handle impulse rejected (Saved Money celebration!)
  const handleReject = async (tx: LocalTransaction) => {
    try {
      const victory = await rejectCoolingOffTransaction(tx.id);
      setVictoryModalData(victory);
      setIsVictoryModalOpen(true);

      const updatedStats = await calculateCoolingOffSavings(userId);
      setSavingsStats(updatedStats);
      syncEngine.sync().catch(() => {});
    } catch (err) {
      console.error('Failed to reject cooling off transaction:', err);
    }
  };

  // Handle impulse approved after cooling-off period expired
  const handleApprove = async (tx: LocalTransaction) => {
    soundFx.playCoinSound();
    haptics.lightTap();
    const result = await approveCoolingOffTransaction(tx.id);
    if (!result.success) {
      alert(result.error);
      return;
    }
    const updatedStats = await calculateCoolingOffSavings(userId);
    setSavingsStats(updatedStats);
    syncEngine.sync().catch(() => {});
  };

  // Fast forward for testing / dev review
  const handleFastForward = async (txId: string) => {
    await devFastForwardCoolingOff(txId);
    setNowUtc(Date.now());
  };

  // Format countdown string
  const formatCountdown = (lockedUntilIso?: string | null) => {
    if (!lockedUntilIso) return { text: '00h 00m 00s', isExpired: true };
    const lockTime = new Date(lockedUntilIso).getTime();
    const diff = lockTime - nowUtc;

    if (diff <= 0) {
      return { text: 'Lock Expired • Ready for Decision', isExpired: true };
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return {
      text: `${hours.toString().padStart(2, '0')}h ${minutes
        .toString()
        .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s remaining`,
      isExpired: false,
    };
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner & Psychological Scoreboard */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                The Cooling-Off Queue
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Impulse Guardrail</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Impulse Holding Pen
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              High-friction buffer designed to break emotional buying loops. Items stay locked for 24-48h before spending is committed.
            </p>
          </div>

          {/* Quick Impulse Logger CTA */}
          {handleOpenImpulse && (
            <button
              type="button"
              onClick={handleOpenImpulse}
              className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-950/40 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Queue an Impulse</span>
            </button>
          )}
        </div>

        {/* Gamified Savings Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono uppercase text-emerald-400 font-bold mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>Saved from Impulses</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              ${savingsStats.savedAmount.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {savingsStats.rejectedCount} avoided temptations
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono uppercase text-amber-400 font-bold mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Currently Cooling Off</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              ${savingsStats.lockedAmount.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {lockedItems.length} active hold{lockedItems.length === 1 ? '' : 's'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono uppercase text-blue-400 font-bold mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Approved After Delay</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {approvedItems.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Purchased with clarity
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <div className="text-[10px] font-mono uppercase text-purple-400 font-bold mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              <span>Impulse Resistance</span>
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {savingsStats.rejectedCount + approvedItems.length > 0
                ? `${Math.round(
                    (savingsStats.rejectedCount /
                      (savingsStats.rejectedCount + approvedItems.length)) *
                      100
                  )}%`
                : '100%'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Discipline win rate
            </div>
          </div>
        </div>
      </div>

      {/* Locked Transactions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Active Cooling-Off Holds ({lockedItems.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            Mindful pause in effect
          </span>
        </div>

        {lockedItems.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h4 className="text-base font-bold text-white">No Impulses Currently Cooling Off</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Whenever you feel the urge to purchase a non-essential want, send it here. Waiting 24 hours eliminates 78% of impulse buyer remorse!
            </p>
            {onAddImpulse && (
              <button
                type="button"
                onClick={onAddImpulse}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <span>Add an Impulse to Hold</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {lockedItems.map((tx) => {
                const countdown = formatCountdown(tx.lockedUntil);
                const cat = categoryMap.get(tx.categoryId);

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className={`p-5 rounded-3xl border transition-all ${
                      countdown.isExpired
                        ? 'bg-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900/90 border-amber-500/40 shadow-md'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl p-2.5 rounded-2xl bg-slate-800 border border-slate-700/80 shrink-0">
                          {cat?.icon || '✨'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-white">{tx.description}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {cat?.name || 'Lifestyle'}
                            </span>
                          </div>
                          {tx.notes && (
                            <p className="text-xs text-slate-400 mt-0.5 italic">
                              &ldquo;{tx.notes}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                        <div className="text-2xl font-extrabold text-white font-mono tracking-tight">
                          ${tx.amount.toFixed(2)}
                        </div>
                        {tx.costPerUse && (
                          <div className="text-[11px] font-mono text-cyan-400">
                            ~${tx.costPerUse.toFixed(2)} / use ({tx.estimatedUses}x)
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timer and Anti-Cheating Bar */}
                    <div className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        {countdown.isExpired ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Unlock className="w-4 h-4" />
                            <span>{countdown.text}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span>{countdown.text}</span>
                          </div>
                        )}
                      </div>

                      {/* Skip Wait Simulator */}
                      {!countdown.isExpired && (
                        <button
                          type="button"
                          onClick={() => handleFastForward(tx.id)}
                          className="text-[10px] font-mono px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-300 border border-slate-700 transition cursor-pointer flex items-center gap-1"
                          title="Preview what happens when the 24h timer elapses"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Skip Wait (Demo)</span>
                        </button>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3">
                      {/* Safe Impulse Rejection: Can be done at any time! */}
                      <button
                        type="button"
                        onClick={() => handleReject(tx)}
                        className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
                      >
                        <XCircle className="w-4 h-4 text-emerald-400" />
                        <span>I Don&apos;t Need It (Save ${tx.amount.toFixed(2)}!)</span>
                      </button>

                      {/* Approval: Enabled once timer is expired */}
                      {countdown.isExpired ? (
                        <button
                          type="button"
                          onClick={() => handleApprove(tx)}
                          className="flex-1 min-w-[160px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-950 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Finalize Spend</span>
                        </button>
                      ) : (
                        <div className="flex-1 min-w-[160px] py-2 px-3 rounded-xl bg-slate-800/60 border border-slate-800 text-slate-500 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-not-allowed">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Approval Locked During Cooling Period</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* History of Resisted Impulses (Psychological Reinforcement) */}
      {rejectedItems.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Resisted Impulses Wall of Fame ({rejectedItems.length})</span>
            </h4>
            <span className="text-xs font-mono font-bold text-emerald-300">
              +${savingsStats.savedAmount.toFixed(2)} Kept in Pocket
            </span>
          </div>

          <div className="space-y-2">
            {rejectedItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-800/80 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-white">{item.description}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    (Avoided impulse)
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-emerald-400">
                    +${item.amount.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impulse Defeated Celebration Modal */}
      <ImpulseVictoryCelebrationModal
        isOpen={isVictoryModalOpen}
        onClose={() => setIsVictoryModalOpen(false)}
        victoryData={victoryModalData}
        mascotName={mascotName}
        mascotEmoji={mascotEmoji}
        mascotPersonality={mascotPersonality}
        onOpenSpinner={onOpenSpinner}
      />
    </div>
  );
};
