"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import confetti from 'canvas-confetti';
import {
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  Shield,
  Ticket,
  X,
  Plus,
  Coffee,
  Check,
} from 'lucide-react';
import type { LocalUser, LocalReward } from '../types';
import { db, claimRewardInInventory, addRewardToInventory } from '../lib/db';

interface RewardWalletModalProps {
  user: LocalUser | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenSpinner?: () => void;
}

export const RewardWalletModal: React.FC<RewardWalletModalProps> = ({
  user,
  isOpen,
  onClose,
  onOpenSpinner,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'UNCLAIMED' | 'REDEEMED'>('ALL');
  const [showAddCustomModal, setShowAddCustomModal] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customDesc, setCustomDesc] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(typeof window !== 'undefined' && window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Live query for rewards from Dexie with defensive fallback
  const liveRewards = useLiveQuery(
    async () => {
      if (!user) return [];
      return await db.rewards
        .where('userId')
        .equals(user.id)
        .reverse()
        .sortBy('createdAt');
    },
    [user?.id],
    []
  );

  const rewards = Array.isArray(liveRewards) ? liveRewards : [];

  const filteredRewards = rewards.filter((r) => {
    if (activeFilter === 'UNCLAIMED') return r.status === 'UNCLAIMED';
    if (activeFilter === 'REDEEMED') return r.status === 'REDEEMED';
    return true;
  });

  const unclaimedCount = rewards.filter((r) => r.status === 'UNCLAIMED').length;
  const redeemedCount = rewards.filter((r) => r.status === 'REDEEMED').length;

  const handleClaim = async (reward: LocalReward) => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#34d399', '#38bdf8', '#fbbf24'],
      });
    } catch {
      // Non-blocking
    }

    await claimRewardInInventory(reward.id);
  };

  const handleAddCustomReward = async () => {
    if (!user || !customTitle.trim()) return;

    await addRewardToInventory(user.id, {
      rewardType: 'REAL_WORLD_TREAT',
      title: customTitle.trim(),
      description: customDesc.trim() || 'Custom treat added to personal mindful reward pool.',
      icon: '🎁',
      rewardValue: customTitle.trim(),
    });

    setCustomTitle('');
    setCustomDesc('');
    setShowAddCustomModal(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop with smooth fade exit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={isMobile ? { y: '100%', opacity: 0.5 } : { scale: 0.95, y: 16, opacity: 0 }}
            animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, y: 0, opacity: 1 }}
            exit={isMobile ? { y: '100%', opacity: 0 } : { scale: 0.95, y: 16, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden z-10 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            {/* Top grab handle for mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Pinned Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl shrink-0">
                  🎁
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>The Reward Wallet</span>
                    <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {unclaimedCount} Unclaimed
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-400">
                    Mindful treats and digital rewards won from positive saving habits
                  </p>
                </div>
              </div>

              <button
                id="close-wallet-modal-btn"
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                aria-label="Close wallet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 text-center shrink-0">
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center justify-center gap-1">
                  <Ticket className="w-3.5 h-3.5 text-amber-400" />
                  Tickets
                </div>
                <div className="text-sm sm:text-base font-bold text-amber-400 mt-0.5">
                  {user?.spinnerTickets ?? 0}
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center justify-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Shields
                </div>
                <div className="text-sm sm:text-base font-bold text-emerald-400 mt-0.5">
                  {user?.graceDays ?? 2}
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80">
                <div className="text-[11px] sm:text-xs text-slate-400 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                  Redeemed
                </div>
                <div className="text-sm sm:text-base font-bold text-sky-400 mt-0.5">
                  {redeemedCount}
                </div>
              </div>
            </div>

            {/* Filter tabs & Action toolbar */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-800 bg-slate-900 shrink-0">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({rewards.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('UNCLAIMED')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                    activeFilter === 'UNCLAIMED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ready ({unclaimedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('REDEEMED')}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition cursor-pointer ${
                    activeFilter === 'REDEEMED'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Claimed ({redeemedCount})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowAddCustomModal(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 text-[11px] sm:text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Treat</span>
              </button>
            </div>

            {/* Scrollable Reward List */}
            <div className="p-3 sm:p-4 space-y-2.5 flex-1 overflow-y-auto pr-2 scrollbar-thin">
              {filteredRewards.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2 text-2xl">
                    🎁
                  </div>
                  <h4 className="text-sm font-semibold text-slate-300">
                    No {activeFilter === 'UNCLAIMED' ? 'unclaimed' : activeFilter === 'REDEEMED' ? 'claimed' : ''} rewards found
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Spin The Reward Spinner or log positive streaks to earn real-world treats and digital power-ups!
                  </p>
                  {onOpenSpinner && (
                    <button
                      type="button"
                      onClick={onOpenSpinner}
                      className="mt-4 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Spin The Reward Spinner
                    </button>
                  )}
                </div>
              ) : (
                filteredRewards.map((reward) => {
                  const isUnclaimed = reward.status === 'UNCLAIMED';

                  return (
                    <div
                      key={reward.id}
                      className={`p-3 sm:p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isUnclaimed
                          ? 'bg-slate-950/80 border-slate-700/80 hover:border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950/30 border-slate-900 opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                            isUnclaimed
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-slate-800 border border-slate-700 text-slate-500'
                          }`}
                        >
                          {reward.icon || '🎁'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4
                              className={`text-xs sm:text-sm font-bold truncate ${
                                isUnclaimed ? 'text-slate-100' : 'text-slate-400 line-through'
                              }`}
                            >
                              {reward.title}
                            </h4>

                            <span
                              className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-mono uppercase font-semibold ${
                                reward.rewardType === 'REAL_WORLD_TREAT'
                                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  : reward.rewardType === 'STREAK_SHIELD'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                              }`}
                            >
                              {reward.rewardType.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {reward.description}
                          </p>

                          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                            <span>Won {new Date(reward.createdAt).toLocaleDateString()}</span>
                            {reward.claimedAt && (
                              <span>• Redeemed {new Date(reward.claimedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isUnclaimed ? (
                          <button
                            type="button"
                            onClick={() => handleClaim(reward)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Redeem</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 px-2 py-1 bg-slate-900 rounded-lg border border-slate-800">
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            Redeemed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pinned Footer with Spinner Link */}
            {onOpenSpinner && (
              <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-slate-400">
                  Have tickets ready?
                </div>
                <button
                  type="button"
                  onClick={onOpenSpinner}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Open The Reward Spinner</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Add Custom Treat Modal */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full text-left shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Gift className="w-4 h-4 text-emerald-400" />
                Add Mindful Treat
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Create a personalized reward voucher to redeem when you hit positive financial milestones.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Treat Name
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Afternoon at Botanical Garden"
                  maxLength={40}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Notes / Conditions (Optional)
                </label>
                <input
                  type="text"
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder="e.g. Take a book and relax without guilt"
                  maxLength={60}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="w-1/2 py-2.5 bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomReward}
                disabled={!customTitle.trim()}
                className="w-1/2 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Save to Wallet
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
